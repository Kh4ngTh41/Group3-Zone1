// ============================================================
// chat.js – Chatbot conversation engine
// ============================================================

window.ChatEngine = (function() {
  // Conversation state machine
  const STATE = {
    IDLE: 'idle',
    AWAITING_SYMPTOM: 'awaiting_symptom',
    SHOWING_SPECIALTY: 'showing_specialty',
    SHOWING_DOCTORS: 'showing_doctors',
    SHOWING_SLOTS: 'showing_slots',
    CONFIRMED: 'confirmed',
  };

  let state = STATE.IDLE;
  let currentSpecialty = null;
  let currentDoctor = null;
  let sessionId = 'session_' + Date.now();
  let onMessageCb = null;
  let onTypingCb = null;

  // Parse markdown bold
  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
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

  function buildSpecialtyCard(spec) {
    const name = window.t(spec.nameKey);
    const lang = window.currentLang;
    const doctorCount = (window.DOCTORS[spec.id] || []).length;
    const countLabel = lang === 'vi' ? `${doctorCount} bác sĩ có lịch` : `${doctorCount} doctors available`;
    return `
      <div class="chat-specialty-card" data-spec-id="${spec.id}" role="button" tabindex="0">
        <div class="chat-specialty-header">
          <span class="chat-specialty-emoji">${spec.emoji}</span>
          <span class="chat-specialty-name">${name}</span>
        </div>
        <div class="chat-specialty-desc">${countLabel}</div>
        <button class="chat-specialty-btn" data-spec-id="${spec.id}">
          ${lang === 'vi' ? 'Xem danh sách bác sĩ →' : 'View Doctors →'}
        </button>
      </div>`;
  }

  function buildDoctorCard(doc) {
    const lang = window.currentLang;
    const name = lang === 'en' ? doc.nameEn : doc.name;
    const specName = window.t(window.SPECIALTIES.find(s => s.id === doc.specialty)?.nameKey || '');
    const exp = lang === 'vi' ? `${doc.experience} kinh nghiệm` : `${doc.experience} yrs experience`;
    return `
      <div class="chat-doctor-card" data-doc-id="${doc.id}" role="button" tabindex="0">
        <div class="chat-doc-avatar">${doc.emoji}</div>
        <div class="chat-doc-info">
          <div class="chat-doc-name">${name}</div>
          <div class="chat-doc-title">${doc.title}</div>
          <div class="chat-doc-spec">🏥 ${specName} · ${exp}</div>
        </div>
        <div class="chat-doc-rating">⭐ ${doc.rating}</div>
      </div>`;
  }

  function buildSlotsHtml(slots) {
    const lang = window.currentLang;
    const items = slots.map(slot => {
      const label = lang === 'en' ? slot.labelEn : slot.label;
      return `<button class="chat-slot" data-slot-id="${slot.id}" data-slot-label="${label}">${label}</button>`;
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

  // ---- API Call (replace with real endpoint) ----
  async function callChatAPI(message) {
    // TODO: Replace with real chatbot API
    // const res = await fetch('/api/chat', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message, sessionId, language: window.currentLang }),
    // });
    // return await res.json(); // { reply, intent, data }

    // Mock: analyze locally
    const specialty = window.analyzeSymptom(message, window.currentLang);
    if (specialty) {
      return { intent: 'symptom', specialty };
    }
    return { intent: 'general' };
  }

  // ---- Handle user message ----
  async function handleMessage(text) {
    if (!text.trim()) return;

    switch (state) {
      case STATE.IDLE:
      case STATE.AWAITING_SYMPTOM: {
        const result = await callChatAPI(text);
        if (result.intent === 'symptom' && result.specialty) {
          currentSpecialty = result.specialty;
          state = STATE.SHOWING_SPECIALTY;
          const introText = window.t('chatSpecialtyIntro');
          await botReply(introText + buildSpecialtyCard(result.specialty), true, 900);
        } else {
          state = STATE.AWAITING_SYMPTOM;
          await botReply(window.t('chatFallback'), false, 900);
        }
        break;
      }

      case STATE.CONFIRMED: {
        state = STATE.AWAITING_SYMPTOM;
        const welcome = window.t('chatWelcome');
        await botReply(welcome, false, 600);
        break;
      }

      default: {
        await botReply(window.t('chatFallback'), false, 800);
      }
    }
  }

  // Called when user taps specialty card
  async function handleSpecialtySelect(specId) {
    const spec = window.SPECIALTIES.find(s => s.id === specId);
    if (!spec) return;
    currentSpecialty = spec;
    state = STATE.SHOWING_DOCTORS;

    const docs = window.DOCTORS[specId] || [];
    const doctorCards = docs.map(buildDoctorCard).join('');
    const intro = window.t('chatDoctorIntro');
    const selectText = window.t('chatSelectDoctor');
    const html = intro + '<br>' + doctorCards + `<br><small style="color:var(--text-muted)">${selectText}</small>`;
    await botReply(html, true, 600);
  }

  // Called when user taps doctor card
  async function handleDoctorSelect(docId) {
    const allDocs = Object.values(window.DOCTORS).flat();
    const doc = allDocs.find(d => d.id === docId);
    if (!doc) return;
    currentDoctor = doc;
    state = STATE.SHOWING_SLOTS;

    const slots = window.getTimeSlots(docId);
    const slotsHtml = buildSlotsHtml(slots);
    const intro = window.t('chatSelectSlot');
    await botReply(intro + '<br>' + slotsHtml, true, 500);
  }

  // Called when user taps time slot
  async function handleSlotSelect(slotId, slotLabel) {
    if (!currentDoctor) return;
    state = STATE.CONFIRMED;

    const lang = window.currentLang;
    const docName = lang === 'en' ? currentDoctor.nameEn : currentDoctor.name;
    const specName = window.t(window.SPECIALTIES.find(s => s.id === currentDoctor.specialty)?.nameKey || '');

    const confirmCard = buildConfirmCard(docName, specName, slotLabel);
    await botReply(confirmCard, true, 600);

    // TTS
    setTimeout(() => {
      const ttsText = lang === 'vi'
        ? `Đặt lịch thành công! Bác sĩ ${docName}. Thời gian ${slotLabel}. Tại Vinmec Times City.`
        : `Booking confirmed! Doctor ${docName}. Time: ${slotLabel}. At Vinmec Times City.`;
      window.SpeechModule.speak(ttsText, window.SpeechModule.getLang());
    }, 800);

    // Offer to book another
    setTimeout(() => {
      if (onMessageCb) onMessageCb({
        role: 'bot',
        html: window.t('chatBookAnother'),
      });
    }, 1800);
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
    currentSpecialty = null;
    currentDoctor = null;
  }

  return {
    setCallbacks,
    handleMessage,
    handleSpecialtySelect,
    handleDoctorSelect,
    handleSlotSelect,
    start,
    reset,
    getState: () => state,
  };
})();
