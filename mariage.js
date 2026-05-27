/* ============================================
   QUALIMATIC PRODUCTION — Mariage page logic
   ============================================ */
(function () {
  'use strict';

  /* ----- Sound toggle ----- */
  function initSoundToggle() {
    const btn = document.querySelector('[data-sound-toggle]');
    const vid = document.querySelector('.hero-video video');
    if (!btn || !vid) return;
    btn.addEventListener('click', () => {
      vid.muted = !vid.muted;
      const muted = vid.muted;
      btn.querySelector('[data-state]').textContent = muted ? (btn.dataset.lang === 'en' ? 'TURN ON SOUND' : 'ACTIVER LE SON') : (btn.dataset.lang === 'en' ? 'MUTE' : 'COUPER LE SON');
      btn.querySelector('[data-icon]').innerHTML = muted ? '🔇' : '🔊';
    });
  }

  /* ----- Swipe before/after ----- */
  function initSwipe() {
    const c = document.querySelector('.swipe-container');
    if (!c) return;
    const after = c.querySelector('.swipe-after');
    const slider = c.querySelector('.swipe-slider');
    let dragging = false;

    const setPos = (x) => {
      const rect = c.getBoundingClientRect();
      let pct = ((x - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      after.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      slider.style.left = pct + '%';
    };

    const onDown = (e) => { dragging = true; const x = e.touches ? e.touches[0].clientX : e.clientX; setPos(x); e.preventDefault(); };
    const onMove = (e) => { if (!dragging) return; const x = e.touches ? e.touches[0].clientX : e.clientX; setPos(x); };
    const onUp = () => { dragging = false; };

    c.addEventListener('mousedown', onDown);
    c.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  }

  /* ----- Lightbox YouTube ----- */
  function initLightbox() {
    const lb = document.querySelector('.lightbox');
    if (!lb) return;
    const frame = lb.querySelector('iframe');
    const close = lb.querySelector('.lightbox__close');
    document.querySelectorAll('[data-yt]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const id = el.dataset.yt;
        frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&showinfo=0`;
        lb.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      });
    });
    const closeFn = () => {
      lb.classList.remove('is-open');
      frame.src = '';
      document.body.style.overflow = '';
    };
    close.addEventListener('click', closeFn);
    lb.addEventListener('click', (e) => { if (e.target === lb) closeFn(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFn(); });
  }

  /* ----- FAQ accordion ----- */
  function initFaq() {
    document.querySelectorAll('.faq-item').forEach(item => {
      const btn = item.querySelector('.faq-item__btn');
      const panel = item.querySelector('.faq-item__panel');
      btn.addEventListener('click', () => {
        const open = item.classList.toggle('is-open');
        if (open) {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        } else {
          panel.style.maxHeight = '0';
        }
      });
    });
  }

  /* ----- Inspiration carousel (coverflow) ----- */
  function initInspirationCarousel() {
    const stage = document.querySelector('.inspi-stage');
    if (!stage) return;
    const track = stage.querySelector('.inspi-track');
    const cards = Array.from(track.querySelectorAll('.inspi-card'));
    const prevBtn = stage.querySelector('.inspi-arrow--prev');
    const nextBtn = stage.querySelector('.inspi-arrow--next');
    const counter = stage.querySelector('[data-current]');
    const total = stage.querySelector('[data-total]');
    const barFill = stage.querySelector('.inspi-bar__fill');
    const n = cards.length;
    if (!n) return;
    if (total) total.textContent = String(n);
    let active = 0;

    function layout() {
      cards.forEach((card, i) => {
        let diff = i - active;
        if (diff > n / 2) diff -= n;
        if (diff < -n / 2) diff += n;
        if (Math.abs(diff) <= 2) {
          card.setAttribute('data-pos', String(diff));
        } else {
          card.setAttribute('data-pos', 'hidden');
        }
        card.setAttribute('aria-selected', diff === 0 ? 'true' : 'false');
      });
      if (counter) counter.textContent = String(active + 1);
      if (barFill) {
        const pct = (active + 1) / n;
        barFill.style.transform = `scaleX(${pct})`;
      }
    }

    function go(delta) {
      active = (active + delta + n) % n;
      layout();
    }
    function jumpTo(i) {
      active = ((i % n) + n) % n;
      layout();
    }

    if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(1));

    // Click any card → bring to center; if center clicked → open lightbox
    cards.forEach((card, i) => {
      card.addEventListener('click', (e) => {
        if (i !== active) { jumpTo(i); return; }
        // center clicked: open YouTube lightbox if available
        const yt = card.getAttribute('data-yt');
        const lb = document.getElementById('lightbox');
        const frame = document.getElementById('lightbox-frame');
        if (yt && lb && frame) {
          frame.src = `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1`;
          lb.classList.add('is-open');
          lb.setAttribute('aria-hidden', 'false');
        }
        e.stopPropagation();
      });
    });

    // Keyboard
    stage.setAttribute('tabindex', '0');
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    });

    // Drag / swipe
    let startX = 0, dragging = false, moved = 0;
    function onDown(x) { dragging = true; startX = x; moved = 0; track.classList.add('is-dragging'); }
    function onMove(x) { if (!dragging) return; moved = x - startX; }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      const threshold = 60;
      if (moved < -threshold) go(1);
      else if (moved > threshold) go(-1);
    }
    track.addEventListener('mousedown', (e) => onDown(e.clientX));
    window.addEventListener('mousemove', (e) => onMove(e.clientX));
    window.addEventListener('mouseup', onUp);
    track.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX), { passive: true });
    track.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
    track.addEventListener('touchend', onUp);

    // Auto-advance (pauses on hover)
    let autoplay = setInterval(() => go(1), 6000);
    stage.addEventListener('mouseenter', () => clearInterval(autoplay));
    stage.addEventListener('mouseleave', () => { autoplay = setInterval(() => go(1), 6000); });

    layout();
  }

  /* ----- Pre-select formule from URL ----- */
  function initFormulePreselect() {
    const params = new URLSearchParams(window.location.search);
    const f = params.get('formule');
    if (!f) return;
    const select = document.querySelector('select[name="formule"]');
    if (!select) return;
    Array.from(select.options).forEach(opt => {
      if (opt.value.toLowerCase() === f.toLowerCase()) opt.selected = true;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initSoundToggle();
    initSwipe();
    initLightbox();
    initFaq();
    initInspirationCarousel();
    initFormulePreselect();
  });
})();
