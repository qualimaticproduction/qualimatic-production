/* ============================================
   QUALIMATIC POSES — swiper.js
   Défilement plein écran d'une photo à l'autre (au doigt).
   Utilise le défilement natif du navigateur (scroll-snap) : fluide sur iPhone.
   ============================================ */

import { thumbUrl, fullUrl } from '../store.js';

/* track : élément qui défile ; ids : poses à afficher ;
   extraHtml : diapositive finale facultative (fin de séance) */
export function mountSwiper(track, ids, { start = 0, onChange, extraHtml = '' }) {
  track.innerHTML = ids.map((id, i) => `
    <div class="slide" data-i="${i}"><img class="slide-img" alt="" draggable="false"></div>`).join('')
    + (extraHtml ? `<div class="slide slide-extra" data-i="${ids.length}">${extraHtml}</div>` : '');

  const slides = [...track.children];
  const total = slides.length;
  const fulls = new Map(); // index → adresse de la photo plein format
  let current = -1;
  let destroyed = false;

  async function load(i) {
    if (i < 0 || i >= ids.length || fulls.has(i)) return;
    fulls.set(i, null);
    const img = slides[i].querySelector('img');
    if (!img.getAttribute('src')) img.src = await thumbUrl(ids[i]); // vignette tout de suite
    const url = await fullUrl(ids[i]);
    if (destroyed || !fulls.has(i)) { URL.revokeObjectURL(url); return; }
    fulls.set(i, url);
    const pre = new Image();
    pre.src = url;
    try { await pre.decode(); } catch (e) { /* ignoré */ }
    if (fulls.get(i) === url) img.src = url;
  }

  async function release(i) {
    const url = fulls.get(i);
    fulls.delete(i);
    if (url) {
      slides[i].querySelector('img').src = await thumbUrl(ids[i]);
      URL.revokeObjectURL(url);
    }
  }

  function update() {
    const w = track.clientWidth || 1;
    const i = Math.max(0, Math.min(total - 1, Math.round(track.scrollLeft / w)));
    if (i === current) return;
    current = i;
    [i, i + 1, i - 1].forEach(load);
    [...fulls.keys()].forEach((j) => { if (Math.abs(j - i) > 2) release(j); });
    onChange && onChange(i);
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  };
  // après une rotation de l'écran, on reste sur la même photo
  const onResize = () => { track.scrollLeft = current * track.clientWidth; };

  track.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  function goTo(i, smooth = true) {
    i = Math.max(0, Math.min(total - 1, i));
    track.scrollTo({ left: i * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  }

  // position de départ
  requestAnimationFrame(() => {
    track.scrollLeft = start * track.clientWidth;
    update();
  });

  return {
    goTo,
    get index() { return current; },
    total,
    destroy() {
      destroyed = true;
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      [...fulls.values()].forEach((u) => u && URL.revokeObjectURL(u));
      fulls.clear();
    }
  };
}

/* Suit la hauteur du panneau des consignes pour que la photo reste visible au-dessus */
export function trackPanelHeight(root, panel) {
  const ro = new ResizeObserver(() => root.style.setProperty('--panel-h', `${panel.offsetHeight}px`));
  ro.observe(panel);
  return () => ro.disconnect();
}

/* Glisser horizontalement sur un autre élément (ex. le panneau des consignes) */
export function addSwipe(el, onSwipe) {
  let x0 = null;
  let y0 = null;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
  }, { passive: true });
}

/* Les consignes d'une pose, réutilisées dans la visionneuse et le mode tournage */
export function detailsHtml(p, esc) {
  const rows = [
    ['Personne 1', p.p1],
    ['Personne 2', p.p2],
    ['Caméra', p.camera],
    ['Accessoire', p.accessory],
    ['Lumière', p.light],
    ['Notes', p.notes]
  ].filter(([, v]) => v && String(v).trim());
  if (!rows.length) return '<p class="detail-empty">Aucune consigne pour cette pose.</p>';
  return `<dl class="details">${rows.map(([k, v]) => `
    <div class="detail"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}
