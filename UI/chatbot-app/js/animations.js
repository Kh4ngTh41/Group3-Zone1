// ============================================================
// animations.js – GSAP-powered animations for VinCare AI
// Requires: gsap.min.js + ScrollTrigger.min.js (CDN)
// ============================================================

(function () {
  'use strict';

  // ---- Guard: wait for GSAP ----
  if (typeof gsap === 'undefined') {
    console.warn('[VinCare] GSAP not loaded, skipping animations.');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ============================================================
  // 1. PAGE LOADER
  // ============================================================
  function initPageLoader() {
    const loader = document.getElementById('pageLoader');
    const fill   = loader && loader.querySelector('.loader-bar-fill');
    if (!loader) return;

    // Animate progress bar
    if (fill) {
      gsap.to(fill, { width: '100%', duration: 0.9, ease: 'power2.out', delay: 0.1 });
    }

    // Hide loader after content ready
    window.addEventListener('load', () => {
      gsap.to(loader, {
        opacity: 0,
        duration: 0.5,
        delay: 0.3,
        ease: 'power2.inOut',
        onComplete: () => {
          loader.classList.add('hidden');
          loader.style.display = 'none';
          initHeroSequence(); // Start hero animation after loader hides
        },
      });
    });

    // Fallback: force hide after 2s
    setTimeout(() => {
      if (!loader.classList.contains('hidden')) {
        loader.classList.add('hidden');
        loader.style.display = 'none';
        initHeroSequence();
      }
    }, 2000);
  }

  // ============================================================
  // 2. SCROLL PROGRESS BAR
  // ============================================================
  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.id = 'scrollProgress';
    document.body.prepend(bar);

    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const pct = maxScroll > 0 ? (scrolled / maxScroll) * 100 : 0;
      bar.style.width = pct + '%';
    }, { passive: true });
  }

  // ============================================================
  // 3. CUSTOM CURSOR
  // ============================================================
  function initCursor() {
    const dot  = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;

    // Only on pointer:fine devices
    if (!window.matchMedia('(pointer: fine)').matches) {
      dot.style.display = 'none';
      ring.style.display = 'none';
      return;
    }

    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;
    let rafId;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animCursor() {
      // Dot follows immediately
      dot.style.left = mouseX + 'px';
      dot.style.top  = mouseY + 'px';

      // Ring follows with lerp (smooth lag)
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = Math.round(ringX) + 'px';
      ring.style.top  = Math.round(ringY) + 'px';

      rafId = requestAnimationFrame(animCursor);
    }
    animCursor();

    // Hover state on interactive elements
    const interactives = 'a, button, [role="button"], .specialty-card, .doctor-card, .quick-chip, .chat-action-btn';

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactives)) {
        dot.classList.add('hover');
        ring.classList.add('hover');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactives)) {
        dot.classList.remove('hover');
        ring.classList.remove('hover');
      }
    });
    document.addEventListener('mousedown', () => {
      dot.classList.add('clicking');
      ring.classList.add('clicking');
    });
    document.addEventListener('mouseup', () => {
      dot.classList.remove('clicking');
      ring.classList.remove('clicking');
    });

    // Hide when leaving window
    document.addEventListener('mouseleave', () => {
      gsap.to([dot, ring], { opacity: 0, duration: 0.2 });
    });
    document.addEventListener('mouseenter', () => {
      gsap.to([dot, ring], { opacity: 1, duration: 0.2 });
    });
  }

  // ============================================================
  // 4. HERO SECTION SEQUENCE
  // ============================================================
  function initHeroSequence() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Header slide down
    tl.fromTo('.header',
      { y: -80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6 }
    );

    // Hero badge
    tl.fromTo('#heroBadge',
      { y: 20, opacity: 0, scale: 0.85 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' },
      '-=0.2'
    );

    // Hero title words stagger
    tl.fromTo('.hero-word',
      { y: 40, opacity: 0, skewX: -4 },
      { y: 0, opacity: 1, skewX: 0, duration: 0.65, stagger: 0.12, ease: 'power3.out' },
      '-=0.2'
    );

    // Hero description
    tl.fromTo('#heroDesc',
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 },
      '-=0.3'
    );

    // Hero buttons
    tl.fromTo('.hero-actions .cta-btn',
      { y: 20, opacity: 0, scale: 0.92 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.5)' },
      '-=0.3'
    );

    // Stats counters
    tl.fromTo('.hero-stats .stat',
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.1 },
      '-=0.2'
    );

    // Hero illustration
    tl.fromTo('.hero-illustration',
      { scale: 0.7, opacity: 0, rotation: -8 },
      { scale: 1, opacity: 1, rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.6)' },
      '-=0.8'
    );

    // Floating cards
    tl.fromTo('.hero-card-1',
      { x: -40, opacity: 0, rotation: -10 },
      { x: 0, opacity: 1, rotation: 0, duration: 0.7, ease: 'back.out(2)' },
      '-=0.5'
    );
    tl.fromTo('.hero-card-2',
      { x: 40, opacity: 0, rotation: 10 },
      { x: 0, opacity: 1, rotation: 0, duration: 0.7, ease: 'back.out(2)' },
      '-=0.6'
    );

    // Blob background parallax on mouse move
    initHeroParallax();

    // Animated counters (trigger when stats in view)
    initCounters();
  }

  // ============================================================
  // 5. HERO PARALLAX ON MOUSE MOVE
  // ============================================================
  function initHeroParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    let isThrottled = false;
    hero.addEventListener('mousemove', (e) => {
      if (isThrottled) return;
      isThrottled = true;
      requestAnimationFrame(() => { isThrottled = false; });

      const rect = hero.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width - 0.5;
      const cy = (e.clientY - rect.top) / rect.height - 0.5;

      gsap.to('.hero-blob-1', { x: cx * 30, y: cy * 20, duration: 1.2, ease: 'power2.out' });
      gsap.to('.hero-blob-2', { x: cx * -20, y: cy * 15, duration: 1.5, ease: 'power2.out' });
      gsap.to('.hero-blob-3', { x: cx * 15, y: cy * -10, duration: 1, ease: 'power2.out' });
      gsap.to('.hero-illustration', { rotationY: cx * 8, rotationX: -cy * 5, duration: 0.8, ease: 'power2.out', transformPerspective: 800 });
    });
  }

  // ============================================================
  // 6. ANIMATED COUNTERS
  // ============================================================
  function initCounters() {
    const statNums = document.querySelectorAll('.stat-num[data-count]');
    if (!statNums.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target  = parseInt(el.dataset.count, 10);
        const suffix  = el.dataset.suffix || '';
        const isLarge = target >= 1000;

        observer.unobserve(el);

        gsap.fromTo({ val: 0 }, { val: target }, {
          duration: isLarge ? 2 : 1.2,
          ease: 'power2.out',
          onUpdate: function () {
            const v = Math.round(this.targets()[0].val);
            el.textContent = isLarge ? v.toLocaleString() + suffix : v + suffix;
          },
          onComplete: () => {
            el.classList.add('counted');
            // Final value
            if (target >= 1000) el.textContent = (target / 1000).toFixed(0) + ',' + '000' + suffix;
          }
        });
      });
    }, { threshold: 0.5 });

    statNums.forEach(el => observer.observe(el));
  }

  // ============================================================
  // 7. SCROLL-TRIGGERED SECTION REVEALS
  // ============================================================
  function initScrollAnimations() {
    // Section badges & titles
    gsap.utils.toArray('.section-badge').forEach(el => {
      gsap.fromTo(el,
        { y: 20, opacity: 0, scale: 0.9 },
        {
          y: 0, opacity: 1, scale: 1, duration: 0.5,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        }
      );
    });

    gsap.utils.toArray('.section-title').forEach(el => {
      gsap.fromTo(el,
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.65, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        }
      );
    });

    gsap.utils.toArray('.section-desc').forEach(el => {
      gsap.fromTo(el,
        { y: 20, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, delay: 0.1,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        }
      );
    });

    // Specialty cards – staggered cascade
    ScrollTrigger.create({
      trigger: '#specialtiesGrid',
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.fromTo('.specialty-card',
          { y: 40, opacity: 0, scale: 0.9, rotation: -2 },
          { y: 0, opacity: 1, scale: 1, rotation: 0,
            duration: 0.55, stagger: 0.06, ease: 'back.out(1.4)' }
        );
      }
    });

    // Doctor cards – horizontal slide
    ScrollTrigger.create({
      trigger: '#doctorsGrid',
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.fromTo('.doctor-card',
          { y: 50, opacity: 0, scale: 0.88 },
          { y: 0, opacity: 1, scale: 1,
            duration: 0.6, stagger: 0.1, ease: 'power3.out' }
        );
      }
    });

    // Why cards – flip in
    ScrollTrigger.create({
      trigger: '.why-grid',
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.fromTo('.why-card',
          { y: 45, opacity: 0, rotationX: 12 },
          { y: 0, opacity: 1, rotationX: 0,
            duration: 0.65, stagger: 0.1, ease: 'back.out(1.5)',
            transformPerspective: 600 }
        );
      }
    });

    // Footer brand
    gsap.fromTo('.footer-brand',
      { x: -40, opacity: 0 },
      {
        x: 0, opacity: 1, duration: 0.65,
        scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true }
      }
    );

    gsap.fromTo('.footer-col',
      { y: 30, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.5, stagger: 0.08,
        scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true }
      }
    );
  }

  // ============================================================
  // 8. MAGNETIC BUTTONS
  // ============================================================
  function initMagneticButtons() {
    const btns = document.querySelectorAll('.cta-primary, .cta-secondary, .header-cta');

    btns.forEach(btn => {
      btn.classList.add('magnetic-btn');

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) * 0.35;
        const dy = (e.clientY - cy) * 0.35;
        gsap.to(btn, { x: dx, y: dy, duration: 0.35, ease: 'power2.out' });
      });

      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }

  // ============================================================
  // 9. RIPPLE EFFECT ON BUTTONS
  // ============================================================
  function initRipple() {
    const rippleBtns = document.querySelectorAll(
      '.cta-primary, .cta-secondary, .doctor-book-btn, .chat-specialty-btn, .bottom-nav-fab'
    );

    function addRipple(e) {
      const btn = e.currentTarget;
      btn.classList.add('ripple-container');
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const wave = document.createElement('span');
      wave.className = 'ripple-wave';
      wave.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${e.clientX - rect.left - size / 2}px;
        top: ${e.clientY - rect.top - size / 2}px;
      `;
      btn.appendChild(wave);
      wave.addEventListener('animationend', () => wave.remove());
    }

    rippleBtns.forEach(btn => btn.addEventListener('click', addRipple));

    // Also ripple on dynamically added buttons (chat panel)
    document.getElementById('chatMessages')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.chat-specialty-btn, .doctor-book-btn, .chat-slot');
      if (btn) addRipple({ currentTarget: btn, clientX: e.clientX, clientY: e.clientY });
    });
  }

  // ============================================================
  // 10. QUICK REPLY CHIPS – stagger on open
  // ============================================================
  function animateQuickChips() {
    const chips = document.querySelectorAll('.quick-chip');
    chips.forEach((chip, i) => {
      chip.style.animationDelay = `${i * 0.06}s`;
      chip.classList.add('visible');
    });
  }

  // Observe quickReplies container for new chips
  const quickRepliesEl = document.getElementById('quickReplies');
  if (quickRepliesEl) {
    const mutObs = new MutationObserver(() => {
      setTimeout(animateQuickChips, 50);
    });
    mutObs.observe(quickRepliesEl, { childList: true });
  }

  // ============================================================
  // 11. CHAT PANEL – GSAP open/close (non-destructive)
  // ============================================================
  function enhanceChatPanel() {
    const chatPanel  = document.getElementById('chatPanel');
    const chatBubble = document.getElementById('chatBubble');
    if (!chatPanel) return;

    let isAnimating = false;

    const panelObserver = new MutationObserver(() => {
      // Kill any in-flight tweens first
      gsap.killTweensOf(chatPanel);

      if (chatPanel.classList.contains('open')) {
        // OPEN: spring in, then CLEAR inline styles so CSS close transition works
        isAnimating = true;
        gsap.fromTo(chatPanel,
          { scale: 0.88, opacity: 0, transformOrigin: 'bottom right' },
          {
            scale: 1, opacity: 1, duration: 0.48, ease: 'back.out(1.4)',
            onComplete: () => {
              // ⚠️ Critical: clear GSAP inline styles after open animation
              // so CSS `.chat-panel` transition can handle the close smoothly
              gsap.set(chatPanel, { clearProps: 'transform,opacity,scale' });
              isAnimating = false;
            }
          }
        );
        // Chat bubble wiggle on open
        if (chatBubble) {
          gsap.fromTo(chatBubble,
            { rotation: 0 },
            { rotation: 18, duration: 0.13, yoyo: true, repeat: 3, ease: 'power1.inOut' }
          );
        }
      } else {
        // CLOSE: ensure all GSAP inline styles are removed
        // so CSS transition (translateY + opacity) plays correctly
        gsap.set(chatPanel, { clearProps: 'all' });
      }
    });

    panelObserver.observe(chatPanel, { attributes: true, attributeFilter: ['class'] });
  }


  // ============================================================
  // 12. MESSAGE APPEAR – enhanced per-message GSAP
  // ============================================================
  function initMessageAnimations() {
    const msgContainer = document.getElementById('chatMessages');
    if (!msgContainer) return;

    const msgObserver = new MutationObserver((mutations) => {
      mutations.forEach((mut) => {
        mut.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          const isBot  = node.classList?.contains('msg-bot');
          const isUser = node.classList?.contains('msg-user');
          const isTyping = node.id === 'typingIndicator';

          if (isBot) {
            gsap.fromTo(node,
              { x: -20, opacity: 0, scale: 0.94 },
              { x: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
            );
          } else if (isUser) {
            gsap.fromTo(node,
              { x: 20, opacity: 0, scale: 0.94 },
              { x: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.5)' }
            );
          } else if (isTyping) {
            gsap.fromTo(node,
              { x: -15, opacity: 0 },
              { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
            );
          }
        });
      });
    });

    msgObserver.observe(msgContainer, { childList: true });
  }

  // ============================================================
  // 13. HEADER – tint on scroll (smooth)
  // ============================================================
  function initHeaderScroll() {
    const header = document.querySelector('.header');
    if (!header) return;

    ScrollTrigger.create({
      start: 'top -60',
      onUpdate: (self) => {
        if (self.progress > 0) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
    });
  }

  // ============================================================
  // 14. WHY SECTION – tilt on hover (3D card)
  // ============================================================
  function initWhyCardTilt() {
    document.querySelectorAll('.why-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const cx = (e.clientX - rect.left) / rect.width - 0.5;
        const cy = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotationY: cx * 12,
          rotationX: -cy * 10,
          duration: 0.4,
          ease: 'power2.out',
          transformPerspective: 600,
        });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }

  // ============================================================
  // 15. SPECIALTY CARDS – 3D tilt
  // ============================================================
  function initSpecialtyTilt() {
    // Applied after cards are rendered
    function attachTilt() {
      document.querySelectorAll('.specialty-card').forEach(card => {
        if (card.dataset.tiltInit) return;
        card.dataset.tiltInit = '1';
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const cx = (e.clientX - rect.left) / rect.width - 0.5;
          const cy = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(card, {
            rotationY: cx * 15,
            rotationX: -cy * 12,
            duration: 0.3,
            ease: 'power2.out',
            transformPerspective: 500,
          });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        });
      });
    }

    // Run after initial render + on grid re-render
    const grid = document.getElementById('specialtiesGrid');
    if (grid) {
      const obs = new MutationObserver(attachTilt);
      obs.observe(grid, { childList: true });
    }
    setTimeout(attachTilt, 800);
  }

  // ============================================================
  // 16. SMOOTH SCROLL NAV INDICATOR
  // ============================================================
  function initNavHighlight() {
    const sections = ['hero', 'specialties', 'doctors', 'why'];
    const navLinks = {
      hero: document.getElementById('nav-home'),
      specialties: document.getElementById('nav-specialties'),
      doctors: document.getElementById('nav-doctors'),
      why: document.getElementById('nav-booking'),
    };

    sections.forEach(id => {
      const section = document.getElementById(id);
      if (!section) return;
      ScrollTrigger.create({
        trigger: section,
        start: 'top 60%',
        end: 'bottom 60%',
        onEnter: () => highlightNav(id),
        onEnterBack: () => highlightNav(id),
      });
    });

    function highlightNav(activeId) {
      Object.values(navLinks).forEach(link => {
        if (link) link.style.color = '';
      });
      if (navLinks[activeId]) {
        navLinks[activeId].style.color = 'var(--vin-teal)';
      }
    }
  }

  // ============================================================
  // 17. LOGO HOVER SPIN
  // ============================================================
  function initLogoAnim() {
    const logoIcon = document.querySelector('.logo-icon svg');
    if (!logoIcon) return;
    document.querySelector('.logo')?.addEventListener('mouseenter', () => {
      gsap.fromTo(logoIcon,
        { rotation: 0 },
        { rotation: 360, duration: 0.6, ease: 'power2.inOut' }
      );
    });
  }

  // ============================================================
  // INIT ALL
  // ============================================================
  function init() {
    initPageLoader();
    initScrollProgress();
    initCursor();
    initScrollAnimations();
    initMagneticButtons();
    initRipple();
    enhanceChatPanel();
    initMessageAnimations();
    initHeaderScroll();
    initLogoAnim();
    initNavHighlight();

    // Delay tilt effects for performance
    setTimeout(() => {
      initWhyCardTilt();
      initSpecialtyTilt();
    }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
