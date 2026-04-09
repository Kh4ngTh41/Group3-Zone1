// ============================================================
// chat.js – Chatbot conversation engine
// ============================================================

window.ChatEngine = (function() {
  const STATE = {
    IDLE: 'idle',
    AWAITING_SYMPTOM: 'awaiting_symptom',
    SHOWING_SPECIALTY: 'showing_specialty',
    SHOWING_DOCTORS: 'showing_doctors',
    SHOWING_SLOTS: 'showing_slots',
    AWAITING_FEATURED_SPECIALTY: 'awaiting_featured_specialty',
    AWAITING_PATIENT_INFO: 'awaiting_patient_info',
    CONFIRMED: 'confirmed',
    EMERGENCY: 'emergency',
  };

  const API_BASE = window.VINCARE_API_BASE || 'http://localhost:8000';
  const VINMEC_BASE_URL = 'https://www.vinmec.com';
  const GENERAL_HOTLINE = '115';
  const VINMEC_HOTLINE_DISPLAY = '1900 2345';
  const VINMEC_HOTLINE_DIAL = '19002345';

  let state = STATE.IDLE;
  let conversationId = null;
  let suggestedSpecialty = '';
  let currentSpecialty = '';
  let currentDoctor = null;
  let currentDoctors = [];
  let pendingFeaturedDoctor = null;
  let pendingSlot = null;
  let isSubmittingBooking = false;
  let onMessageCb = null;
  let onTypingCb = null;

  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function normalizeProfileUrl(endpoint) {
    const path = (endpoint || '').trim();
    if (!path) {
      return VINMEC_BASE_URL;
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${VINMEC_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  function normalizeLookup(value) {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function groupSlotsByDoctor(slots) {
    const grouped = new Map();
    slots.forEach((slot) => {
      const key = `${slot.doctor_name}||${slot.doctor_profile_endpoint || ''}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          doctor_key: key,
          doctor_name: slot.doctor_name,
          doctor_profile_endpoint: slot.doctor_profile_endpoint || '',
          slots: [],
        });
      }
      grouped.get(key).slots.push(slot);
    });
    return Array.from(grouped.values());
  }

  function findDoctorByName(doctors, targetName) {
    const normalizedTarget = normalizeLookup(targetName);
    if (!normalizedTarget) return null;

    return doctors.find((doctor) => {
      const normalizedDoctor = normalizeLookup(doctor.doctor_name);
      return normalizedDoctor === normalizedTarget
        || normalizedDoctor.includes(normalizedTarget)
        || normalizedTarget.includes(normalizedDoctor);
    }) || null;
  }

  function buildEmergencyHotlineActions() {
    const lang = window.currentLang;
    const generalLabel = lang === 'vi' ? `Gọi khẩn cấp ${GENERAL_HOTLINE}` : `Call emergency ${GENERAL_HOTLINE}`;
    const vinmecLabel = lang === 'vi' ? `Gọi Vinmec ${VINMEC_HOTLINE_DISPLAY}` : `Call Vinmec ${VINMEC_HOTLINE_DISPLAY}`;

    return `
      <div class="chat-hotline-actions">
        <a class="chat-hotline-btn" href="tel:${GENERAL_HOTLINE}" aria-label="${generalLabel}">${generalLabel}</a>
        <a class="chat-hotline-btn chat-hotline-btn--vinmec" href="tel:${VINMEC_HOTLINE_DIAL}" aria-label="${vinmecLabel}">${vinmecLabel}</a>
      </div>`;
  }

  async function request(path, options) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.detail || 'Có lỗi xảy ra, vui lòng thử lại.';
      throw new Error(detail);
    }
    return data;
  }

  function setCallbacks({ onMessage, onTyping }) {
    onMessageCb = onMessage;
    onTypingCb = onTyping;
  }

  function botReply(html, isHtml = false, delay = 800) {
    return new Promise(resolve => {
      if (onTypingCb) onTypingCb(true);
      setTimeout(() => {
        if (onTypingCb) onTypingCb(false);
        if (onMessageCb) onMessageCb({ role: 'bot', html: isHtml ? html : renderMarkdown(html) });
        resolve();
      }, delay);
    });
  }

  function buildSpecialtyOptions(suggested, candidates) {
    const uniqueCandidates = [...new Set([suggested, ...(candidates || [])].filter(Boolean))];
    if (!uniqueCandidates.length) {
      return '';
    }

    const lang = window.currentLang;
    const title = lang === 'vi'
      ? `Khoa đề xuất: <strong>${escapeHtml(suggested)}</strong>`
      : `Recommended specialty: <strong>${escapeHtml(suggested)}</strong>`;
    const subtitle = lang === 'vi'
      ? 'Bạn vui lòng chọn một chuyên khoa để tiếp tục:'
      : 'Please choose a specialty to continue:';

    const buttons = uniqueCandidates
      .map((specialty) => (
        `<button class="chat-specialty-btn" data-specialty-name="${escapeHtml(specialty)}">${escapeHtml(specialty)}</button>`
      ))
      .join('');

    return `
      <div class="chat-specialty-card">
        <div class="chat-specialty-name">${title}</div>
        <div class="chat-specialty-desc">${subtitle}</div>
        <div class="chat-slots-wrap">${buttons}</div>
      </div>`;
  }

  function buildDoctorCards(doctors) {
    if (!doctors.length) {
      return '';
    }

    const lang = window.currentLang;
    const profileLabel = lang === 'vi' ? 'Hồ sơ bác sĩ' : 'Doctor profile';
    const selectLabel = lang === 'vi' ? 'Chọn bác sĩ này' : 'Choose this doctor';

    return doctors
      .map((doctor) => {
        const profileUrl = normalizeProfileUrl(doctor.doctor_profile_endpoint);
        const safeName = escapeHtml(doctor.doctor_name);
        const slotsLabel = lang === 'vi'
          ? `${doctor.slots.length} khung giờ trống`
          : `${doctor.slots.length} available slots`;
        return `
          <div class="chat-doctor-card" data-doctor-key="${escapeHtml(doctor.doctor_key)}" role="button" tabindex="0">
            <div class="chat-doc-avatar">👨‍⚕️</div>
            <div class="chat-doc-info">
              <div class="chat-doc-name">${safeName}</div>
              <div class="chat-doc-spec">🏥 ${escapeHtml(currentSpecialty)} · ${slotsLabel}</div>
              <div class="chat-doc-title">
                <a href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer">${profileLabel}</a>
              </div>
            </div>
            <button class="chat-specialty-btn">${selectLabel}</button>
          </div>`;
      })
      .join('');
  }

  function buildSlotsHtml(slots) {
    const items = slots.map(slot => {
      const label = escapeHtml(slot.slot_time);
      return `<button class="chat-slot" data-slot-id="${label}" data-slot-label="${label}">${label}</button>`;
    }).join('');
    return `<div class="chat-slots-wrap">${items}</div>`;
  }

  function buildConfirmCard(doctorName, specialty, slot) {
    const lang = window.currentLang;
    const title = lang === 'vi' ? 'Đặt lịch thành công!' : 'Booking Confirmed!';
    const actionLabel = lang === 'vi' ? 'Đặt lịch khác' : 'Book another appointment';
    const details = lang === 'vi'
      ? `Bác sĩ: <strong>${doctorName}</strong><br>Chuyên khoa: ${specialty}<br>Thời gian: <strong>${slot}</strong><br>Địa điểm: Vinmec Times City`
      : `Doctor: <strong>${doctorName}</strong><br>Specialty: ${specialty}<br>Time: <strong>${slot}</strong><br>Location: Vinmec Times City`;
    return `
      <div class="chat-confirm-card">
        <div class="chat-confirm-icon">🎉</div>
        <div class="chat-confirm-title">${title}</div>
        <div class="chat-confirm-detail">${details}</div>
        <div style="margin-top:10px;">
          <button class="chat-specialty-btn" data-action="book-again">${actionLabel}</button>
        </div>
      </div>`;
  }

  function buildPatientInfoForm(doctorName, specialty, slotTime) {
    const lang = window.currentLang;
    const title = lang === 'vi' ? 'Xác nhận thông tin đặt lịch' : 'Confirm booking details';
    const nameLabel = lang === 'vi' ? 'Họ và tên' : 'Full name';
    const phoneLabel = lang === 'vi' ? 'Số điện thoại' : 'Phone number';
    const submitLabel = lang === 'vi' ? 'Xác nhận đặt lịch' : 'Confirm booking';
    const detail = lang === 'vi'
      ? `Bác sĩ: <strong>${doctorName}</strong><br>Chuyên khoa: ${specialty}<br>Giờ khám: <strong>${slotTime}</strong>`
      : `Doctor: <strong>${doctorName}</strong><br>Specialty: ${specialty}<br>Slot: <strong>${slotTime}</strong>`;

    return `
      <div class="chat-booking-form" data-booking-form="true">
        <div class="chat-booking-form-title">${title}</div>
        <div class="chat-booking-form-detail">${detail}</div>
        <label class="chat-booking-label">${nameLabel}</label>
        <input class="chat-booking-input" type="text" data-patient-name placeholder="${nameLabel}" maxlength="80" />
        <label class="chat-booking-label">${phoneLabel}</label>
        <input class="chat-booking-input" type="tel" data-patient-phone placeholder="${phoneLabel}" maxlength="20" />
        <button class="chat-specialty-btn" data-booking-submit="true">${submitLabel}</button>
      </div>`;
  }

  function buildFeaturedDoctorSpecialtyOptions(doctorName, specialties) {
    const lang = window.currentLang;
    const title = lang === 'vi'
      ? `Bác sĩ <strong>${doctorName}</strong> đang nhận khám nhiều chuyên khoa.`
      : `Dr. <strong>${doctorName}</strong> is available for multiple specialties.`;
    const subtitle = lang === 'vi'
      ? 'Bạn chọn chuyên khoa muốn khám để tiếp tục:'
      : 'Please choose a specialty to continue:';
    const buttons = specialties
      .map((specialty) => `<button class="chat-specialty-btn" data-featured-specialty-name="${escapeHtml(specialty)}">${escapeHtml(specialty)}</button>`)
      .join('');

    return `
      <div class="chat-specialty-card">
        <div class="chat-specialty-name">${title}</div>
        <div class="chat-specialty-desc">${subtitle}</div>
        <div class="chat-slots-wrap">${buttons}</div>
      </div>`;
  }

  function validatePatientInfo(patientName, patientPhone) {
    const name = (patientName || '').trim();
    const phone = (patientPhone || '').trim();
    const phoneDigits = phone.replace(/\D/g, '');

    if (!name) {
      return window.currentLang === 'vi'
        ? 'Vui lòng nhập họ và tên để hoàn tất đặt lịch.'
        : 'Please enter your full name to continue.';
    }

    if (phoneDigits.length < 9) {
      return window.currentLang === 'vi'
        ? 'Vui lòng nhập số điện thoại hợp lệ.'
        : 'Please enter a valid phone number.';
    }

    return '';
  }

  async function handleMessage(text) {
    if (!text.trim()) return;

    if (state === STATE.CONFIRMED || state === STATE.EMERGENCY) {
      reset();
    }

    switch (state) {
      case STATE.AWAITING_FEATURED_SPECIALTY: {
        await botReply(
          window.currentLang === 'vi'
            ? 'Bạn vui lòng chọn chuyên khoa trong các nút phía trên để tiếp tục đặt lịch với bác sĩ này.'
            : 'Please choose one specialty from the options above to continue booking with this doctor.',
          false,
          350,
        );
        return;
      }
      case STATE.AWAITING_PATIENT_INFO: {
        await botReply(
          window.currentLang === 'vi'
            ? 'Bạn vui lòng nhập họ tên và số điện thoại trong biểu mẫu phía trên để xác nhận lịch khám.'
            : 'Please fill your full name and phone number in the form above to confirm the booking.',
          false,
          350,
        );
        return;
      }
      case STATE.IDLE:
      case STATE.AWAITING_SYMPTOM:
      default: {
        try {
          const result = await request('/api/chat/triage', {
            method: 'POST',
            body: JSON.stringify({
              symptom_text: text,
              patient_name: '',
              patient_phone: '',
            }),
          });

          conversationId = result.conversation_id;

          if (result.status === 'emergency') {
            state = STATE.EMERGENCY;
            const emergencyHtml = `${renderMarkdown(result.message)}<br><br>${buildEmergencyHotlineActions()}`;
            await botReply(emergencyHtml, true, 650);
            return;
          }

          if (result.status === 'escalated') {
            state = STATE.AWAITING_SYMPTOM;
            await botReply(renderMarkdown(result.message), true, 650);
            return;
          }

          suggestedSpecialty = result.suggested_specialty || '';
          currentSpecialty = '';
          currentDoctor = null;
          currentDoctors = [];
          state = STATE.SHOWING_SPECIALTY;

          const specialtyHtml = buildSpecialtyOptions(suggestedSpecialty, result.candidates || []);
          await botReply(`${renderMarkdown(result.message)}<br><br>${specialtyHtml}`, true, 700);
        } catch (error) {
          state = STATE.AWAITING_SYMPTOM;
          await botReply(error.message || 'Không thể kết nối hệ thống, vui lòng thử lại.', false, 600);
        }
        break;
      }
    }
  }

  async function handleSpecialtySelect(specialtyName) {
    if (!specialtyName) return;
    currentSpecialty = specialtyName;

    if (conversationId && suggestedSpecialty && suggestedSpecialty !== specialtyName) {
      request('/api/feedback/correction', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: conversationId,
          predicted_specialty: suggestedSpecialty,
          corrected_specialty: specialtyName,
          reason: 'User chọn lại trên UI prototype',
        }),
      }).catch(() => null);
    }

    try {
      const data = await request(`/api/slots?specialty=${encodeURIComponent(specialtyName)}`, {
        method: 'GET',
      });

      const slots = Array.isArray(data?.slots) ? data.slots : [];
      if (!slots.length) {
        state = STATE.AWAITING_SYMPTOM;
        const noSlotText = window.currentLang === 'vi'
          ? 'Hiện chưa có lịch trống cho chuyên khoa này. Bạn vui lòng thử chuyên khoa khác hoặc liên hệ tổng đài 1900 2345.'
          : 'No available slots for this specialty at the moment. Please try another specialty or call 1900 2345.';
        await botReply(noSlotText, false, 600);
        return;
      }

      currentDoctors = groupSlotsByDoctor(slots);
      currentDoctor = null;
      pendingSlot = null;
      state = STATE.SHOWING_DOCTORS;

      const intro = window.currentLang === 'vi'
        ? `Chuyên khoa <strong>${escapeHtml(specialtyName)}</strong> đang có các bác sĩ trống lịch:`
        : `Available doctors for <strong>${escapeHtml(specialtyName)}</strong>:`;
      await botReply(`${intro}<br>${buildDoctorCards(currentDoctors)}`, true, 550);
    } catch (error) {
      state = STATE.AWAITING_SYMPTOM;
      await botReply(error.message || 'Không thể tải danh sách bác sĩ.', false, 550);
    }
  }

  async function handleDoctorSelect(doctorKey) {
    const doctor = currentDoctors.find((item) => item.doctor_key === doctorKey);
    if (!doctor) return;

    currentDoctor = doctor;
    state = STATE.SHOWING_SLOTS;
    pendingSlot = null;

    const slotsHtml = buildSlotsHtml(doctor.slots);
    const intro = window.currentLang === 'vi'
      ? `Bạn chọn khung giờ với bác sĩ <strong>${escapeHtml(doctor.doctor_name)}</strong>:`
      : `Choose a slot with <strong>${escapeHtml(doctor.doctor_name)}</strong>:`;
    await botReply(intro + '<br>' + slotsHtml, true, 500);
  }

  async function handleSlotSelect(slotId, slotLabel) {
    if (!currentDoctor) return;

    const selectedSlot = currentDoctor.slots.find((slot) => slot.slot_time === slotId);
    if (!selectedSlot) {
      await botReply(window.currentLang === 'vi' ? 'Khung giờ không hợp lệ, vui lòng chọn lại.' : 'Invalid slot, please choose again.', false, 450);
      return;
    }

    if (!conversationId) {
      await botReply(window.currentLang === 'vi' ? 'Phiên chat đã hết hạn, vui lòng mô tả lại triệu chứng để bắt đầu lại.' : 'Session expired, please describe your symptoms again.', false, 500);
      reset();
      return;
    }

    pendingSlot = selectedSlot;
    state = STATE.AWAITING_PATIENT_INFO;

    const formHtml = buildPatientInfoForm(
      escapeHtml(currentDoctor.doctor_name),
      escapeHtml(currentSpecialty),
      escapeHtml(selectedSlot.slot_time),
    );
    await botReply(formHtml, true, 450);
  }

  async function handlePatientInfoSubmit(patientName, patientPhone) {
    if (!conversationId || !currentDoctor || !pendingSlot) {
      await botReply(window.currentLang === 'vi' ? 'Phiên đặt lịch đã hết hạn, vui lòng bắt đầu lại.' : 'Booking session expired, please start again.', false, 450);
      reset();
      return;
    }

    const validationError = validatePatientInfo(patientName, patientPhone);
    if (validationError) {
      await botReply(validationError, false, 350);
      return;
    }

    if (isSubmittingBooking) return;
    isSubmittingBooking = true;

    try {
      const booking = await request('/api/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: conversationId,
          patient_name: patientName.trim(),
          patient_phone: patientPhone.trim(),
          specialty: currentSpecialty,
          doctor_name: currentDoctor.doctor_name,
          slot_time: pendingSlot.slot_time,
          ai_suggested: currentSpecialty === suggestedSpecialty,
        }),
      });

      state = STATE.CONFIRMED;

      const confirmCard = buildConfirmCard(
        escapeHtml(currentDoctor.doctor_name),
        escapeHtml(currentSpecialty),
        escapeHtml(pendingSlot.slot_time),
      );
      const bookingText = window.currentLang === 'vi'
        ? `<div style="margin-top:8px;">Mã lịch hẹn: <strong>${escapeHtml(booking.booking_code)}</strong></div>`
        : `<div style="margin-top:8px;">Booking code: <strong>${escapeHtml(booking.booking_code)}</strong></div>`;
      await botReply(confirmCard + bookingText, true, 600);
    } catch (error) {
      state = STATE.AWAITING_PATIENT_INFO;
      await botReply(error.message || 'Không thể xác nhận đặt lịch. Vui lòng thử lại.', false, 500);
    } finally {
      isSubmittingBooking = false;
    }
  }

  async function runFeaturedDoctorBooking(doctorName, specialtyName, profileEndpoint = '') {
    try {
      const triageResult = await request('/api/chat/triage', {
        method: 'POST',
        body: JSON.stringify({
          symptom_text: `Đặt lịch khám ${specialtyName}`,
          patient_name: '',
          patient_phone: '',
          force_specialty: specialtyName,
        }),
      });

      conversationId = triageResult.conversation_id;
      suggestedSpecialty = specialtyName;
      currentSpecialty = specialtyName;

      const data = await request(`/api/slots?specialty=${encodeURIComponent(specialtyName)}`, {
        method: 'GET',
      });
      const slots = Array.isArray(data?.slots) ? data.slots : [];
      if (!slots.length) {
        state = STATE.AWAITING_SYMPTOM;
        await botReply(window.currentLang === 'vi'
          ? 'Hiện chưa có lịch trống cho chuyên khoa này. Bạn vui lòng thử lại sau.'
          : 'No available slots for this specialty at the moment. Please try again later.', false, 450);
        return;
      }

      currentDoctors = groupSlotsByDoctor(slots);
      const matchedDoctor = findDoctorByName(currentDoctors, doctorName);
      if (!matchedDoctor) {
        state = STATE.SHOWING_DOCTORS;
        const intro = window.currentLang === 'vi'
          ? `Mình chưa tìm thấy chính xác bác sĩ <strong>${escapeHtml(doctorName)}</strong>, bạn chọn trong danh sách nhé:`
          : `I could not find exact match for <strong>${escapeHtml(doctorName)}</strong>. Please choose from available doctors:`;
        await botReply(`${intro}<br>${buildDoctorCards(currentDoctors)}`, true, 500);
        return;
      }

      currentDoctor = matchedDoctor;
      pendingSlot = null;
      state = STATE.SHOWING_SLOTS;

      const profileUrl = normalizeProfileUrl(matchedDoctor.doctor_profile_endpoint || profileEndpoint || '');
      const intro = window.currentLang === 'vi'
        ? `Đã chọn bác sĩ <strong>${escapeHtml(matchedDoctor.doctor_name)}</strong> (<a href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer">hồ sơ</a>). Bạn chọn giờ khám:`
        : `Selected <strong>${escapeHtml(matchedDoctor.doctor_name)}</strong> (<a href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer">profile</a>). Please choose a slot:`;
      await botReply(`${intro}<br>${buildSlotsHtml(matchedDoctor.slots)}`, true, 500);
    } catch (error) {
      state = STATE.AWAITING_SYMPTOM;
      await botReply(error.message || 'Không thể đặt lịch nhanh cho bác sĩ này lúc này.', false, 500);
    }
  }

  async function handleFeaturedDoctorBooking(doctor) {
    const doctorName = (doctor?.name || '').trim();
    const primarySpecialty = (doctor?.specialtyName || '').trim();
    const specialties = [...new Set((doctor?.specialties || []).map((item) => (item || '').trim()).filter(Boolean))];

    if (!doctorName || (!primarySpecialty && !specialties.length)) {
      await botReply(window.currentLang === 'vi' ? 'Không đủ thông tin bác sĩ để đặt lịch nhanh.' : 'Insufficient doctor data for quick booking.', false, 450);
      return;
    }

    if (specialties.length > 1) {
      pendingFeaturedDoctor = {
        name: doctorName,
        specialties,
        doctorProfileEndpoint: doctor.doctorProfileEndpoint || '',
      };
      state = STATE.AWAITING_FEATURED_SPECIALTY;
      await botReply(buildFeaturedDoctorSpecialtyOptions(escapeHtml(doctorName), specialties), true, 350);
      return;
    }

    const specialtyName = primarySpecialty || specialties[0];
    await runFeaturedDoctorBooking(doctorName, specialtyName, doctor.doctorProfileEndpoint || '');
  }

  async function handleFeaturedDoctorSpecialtySelect(specialtyName) {
    if (!pendingFeaturedDoctor || !specialtyName) return;
    const doctor = pendingFeaturedDoctor;
    pendingFeaturedDoctor = null;
    await runFeaturedDoctorBooking(doctor.name, specialtyName, doctor.doctorProfileEndpoint || '');
  }

  async function handleAction(action) {
    if (action !== 'book-again') return;
    reset();
    const prompt = window.currentLang === 'vi'
      ? 'Bạn hãy mô tả triệu chứng mới để mình hỗ trợ đặt lịch tiếp nhé.'
      : 'Please share your symptoms for the next appointment.';
    await botReply(prompt, false, 450);
  }

  function start() {
    state = STATE.AWAITING_SYMPTOM;
    setTimeout(() => {
      const welcome = window.t('chatWelcome');
      if (onMessageCb) onMessageCb({ role: 'bot', html: renderMarkdown(welcome) });
    }, 500);
  }

  function reset() {
    state = STATE.AWAITING_SYMPTOM;
    currentSpecialty = '';
    suggestedSpecialty = '';
    currentDoctor = null;
    currentDoctors = [];
    pendingFeaturedDoctor = null;
    pendingSlot = null;
    isSubmittingBooking = false;
    conversationId = null;
  }

  return {
    setCallbacks,
    handleMessage,
    handleSpecialtySelect,
    handleDoctorSelect,
    handleSlotSelect,
    handlePatientInfoSubmit,
    handleFeaturedDoctorBooking,
    handleFeaturedDoctorSpecialtySelect,
    handleAction,
    start,
    reset,
    getState: () => state,
  };
})();
