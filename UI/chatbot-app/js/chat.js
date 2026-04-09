// ============================================================
// chat.js – Chatbot conversation engine
// ============================================================

window.ChatEngine = (function() {
  const STATE = {
    IDLE: 'idle',
    AWAITING_SYMPTOM: 'awaiting_symptom',
    AWAITING_ADDRESS: 'awaiting_address',
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
  let patientAddress = '';
  let pendingDoctorLeadHtml = '';
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
    const details = lang === 'vi'
      ? `Bác sĩ: <strong>${doctorName}</strong><br>Chuyên khoa: ${specialty}<br>Thời gian: <strong>${slot}</strong><br>Địa điểm: Vinmec Times City`
      : `Doctor: <strong>${doctorName}</strong><br>Specialty: ${specialty}<br>Time: <strong>${slot}</strong><br>Location: Vinmec Times City`;
    return `
      <div class="chat-confirm-card">
        <div class="chat-confirm-icon">🎉</div>
        <div class="chat-confirm-title">${title}</div>
        <div class="chat-confirm-detail">${details}</div>
      </div>`;
  }

  function buildRatingCard() {
    const lang = window.currentLang;
    const ratingTitle = lang === 'vi' ? 'Đánh giá trải nghiệm đặt lịch' : 'Rate your booking experience';
    const ratingHint = lang === 'vi' ? 'Chọn số sao từ 1 đến 5' : 'Choose from 1 to 5 stars';
    const stars = [1, 2, 3, 4, 5]
      .map((value) => `<button class="chat-rating-star" data-action="rate-${value}" aria-label="${value} star">★</button>`)
      .join('');

    return `
      <div class="chat-booking-form chat-rating-card">
        <div class="chat-rating-title">${ratingTitle}</div>
        <div class="chat-rating-stars">${stars}</div>
        <div class="chat-rating-hint">${ratingHint}</div>
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

  function buildAddressForm() {
    const lang = window.currentLang;
    const title = lang === 'vi' ? 'Nhập địa chỉ trước khi chọn bác sĩ' : 'Enter your address before choosing a doctor';
    const label = lang === 'vi' ? 'Địa chỉ của bạn' : 'Your address';
    const placeholder = lang === 'vi'
      ? 'Ví dụ: 458 Minh Khai, Hai Bà Trưng, Hà Nội'
      : 'Example: 458 Minh Khai, Hai Ba Trung, Ha Noi';
    const submitLabel = lang === 'vi' ? 'Tiếp tục chọn bác sĩ' : 'Continue to doctor selection';

    return `
      <div class="chat-booking-form" data-address-form="true">
        <div class="chat-booking-form-title">${title}</div>
        <label class="chat-booking-label">${label}</label>
        <input class="chat-booking-input" type="text" data-patient-address placeholder="${placeholder}" value="${escapeHtml(patientAddress)}" maxlength="200" />
        <button class="chat-specialty-btn" data-address-submit="true">${submitLabel}</button>
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

  function parseTimeToMinutes(value) {
    const text = (value || '').trim();
    const match = text.match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return (hours * 60) + minutes;
  }

  function extractSlotTimeLabel(slotDateTime) {
    const text = (slotDateTime || '').trim();
    const match = text.match(/(\d{2}:\d{2})$/);
    return match ? match[1] : '';
  }

  function buildAvailableTimeOptions(slotDateTime) {
    const slotLabel = extractSlotTimeLabel(slotDateTime);
    const slotMinutes = parseTimeToMinutes(slotLabel);
    const options = [];

    for (let hour = 6; hour <= 21; hour += 1) {
      for (const minute of [0, 30]) {
        const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const valueMinutes = (hour * 60) + minute;
        if (slotMinutes !== null && valueMinutes >= slotMinutes) {
          continue;
        }
        options.push(`<option value="${label}">${label}</option>`);
      }
    }

    if (!options.length) {
      return '<option value="">--</option>';
    }
    return options.join('');
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
      case STATE.AWAITING_ADDRESS: {
        await handleAddressSubmit(text);
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

          if (result.status === 'clarify') {
            state = STATE.AWAITING_SYMPTOM;
            await botReply(renderMarkdown(result.message), true, 650);
            return;
          }

          suggestedSpecialty = result.suggested_specialty || '';
          if (!suggestedSpecialty) {
            state = STATE.AWAITING_SYMPTOM;
            await botReply(window.currentLang === 'vi'
              ? 'Mình chưa thể xác định chuyên khoa phù hợp lúc này. Bạn mô tả thêm triệu chứng nhé.'
              : 'I could not determine the right specialty yet. Please share more symptoms.', false, 500);
            return;
          }

          currentSpecialty = suggestedSpecialty;
          currentDoctor = null;
          currentDoctors = [];
          pendingSlot = null;
          pendingFeaturedDoctor = null;

          const confidencePct = Math.round((result.confidence || 0) * 100);
          const leadHtml = `${renderMarkdown(result.message)}<br><br>${window.currentLang === 'vi'
            ? `Chuyên khoa được chọn: <strong>${escapeHtml(suggestedSpecialty)}</strong> · Độ tin cậy: <strong>${confidencePct}%</strong>`
            : `Selected specialty: <strong>${escapeHtml(suggestedSpecialty)}</strong> · Confidence: <strong>${confidencePct}%</strong>`}`;
          await showDoctorsForSpecialty(suggestedSpecialty, leadHtml);
        } catch (error) {
          state = STATE.AWAITING_SYMPTOM;
          await botReply(error.message || 'Không thể kết nối hệ thống, vui lòng thử lại.', false, 600);
        }
        break;
      }
    }
  }

  async function showDoctorsForSpecialty(specialtyName, leadHtml = '') {
    try {
      const data = await request(`/api/slots?specialty=${encodeURIComponent(specialtyName)}`, {
        method: 'GET',
      });

      const slots = Array.isArray(data?.slots) ? data.slots : [];
      if (!slots.length) {
        state = STATE.AWAITING_SYMPTOM;
        const noSlotText = window.currentLang === 'vi'
          ? 'Hiện chưa có lịch trống cho chuyên khoa đã chọn. Mình sẽ chuyển bạn sang tổng đài Vinmec 1900 2345 để hỗ trợ ngay.'
          : 'No available slots for the selected specialty. I will connect you to Vinmec hotline 1900 2345 for support.';
        const finalHtml = leadHtml ? `${leadHtml}<br><br>${escapeHtml(noSlotText)}` : noSlotText;
        await botReply(finalHtml, Boolean(leadHtml), 600);
        return;
      }

      currentDoctors = groupSlotsByDoctor(slots);
      currentDoctor = null;
      pendingSlot = null;
      pendingDoctorLeadHtml = leadHtml;
      patientAddress = '';
      state = STATE.AWAITING_ADDRESS;
      const addressPrompt = window.currentLang === 'vi'
        ? 'Trước khi chọn bác sĩ, bạn vui lòng nhập địa chỉ để hệ thống hỗ trợ tốt hơn.'
        : 'Before choosing a doctor, please provide your address so the system can support you better.';
      const html = `${leadHtml ? `${leadHtml}<br><br>` : ''}${addressPrompt}<br>${buildAddressForm()}`;
      await botReply(html, true, 500);
      return;
    } catch (error) {
      state = STATE.AWAITING_SYMPTOM;
      await botReply(error.message || 'Không thể tải danh sách bác sĩ.', false, 550);
    }
  }

  async function showDoctorList(leadHtml = '') {
    state = STATE.SHOWING_DOCTORS;
    const intro = window.currentLang === 'vi'
      ? `Các bác sĩ hiện có lịch trống cho <strong>${escapeHtml(currentSpecialty)}</strong>:`
      : `Available doctors for <strong>${escapeHtml(currentSpecialty)}</strong>:`;
    const html = `${leadHtml ? `${leadHtml}<br><br>` : ''}${intro}<br>${buildDoctorCards(currentDoctors)}`;
    await botReply(html, true, 550);
  }

  async function handleAddressSubmit(address) {
    const value = (address || '').trim();
    if (!value) {
      await botReply(
        window.currentLang === 'vi'
          ? 'Bạn vui lòng nhập địa chỉ để tiếp tục chọn bác sĩ.'
          : 'Please provide your address to continue selecting a doctor.',
        false,
        300,
      );
      return;
    }

    patientAddress = value;
    await showDoctorList(pendingDoctorLeadHtml);
    pendingDoctorLeadHtml = '';
  }

  async function handleSpecialtySelect(specialtyName) {
    if (!specialtyName) return;
    currentSpecialty = specialtyName;
    await showDoctorsForSpecialty(specialtyName);
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

      // Hiển thị form chọn phương tiện và hỏi giờ rảnh
      await showTransportChoiceForm(booking.booking_id);
    } catch (error) {
      state = STATE.AWAITING_PATIENT_INFO;
      await botReply(error.message || 'Không thể xác nhận đặt lịch. Vui lòng thử lại.', false, 500);
    } finally {
      isSubmittingBooking = false;
    }
  }

  async function showTransportChoiceForm(bookingId) {
    const lang = window.currentLang;
    const title = lang === 'vi' ? 'Bạn muốn di chuyển bằng phương tiện nào?' : 'How would you like to travel?';
    const option1 = lang === 'vi' ? '🚕 Đặt xe XanhSM' : '🚕 Book XanhSM car';
    const option2 = lang === 'vi' ? '🦶 Tự di chuyển' : '🦶 Self-transport';
    const timeLabel = lang === 'vi' ? 'Bạn rảnh lúc nào để đặt xe?' : 'What time are you available?';
    const timePlaceholder = lang === 'vi' ? 'Chọn giờ rảnh' : 'Select available time';
    const addressLabel = lang === 'vi' ? 'Địa chỉ đón khách (bắt buộc nếu đặt XanhSM)' : 'Pickup address (required for XanhSM)';
    const submitLabel = lang === 'vi' ? 'Xác nhận phương tiện' : 'Confirm transport';
    const slotDateTime = pendingSlot?.slot_time || '';
    const slotTimeLabel = extractSlotTimeLabel(slotDateTime);
    const timeOptions = buildAvailableTimeOptions(slotDateTime);

    const html = `
      <div class="chat-booking-form" data-transport-form="true">
        <div class="chat-booking-form-title">${title}</div>
        <div style="margin:10px 0;display:flex;gap:10px;">
          <button class="chat-specialty-btn" type="button" data-transport-mode="xanhsm">${option1}</button>
          <button class="chat-specialty-btn" type="button" data-transport-mode="tự đi">${option2}</button>
        </div>
        <div style="margin:10px 0;">
          <label class="chat-booking-label">${timeLabel}</label>
          <select class="chat-booking-input" data-available-time>
            <option value="">${timePlaceholder}</option>
            ${timeOptions}
          </select>
        </div>
        <div style="margin:10px 0;">
          <label class="chat-booking-label">${addressLabel}</label>
          <input class="chat-booking-input" type="text" data-pickup-address placeholder="Số nhà, đường, quận/huyện..." value="${escapeHtml(patientAddress)}" maxlength="200" />
        </div>
        <button class="chat-specialty-btn" type="button" data-transport-submit="true">${submitLabel}</button>
      </div>
    `;

    await botReply(html, true, 120);

    setTimeout(() => {
      let selectedMode = '';
      const modeButtons = document.querySelectorAll('[data-transport-mode]');
      const submitBtn = document.querySelector('[data-transport-submit]');

      const applyTransportModeState = (activeBtn) => {
        modeButtons.forEach((b) => {
          const isActive = b === activeBtn;
          b.classList.toggle('selected', isActive);
          b.setAttribute('aria-pressed', isActive ? 'true' : 'false');

          // Apply inline fallback styles so selected state is always visible
          // even if cached CSS or specificity conflicts occur.
          b.style.background = isActive
            ? 'linear-gradient(135deg, #006d7a, #004f59)'
            : 'var(--vin-teal)';
          b.style.border = isActive
            ? '1.5px solid #003a42'
            : '1.5px solid transparent';
          b.style.fontWeight = isActive ? '800' : '600';
          b.style.boxShadow = isActive
            ? '0 8px 18px rgba(0, 79, 89, 0.35)'
            : 'none';
          b.style.opacity = isActive ? '1' : '0.88';
          b.style.transform = isActive ? 'translateY(-1px)' : 'none';
        });
      };

      modeButtons.forEach((btn) => {
        btn.onclick = () => {
          selectedMode = (btn.getAttribute('data-transport-mode') || '').trim();
          applyTransportModeState(btn);
        };
      });

      if (!submitBtn) return;

      submitBtn.onclick = async () => {
        const availableTime = (document.querySelector('[data-available-time]')?.value || '').trim();
        const pickupAddress = (document.querySelector('[data-pickup-address]')?.value || '').trim();

        if (!selectedMode) {
          await botReply(lang === 'vi' ? 'Bạn cần chọn phương tiện di chuyển.' : 'Please select a transport mode.', false, 300);
          return;
        }
        if (!availableTime) {
          await botReply(lang === 'vi' ? 'Bạn cần nhập giờ rảnh.' : 'Please enter your available time.', false, 300);
          return;
        }
        if (slotTimeLabel) {
          const availableMinutes = parseTimeToMinutes(availableTime);
          const slotMinutes = parseTimeToMinutes(slotTimeLabel);
          if (availableMinutes === null || slotMinutes === null || availableMinutes >= slotMinutes) {
            await botReply(
              lang === 'vi'
                ? `Giờ rảnh phải sớm hơn giờ khám (${slotTimeLabel}).`
                : `Available time must be earlier than appointment time (${slotTimeLabel}).`,
              false,
              300,
            );
            return;
          }
        }
        if (selectedMode === 'xanhsm' && !pickupAddress) {
          await botReply(lang === 'vi' ? 'Bạn vui lòng nhập địa chỉ đón khách để đặt xe XanhSM.' : 'Please provide pickup address for XanhSM booking.', false, 300);
          return;
        }

        submitBtn.disabled = true;
        try {
          await request('/api/transport/choose', {
            method: 'POST',
            body: JSON.stringify({
              booking_id: bookingId,
              transport_mode: selectedMode,
              available_time: availableTime,
              pickup_address: pickupAddress,
            }),
          });

          const finalMsg = selectedMode === 'xanhsm'
            ? (lang === 'vi'
              ? '✅ Đặt lịch và đặt xe XanhSM thành công. Xe sẽ đón bạn tại địa chỉ đã cung cấp. Cảm ơn quý khách!'
              : '✅ Appointment and XanhSM ride booked successfully. Your pickup is confirmed.')
            : (lang === 'vi'
              ? '✅ Đặt lịch thành công. Mời quý khách đến đúng giờ hẹn để được phục vụ tốt nhất.'
              : '✅ Appointment booked successfully. Please arrive on time.');

          await botReply(finalMsg, false, 400);
          await botReply(buildRatingCard(), true, 220);
        } catch (e) {
          await botReply(e.message || (lang === 'vi' ? 'Không thể lưu lựa chọn phương tiện.' : 'Could not save transport choice.'), false, 400);
        } finally {
          submitBtn.disabled = false;
        }
      };
    }, 60);
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
    if (!action) return;

    if (action.startsWith('rate-')) {
      const rating = Number.parseInt(action.replace('rate-', ''), 10);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) return;

      const response = window.currentLang === 'vi'
        ? `Cảm ơn bạn đã đánh giá <strong>${rating}/5</strong> sao. Chúc bạn nhiều sức khỏe!`
        : `Thank you for your <strong>${rating}/5</strong>-star rating. Wishing you good health!`;
      await botReply(response, true, 300);
      return;
    }
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
    patientAddress = '';
    pendingDoctorLeadHtml = '';
    isSubmittingBooking = false;
    conversationId = null;
  }

  return {
    setCallbacks,
    handleMessage,
    handleSpecialtySelect,
    handleDoctorSelect,
    handleAddressSubmit,
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
