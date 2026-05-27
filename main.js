/* ============================================
   QUALIMATIC PRODUCTION — main.js
   ============================================ */

(function () {
  'use strict';

  /* ----- I18N translations ----- */
  const I18N = {
    fr: {
      'nav.home': 'ACCUEIL', 'nav.about': 'À PROPOS', 'nav.wedding': 'MARIAGE',
      'nav.culinary': 'CULINAIRE', 'nav.corporate': 'CORPORATE', 'nav.blog': 'BLOG', 'nav.contact': 'CONTACT',
      'cta.book': 'RÉSERVEZ UN APPEL'
    },
    en: {
      'nav.home': 'HOME', 'nav.about': 'ABOUT', 'nav.wedding': 'WEDDING',
      'nav.culinary': 'CULINARY', 'nav.corporate': 'CORPORATE', 'nav.blog': 'JOURNAL', 'nav.contact': 'CONTACT',
      'cta.book': 'BOOK A CALL'
    }
  };

  /* ----- Preloader ----- */
  function runPreloader() {
    const pre = document.querySelector('.preloader');
    if (!pre) return;
    if (sessionStorage.getItem('qm_preloaded') === '1') {
      pre.classList.add('hidden');
      setTimeout(() => pre.remove(), 500);
      return;
    }
    const slogan = pre.querySelector('.preloader__slogan');
    const text = slogan.dataset.text || '';
    let i = 0;
    slogan.innerHTML = '<span class="preloader__cursor"></span>';
    const cursor = slogan.querySelector('.preloader__cursor');
    const tick = () => {
      if (i < text.length) {
        slogan.insertBefore(document.createTextNode(text[i]), cursor);
        i++;
        setTimeout(tick, 32 + Math.random() * 28);
      }
    };
    setTimeout(tick, 500);
    setTimeout(() => {
      pre.classList.add('hidden');
      sessionStorage.setItem('qm_preloaded', '1');
      setTimeout(() => pre.remove(), 500);
    }, 2400);
  }

  /* ----- Sticky header ----- */
  function initStickyHeader() {
    const header = document.querySelector('.header');
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ----- Mobile menu ----- */
  function initBurger() {
    const burger = document.querySelector('.burger');
    const menu = document.querySelector('.mobile-menu');
    if (!burger || !menu) return;
    const toggle = () => {
      const open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', toggle);
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
    }));
  }

  /* ----- Lang selector (anchor links — no JS navigation, just visual sync) ----- */
  function initLang() {
    // Sync active state with current document lang (FR/EN folders)
    const links = document.querySelectorAll('.lang .lang-link[data-lang]');
    if (!links.length) return;
    const docLang = (document.documentElement.lang || 'fr').toLowerCase().slice(0, 2);
    links.forEach(a => {
      const isActive = (a.dataset.lang === docLang);
      a.classList.toggle('active', isActive);
      if (isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* ----- Fade-in observer ----- */
  function initFadeIn() {
    const els = document.querySelectorAll('.fade-in');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, idx) => {
        if (e.isIntersecting) {
          const delay = parseInt(e.target.dataset.delay || '0', 10);
          setTimeout(() => e.target.classList.add('is-visible'), delay);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    els.forEach(el => io.observe(el));
  }

  /* ----- Parallax on .parallax imgs ----- */
  function initParallax() {
    const items = document.querySelectorAll('[data-parallax]');
    if (!items.length) return;
    let ticking = false;
    const update = () => {
      items.forEach(el => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2 - window.innerHeight / 2;
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        el.style.transform = `translate3d(0, ${center * speed * -1}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  /* ----- Init ----- */
  
  /* ----- Footer Zones — mobile accordion ----- */
  function initFooterZonesAccordion() {
    if (window.matchMedia('(min-width: 769px)').matches) return;
    document.querySelectorAll('.footer__col--zones h6').forEach(h => {
      const ul = h.nextElementSibling;
      if (!ul || ul.tagName !== 'UL') return;
      h.style.cursor = 'pointer';
      h.addEventListener('click', () => {
        h.classList.toggle('is-open');
      });
    });
  }

document.addEventListener('DOMContentLoaded', () => {
    runPreloader();
    initStickyHeader();
    initBurger();
    initLang();
    initFadeIn();
    initParallax();
    initFooterZonesAccordion();
  });
})();
