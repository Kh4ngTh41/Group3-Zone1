// ============================================================
// app.js – Main application controller
// ============================================================

(function() {
  'use strict';

  // ---- DOM Refs ----
  const $ = id => document.getElementById(id);

  const header       = $('header') || document.querySelector('.header');
  const langToggle   = $('langToggle');
  const langFlag     = $('langFlag');
  const langLabel    = $('langLabel');
  const chatBubble   = $('chatBubble');
  const chatPanel    = $('chatPanel');
  const chatOverlay  = $('chatOverlay');
  const chatClose    = $('chatClose');
  const chatMinimize = $('chatMinimize');
  const chatLangToggle = $('chatLangToggle');
  const chatLangFlag   = $('chatLangFlag');
  const chatMessages = $('chatMessages');
  const chatInput    = $('chatInput');
  const sendBtn      = $('sendBtn');
  const voiceBtn     = $('voiceBtn');
  const quickReplies = $('quickReplies');
  const bnChat       = $('bnChat');
  const heroChatBtn  = $('heroChatBtn');
  const headerCta    = $('headerCta');
  const hamburger    = $('hamburger');
  const specialtiesGrid = $('specialtiesGrid');
  const doctorsGrid     = $('doctorsGrid');

  // ---- State ----
  let chatOpen = false;
  let msgCount = 0;

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
      const name = window.t(spec.nameKey);
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
          const spec = window.SPECIALTIES.find(s => s.id === specId);
          if (spec) {
            const userMsg = window.currentLang === 'vi'
              ? `Tôi muốn khám ${window.t(spec.nameKey)}`
              : `I want to see a ${window.t(spec.nameKey)} doctor`;
            appendUserMessage(userMsg);
            window.ChatEngine.handleSpecialtySelect(specId);
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
      const specName = window.t(window.SPECIALTIES.find(s => s.id === doc.specialty)?.nameKey || '');
      const expLabel = lang === 'vi' ? `${doc.experience} KN` : `${doc.experience}`;
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
            <button class="doctor-book-btn" data-doc-id="${doc.id}" data-spec-id="${doc.specialty}">${bookLabel}</button>
          </div>
        </div>`;
    }).join('');

    doctorsGrid.querySelectorAll('.doctor-book-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openChat();
        const docId = btn.dataset.docId;
        const specId = btn.dataset.specId;
        setTimeout(() => {
          const spec = window.SPECIALTIES.find(s => s.id === specId);
          const doc = window.FEATURED_DOCTORS.find(d => d.id === docId);
          if (spec) window.ChatEngine.handleSpecialtySelect(specId);
          setTimeout(() => {
            if (doc) window.ChatEngine.handleDoctorSelect(docId);
          }, 1200);
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
    chatOverlay.classList.remove('visible');
    if (chatBubble) chatBubble.classList.remove('open');
    document.body.style.overflow = '';
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
    // Specialty cards
    container.querySelectorAll('[data-spec-id]').forEach(el => {
      el.addEventListener('click', () => {
        const specId = el.dataset.specId;
        hideQuickReplies();
        window.ChatEngine.handleSpecialtySelect(specId);
      });
    });

    // Doctor cards
    container.querySelectorAll('[data-doc-id]').forEach(el => {
      el.addEventListener('click', () => {
        const docId = el.dataset.docId;
        window.ChatEngine.handleDoctorSelect(docId);
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
  }

  // ============================================================
  // SEND MESSAGE
  // ============================================================
  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    hideQuickReplies();
    appendUserMessage(text);
    window.SpeechModule.cancelSpeak();
    window.ChatEngine.handleMessage(text);
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
  function init() {
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
