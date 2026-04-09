// ============================================================
// app.js – Main application controller
// ============================================================

(function() {
  'use strict';

  // ---- DOM Refs ----
  const $ = id => document.getElementById(id);
  const API_BASE = window.VINCARE_API_BASE || 'http://localhost:8000';

  const header       = $('header') || document.querySelector('.header');
  const langToggle   = $('langToggle');
  const langFlag     = $('langFlag');
  const langLabel    = $('langLabel');
  const chatBubble   = $('chatBubble');
  const chatPanel    = $('chatPanel');
  const chatOverlay  = $('chatOverlay');
  const chatClose    = $('chatClose');
  const chatMinimize = $('chatMinimize');
  const chatFullscreen = $('chatFullscreen');
  const chatLangToggle = $('chatLangToggle');
  const chatLangFlag   = $('chatLangFlag');
  const chatMessages = $('chatMessages');
  const chatInput    = $('chatInput');
  const sendBtn      = $('sendBtn');
  const voiceBtn     = $('voiceBtn');
  const resetChatBtn = $('resetChatBtn');
  const quickReplies = $('quickReplies');
  const bnChat       = $('bnChat');
  const heroChatBtn  = $('heroChatBtn');
  const headerCta    = $('headerCta');
  const hamburger    = $('hamburger');
  const specialtiesGrid = $('specialtiesGrid');
  const doctorsGrid     = $('doctorsGrid');

  // ---- State ----
  let chatOpen = false;
  let chatFullscreenOpen = false;
  let msgCount = 0;
  let isSendingMessage = false;

  function getSpecialtyDisplayName(spec) {
    if (!spec) return '';
    return spec.name || window.t(spec.nameKey || '');
  }

  function getSpecialtyById(specId) {
    return (window.SPECIALTIES || []).find(s => s.id === specId);
  }

  function normalizeDoctorProfileUrl(endpoint) {
    const base = 'https://www.vinmec.com';
    const path = (endpoint || '').trim();
    if (!path) return base;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  function updateFullscreenButtonState() {
    if (!chatFullscreen) return;
    chatFullscreen.classList.toggle('active', chatFullscreenOpen);
    chatFullscreen.setAttribute('aria-label', chatFullscreenOpen ? 'Thu nhỏ khung chat' : 'Mở rộng khung chat');
  }

  function toggleFullscreen() {
    chatFullscreenOpen = !chatFullscreenOpen;
    if (chatPanel) {
      chatPanel.classList.toggle('fullscreen', chatFullscreenOpen);
    }
    updateFullscreenButtonState();
  }

  async function loadHomepageHighlights() {
    try {
      const response = await fetch(`${API_BASE}/api/home/highlights`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();

      if (Array.isArray(data.specialties) && data.specialties.length > 0) {
        window.SPECIALTIES = data.specialties.map((spec) => ({
          id: spec.id,
          emoji: spec.emoji || '🏥',
          name: spec.name,
          doctors: spec.doctors || 0,
          keywords: { vi: [], en: [] },
        }));
      }

      if (Array.isArray(data.featured_doctors) && data.featured_doctors.length > 0) {
        window.FEATURED_DOCTORS = data.featured_doctors.map((doctor, index) => ({
          id: doctor.id || `csv-doc-${index + 1}`,
          name: doctor.name,
          nameEn: doctor.name,
          title: doctor.title || 'Bác sĩ',
          specialty: doctor.specialty_id,
          specialtyName: doctor.specialty,
          emoji: '👨‍⚕️',
          experience: '',
          rating: '4.9',
          specialties: Array.isArray(doctor.specialties) ? doctor.specialties : [doctor.specialty].filter(Boolean),
          doctorProfileEndpoint: doctor.doctor_profile_endpoint || '',
        }));
      }
    } catch (error) {
      console.warn('Unable to load homepage highlights from API. Using fallback static data.', error);
    }
  }

  // ============================================================
  // LANGUAGE
  // ============================================================
  function applyLanguage() {
    const lang = window.currentLang;
    const flag = lang === 'vi' ? '🇻🇳' : '🇬🇧';
    const label = lang === 'vi' ? 'VI' : 'EN';

    if (langFlag) langFlag.textContent = flag;
    if (langLabel) langLabel.textContent = label;
    if (chatLangFlag) chatLangFlag.textContent = flag;

    // Update static text via i18n keys
    const updates = {
      'nav-home': 'navHome',
      'nav-specialties': 'navSpecialties',
      'nav-doctors': 'navDoctors',
      'nav-booking': 'navBooking',
      'headerCtaText': 'headerCta',
      'heroBadgeText': 'heroBadge',
      'heroDesc': 'heroDesc',
      'heroChatText': 'heroChatBtn',
      'heroLearnText': 'heroLearnBtn',
      'statHospitals': 'statHospitals',
      'statDoctors': 'statDoctors',
      'statPatients': 'statPatients',
      'miniCard1Title': 'miniCard1Title',
      'miniCard2Title': 'miniCard2Title',
      'miniCard2Sub': 'miniCard2Sub',
      'specialtiesBadge': 'specialtiesBadge',
      'specialtiesTitle': 'specialtiesTitle',
      'specialtiesDesc': 'specialtiesDesc',
      'doctorsBadge': 'doctorsBadge',
      'doctorsTitle': 'doctorsTitle',
      'doctorsDesc': 'doctorsDesc',
      'whyBadge': 'whyBadge',
      'whyTitle': 'whyTitle',
      'why1Title': 'why1Title',
      'why1Desc': 'why1Desc',
      'why2Title': 'why2Title',
      'why2Desc': 'why2Desc',
      'why3Title': 'why3Title',
      'why3Desc': 'why3Desc',
      'why4Title': 'why4Title',
      'why4Desc': 'why4Desc',
      'footerDesc': 'footerDesc',
      'footerCol1': 'footerCol1',
      'footerCol2': 'footerCol2',
      'footerCol3': 'footerCol3',
      'footerCopy': 'footerCopy',
      'bnHomeLabel': 'bnHomeLabel',
      'bnDoctorsLabel': 'bnDoctorsLabel',
      'bnSpecialtiesLabel': 'bnSpecialtiesLabel',
      'bnProfileLabel': 'bnProfileLabel',
      'chatStatusText': 'chatStatusText',
    };

    Object.entries(updates).forEach(([id, key]) => {
      const el = $(id);
      if (el) el.textContent = window.t(key);
    });

    // Hero title special case
    const heroTitleEl = $('heroTitle');
    if (heroTitleEl) {
      if (lang === 'vi') {
        heroTitleEl.innerHTML = 'Đặt lịch khám<br/><span class="gradient-text">thông minh</span><br/>cùng VinCare AI';
      } else {
        heroTitleEl.innerHTML = 'Smart medical<br/><span class="gradient-text">appointment</span><br/>with VinCare AI';
      }
    }

    // Input placeholder
    if (chatInput) chatInput.placeholder = window.t('chatInputPlaceholder');

    // Rerender specialties & doctors
    renderSpecialties();
    renderFeaturedDoctors();
    renderQuickReplies();

    // html lang attribute
    document.documentElement.lang = lang === 'vi' ? 'vi' : 'en';
  }

  function toggleLanguage() {
    const newLang = window.currentLang === 'vi' ? 'en' : 'vi';
    window.setLang(newLang);
    applyLanguage();
  }

  // ============================================================
  // SPECIALTIES GRID
  // ============================================================
  function renderSpecialties() {
    if (!specialtiesGrid) return;
    const lang = window.currentLang;
    specialtiesGrid.innerHTML = window.SPECIALTIES.map(spec => {
      const name = getSpecialtyDisplayName(spec);
      const countLabel = lang === 'vi' ? `${spec.doctors} bác sĩ` : `${spec.doctors} doctors`;
      return `
        <div class="specialty-card fade-in-up" data-spec-id="${spec.id}" role="button" tabindex="0" aria-label="${name}">
          <span class="specialty-icon">${spec.emoji}</span>
          <div class="specialty-name">${name}</div>
          <div class="specialty-count">${countLabel}</div>
        </div>`;
    }).join('');

    // Click opens chat with specialty pre-selected
    specialtiesGrid.querySelectorAll('.specialty-card').forEach(card => {
      card.addEventListener('click', () => {
        openChat();
        const specId = card.dataset.specId;
        setTimeout(() => {
          const spec = getSpecialtyById(specId);
          if (spec) {
            const specName = getSpecialtyDisplayName(spec);
            const userMsg = window.currentLang === 'vi'
              ? `Tôi muốn khám ${specName}`
              : `I want to see a ${specName} doctor`;
            appendUserMessage(userMsg);
            window.ChatEngine.handleMessage(userMsg);
          }
        }, 400);
      });
    });
  }

  // ============================================================
  // FEATURED DOCTORS (homepage)
  // ============================================================
  function renderFeaturedDoctors() {
    if (!doctorsGrid) return;
    const lang = window.currentLang;
    doctorsGrid.innerHTML = window.FEATURED_DOCTORS.map(doc => {
      const name = lang === 'en' ? doc.nameEn : doc.name;
      const spec = getSpecialtyById(doc.specialty);
      const specName = doc.specialtyName || getSpecialtyDisplayName(spec);
      const profileLabel = lang === 'vi' ? 'Xem hồ sơ bác sĩ' : 'Doctor profile';
      const profileUrl = normalizeDoctorProfileUrl(doc.doctorProfileEndpoint);
      const expLabel = doc.experience
        ? (lang === 'vi' ? `${doc.experience} KN` : `${doc.experience}`)
        : (lang === 'vi' ? 'Nhiều năm kinh nghiệm' : 'Experienced');
      const bookLabel = window.t('doctorBookBtn');
      return `
        <div class="doctor-card fade-in-up">
          <div class="doctor-card-header">
            <div class="doctor-avatar">${doc.emoji}</div>
            <div class="doctor-rating">⭐ ${doc.rating}</div>
          </div>
          <div class="doctor-card-body">
            <div class="doctor-name">${name}</div>
            <div class="doctor-title">${doc.title}</div>
            <div class="doctor-specialty">🏥 ${specName} · ${expLabel}</div>
            <a class="doctor-profile-link" href="${profileUrl}" target="_blank" rel="noopener noreferrer">${profileLabel}</a>
            <button class="doctor-book-btn" data-doc-id="${doc.id}" data-spec-id="${doc.specialty}">${bookLabel}</button>
          </div>
        </div>`;
    }).join('');

    doctorsGrid.querySelectorAll('.doctor-book-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openChat();
        const selectedDoctor = (window.FEATURED_DOCTORS || []).find((doc) => doc.id === btn.dataset.docId);
        setTimeout(() => {
          if (!selectedDoctor) return;
          const spec = getSpecialtyById(selectedDoctor.specialty);
          const specName = selectedDoctor.specialtyName || getSpecialtyDisplayName(spec);
          const userMsg = window.currentLang === 'vi'
            ? `Tôi muốn đặt lịch với bác sĩ ${selectedDoctor.name}`
            : `I want to book with Dr. ${selectedDoctor.name}`;
          appendUserMessage(userMsg);
          hideQuickReplies();
          window.ChatEngine.handleFeaturedDoctorBooking({
            name: selectedDoctor.name,
            specialtyName: specName,
            specialties: selectedDoctor.specialties || [],
            doctorProfileEndpoint: selectedDoctor.doctorProfileEndpoint || '',
          });
        }, 400);
      });
    });
  }

  // ============================================================
  // QUICK REPLIES
  // ============================================================
  function renderQuickReplies() {
    if (!quickReplies) return;
    const chips = ['qr1','qr2','qr3','qr4','qr5','qr6','qr7'];
    quickReplies.innerHTML = chips.map(key =>
      `<button class="quick-chip" data-key="${key}" id="qchip-${key}">${window.t(key)}</button>`
    ).join('');

    quickReplies.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.textContent.trim();
        appendUserMessage(text);
        hideQuickReplies();
        window.ChatEngine.handleMessage(text);
      });
    });
  }

  function hideQuickReplies() {
    if (quickReplies) {
      quickReplies.style.display = 'none';
    }
  }

  // ============================================================
  // CHAT PANEL
  // ============================================================
  function openChat() {
    if (chatOpen) return;
    chatOpen = true;
    chatPanel.classList.add('open');
    chatOverlay.classList.add('visible');
    if (chatBubble) chatBubble.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Init chat on first open
    if (msgCount === 0) {
      window.ChatEngine.start();
      renderQuickReplies();
    }

    setTimeout(() => chatInput && chatInput.focus(), 350);
  }

  function closeChat() {
    chatOpen = false;
    chatPanel.classList.remove('open');
    chatFullscreenOpen = false;
    chatPanel.classList.remove('fullscreen');
    chatOverlay.classList.remove('visible');
    if (chatBubble) chatBubble.classList.remove('open');
    document.body.style.overflow = '';
    updateFullscreenButtonState();
  }

  // ============================================================
  // MESSAGES RENDERING
  // ============================================================
  function formatTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function appendUserMessage(text) {
    msgCount++;
    const div = document.createElement('div');
    div.className = 'msg msg-user';
    div.innerHTML = `
      <div>
        <div class="msg-bubble">${escapeHtml(text)}</div>
        <div class="msg-time">${formatTime()}</div>
      </div>`;
    chatMessages.appendChild(div);
    scrollToBottom();
  }

  function appendBotMessage(html) {
    msgCount++;
    const div = document.createElement('div');
    div.className = 'msg msg-bot';
    div.innerHTML = `
      <div class="msg-avatar-sm">✦</div>
      <div>
        <div class="msg-bubble">${html}</div>
        <div class="msg-time">${formatTime()}</div>
      </div>`;
    chatMessages.appendChild(div);
    scrollToBottom();
    attachCardListeners(div);
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'typing-indicator';
    el.id = 'typingIndicator';
    el.innerHTML = `
      <div class="msg-avatar-sm">✦</div>
      <div class="typing-bubble">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>`;
    chatMessages.appendChild(el);
    scrollToBottom();
  }

  function hideTyping() {
    const el = $('typingIndicator');
    if (el) el.remove();
  }

  function resetConversation(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    hideTyping();
    if (chatMessages) chatMessages.innerHTML = '';

    msgCount = 0;
    isSendingMessage = false;

    if (chatInput) {
      chatInput.value = '';
      chatInput.style.height = 'auto';
    }
    if (sendBtn) sendBtn.disabled = true;

    if (window.SpeechModule) {
      window.SpeechModule.cancelSpeak();
      if (window.SpeechModule.isListening) {
        window.SpeechModule.stopListening();
      }
    }
    if (voiceBtn) voiceBtn.classList.remove('listening');

    window.ChatEngine.reset();
    window.ChatEngine.start();

    if (quickReplies) quickReplies.style.display = 'flex';
    renderQuickReplies();

    setTimeout(() => {
      if (chatInput) chatInput.focus();
    }, 100);

    // Fallback: ensure user always sees a visible fresh-start message.
    setTimeout(() => {
      if (chatMessages && chatMessages.children.length === 0) {
        const welcome = typeof window.t === 'function'
          ? window.t('chatWelcome')
          : 'Xin chao! Moi ban mo ta trieu chung de bat dau.';
        appendBotMessage(welcome);
      }
    }, 700);
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(text));
    return d.innerHTML;
  }

  // ============================================================
  // CARD INTERACTION LISTENERS
  // ============================================================
  function attachCardListeners(container) {
    // Specialty options
    container.querySelectorAll('[data-specialty-name]').forEach(el => {
      el.addEventListener('click', () => {
        const specialtyName = el.dataset.specialtyName;
        if (!specialtyName) return;
        hideQuickReplies();
        window.ChatEngine.handleSpecialtySelect(specialtyName);
      });
    });

    // Featured doctor multi-specialty options
    container.querySelectorAll('[data-featured-specialty-name]').forEach(el => {
      el.addEventListener('click', () => {
        const specialtyName = el.dataset.featuredSpecialtyName;
        if (!specialtyName) return;
        hideQuickReplies();
        window.ChatEngine.handleFeaturedDoctorSpecialtySelect(specialtyName);
      });
    });

    // Doctor cards
    container.querySelectorAll('.chat-doctor-card[data-doctor-key]').forEach(el => {
      el.addEventListener('click', (event) => {
        if (event.target.closest('a')) return;
        const doctorKey = el.dataset.doctorKey;
        if (!doctorKey) return;
        window.ChatEngine.handleDoctorSelect(doctorKey);
      });
    });

    // Slot buttons
    container.querySelectorAll('[data-slot-id]').forEach(el => {
      el.addEventListener('click', () => {
        const slotId = el.dataset.slotId;
        const label  = el.dataset.slotLabel;
        // Disable other slots
        container.querySelectorAll('[data-slot-id]').forEach(s => {
          s.disabled = true;
          s.style.opacity = '0.5';
        });
        el.style.opacity = '1';
        el.style.background = 'var(--vin-teal)';
        el.style.color = 'white';
        window.ChatEngine.handleSlotSelect(slotId, label);
      });
    });

    // Generic action buttons (e.g., book again)
    container.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', () => {
        const action = el.dataset.action;
        if (!action) return;
        window.ChatEngine.handleAction(action);
      });
    });

    // Booking form submit
    container.querySelectorAll('[data-booking-submit]').forEach(el => {
      el.addEventListener('click', () => {
        const form = el.closest('[data-booking-form]');
        if (!form) return;
        const nameInput = form.querySelector('[data-patient-name]');
        const phoneInput = form.querySelector('[data-patient-phone]');
        window.ChatEngine.handlePatientInfoSubmit(
          nameInput ? nameInput.value : '',
          phoneInput ? phoneInput.value : '',
        );
      });
    });

    // Address form submit (before selecting doctor)
    container.querySelectorAll('[data-address-submit]').forEach(el => {
      el.addEventListener('click', () => {
        const form = el.closest('[data-address-form]');
        if (!form) return;
        const addressInput = form.querySelector('[data-patient-address]');
        window.ChatEngine.handleAddressSubmit(addressInput ? addressInput.value : '');
      });
    });
  }

  // ============================================================
  // SEND MESSAGE
  // ============================================================
  async function sendMessage() {
    if (isSendingMessage) return;
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    isSendingMessage = true;
    hideQuickReplies();
    appendUserMessage(text);
    window.SpeechModule.cancelSpeak();
    try {
      await window.ChatEngine.handleMessage(text);
    } finally {
      isSendingMessage = false;
      if (chatInput && chatInput.value.trim()) {
        sendBtn.disabled = false;
      }
    }
  }

  // ============================================================
  // VOICE
  // ============================================================
  function toggleVoice() {
    if (window.SpeechModule.isListening) {
      window.SpeechModule.stopListening();
      voiceBtn.classList.remove('listening');
      return;
    }

    if (!window.SpeechModule.isSupported()) {
      alert(window.t('voiceNotSupported'));
      return;
    }

    voiceBtn.classList.add('listening');
    const lang = window.currentLang === 'en' ? 'en-US' : 'vi-VN';

    window.SpeechModule.startListening({
      lang,
      onTranscript: (text, isFinal) => {
        chatInput.value = text;
        sendBtn.disabled = !text.trim();
        if (isFinal) {
          voiceBtn.classList.remove('listening');
        }
      },
      onError: (err) => {
        voiceBtn.classList.remove('listening');
        if (err !== 'no-speech') alert(window.t('voiceError'));
      },
      onEnd: () => {
        voiceBtn.classList.remove('listening');
        // Auto-send if we got something
        if (chatInput.value.trim()) {
          setTimeout(sendMessage, 300);
        }
      },
    });
  }

  // ============================================================
  // HEADER SCROLL EFFECT
  // ============================================================
  function setupHeaderScroll() {
    const h = document.querySelector('.header');
    if (!h) return;
    window.addEventListener('scroll', () => {
      h.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // ============================================================
  // INTERSECTION OBSERVER (fade-in animations)
  // ============================================================
  function setupAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          entry.target.style.animationDelay = `${i * 0.06}s`;
          entry.target.classList.add('fade-in-up');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.specialty-card, .doctor-card, .why-card').forEach(el => {
      observer.observe(el);
    });
  }

  // ============================================================
  // AUTO-RESIZE TEXTAREA
  // ============================================================
  function autoResize() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
  }

  // ============================================================
  // INIT
  // ============================================================
  async function init() {
    await loadHomepageHighlights();

    // Language
    applyLanguage();

    if (langToggle) langToggle.addEventListener('click', toggleLanguage);
    if (chatLangToggle) chatLangToggle.addEventListener('click', () => {
      toggleLanguage();
      // Update chat placeholder
      if (chatInput) chatInput.placeholder = window.t('chatInputPlaceholder');
    });

    // Chat open/close
    if (chatBubble)   chatBubble.addEventListener('click', openChat);
    if (bnChat)       bnChat.addEventListener('click', openChat);
    if (heroChatBtn)  heroChatBtn.addEventListener('click', openChat);
    if (headerCta)    headerCta.addEventListener('click', openChat);
    if (chatClose)    chatClose.addEventListener('click', closeChat);
    if (chatMinimize) chatMinimize.addEventListener('click', closeChat);
    if (chatFullscreen) chatFullscreen.addEventListener('click', toggleFullscreen);
    if (chatOverlay)  chatOverlay.addEventListener('click', closeChat);

    // ESC key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && chatOpen) closeChat();
    });

    // Chat engine callbacks
    window.ChatEngine.setCallbacks({
      onMessage: ({ role, html }) => {
        if (role === 'bot') appendBotMessage(html);
      },
      onTyping: (show) => {
        if (show) showTyping(); else hideTyping();
      },
    });

    // Send button & input
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatInput) {
      chatInput.addEventListener('input', () => {
        sendBtn.disabled = !chatInput.value.trim();
        autoResize();
      });
      chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    // Voice
    if (voiceBtn) voiceBtn.addEventListener('click', toggleVoice);
    if (resetChatBtn) {
      resetChatBtn.addEventListener('click', resetConversation);
      resetChatBtn.addEventListener('touchstart', resetConversation, { passive: false });
    }

    // Header scroll
    setupHeaderScroll();

    // Hamburger (mobile)
    if (hamburger) {
      hamburger.addEventListener('click', () => {
        const nav = document.querySelector('.nav-links');
        if (nav) nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
      });
    }

    // Mobile viewport height fix
    function setVH() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    setVH();
    window.addEventListener('resize', setVH);

    // Animations after small delay
    setTimeout(setupAnimations, 100);

    updateFullscreenButtonState();

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
