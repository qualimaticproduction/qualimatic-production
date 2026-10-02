/* ============================================
   QUALIMATIC POSES — Mode tournage
   Plein écran, texte lisible au soleil, « Fait », compteur,
   écran maintenu allumé, et vue « photo seule » pour les mariés.
   ============================================ */

import { state, getSession, getPose, saveSession } from '../store.js';
import { esc, icon, title } from '../ui.js';
import { mountSwiper, addSwipe, detailsHtml, trackPanelHeight } from './swiper.js';
import { back } from '../nav.js';

export function render(view, { id, index }) {
  const s = getSession(id);
  if (!s) { back('#/seances'); return; }
  const items = s.items.filter((it) => getPose(it.poseId));
  if (!items.length) { back(`#/seance/${id}`); return; }
  const ids = items.map((it) => it.poseId);
  const firstTodo = items.findIndex((it) => !it.done);
  const start = index !== undefined ? Math.min(+index, items.length - 1) : Math.max(0, firstTodo);

  view.innerHTML = `
    <div class="shoot text-${state.prefs.shootText}" id="shoot">
      <div class="shoot-progress"><span id="bar"></span></div>
      <div class="swiper" id="track"></div>
      <header class="viewer-top shoot-top">
        <button type="button" class="icon-btn on-dark" id="close" aria-label="Quitter le tournage">${icon('close')}</button>
        <span class="shoot-count" id="count"></span>
        <button type="button" class="pill on-dark" id="clean">${icon('eyeOff')}Photo seule</button>
      </header>
      <button type="button" class="pill on-dark shoot-restore" id="restore" aria-label="Afficher les consignes">${icon('eye')}</button>
      <section class="panel shoot-panel open" id="panel">
        <div class="panel-head shoot-head">
          <button type="button" class="panel-heading" id="toggle" aria-expanded="true">
            <span class="grabber" aria-hidden="true"></span>
            <span class="kicker" id="cat"></span>
            <span class="panel-title" id="ttl"></span>
          </button>
          <button type="button" class="btn btn-done" id="done">${icon('check')}<span>Fait</span></button>
        </div>
        <div class="panel-body" id="body"></div>
      </section>
    </div>`;

  const $ = (q) => view.querySelector(q);
  const root = $('#shoot');
  let current = start;

  const doneCount = () => items.filter((it) => it.done).length;

  const endHtml = () => `
    <div class="shoot-end">
      ${title('Séance terminée', 'h2')}
      <p class="shoot-end-count" id="endCount"></p>
      <div class="dialog-stack">
        <button type="button" class="btn btn-light" data-end="todo">Revoir les poses restantes</button>
        <button type="button" class="btn btn-ghost on-dark" data-end="quit">Revenir au déroulé</button>
      </div>
    </div>`;

  const refreshProgress = () => {
    const d = doneCount();
    $('#bar').style.width = `${(d / items.length) * 100}%`;
    const end = view.querySelector('#endCount');
    if (end) end.textContent = `${d} pose${d > 1 ? 's' : ''} faite${d > 1 ? 's' : ''} sur ${items.length}`;
  };

  const show = (i) => {
    current = i;
    const atEnd = i >= items.length;
    root.classList.toggle('at-end', atEnd);
    history.replaceState(null, '', `#/seance/${id}/tournage/${Math.min(i, items.length - 1)}`);
    if (atEnd) { $('#count').textContent = 'Fin'; refreshProgress(); return; }
    const p = getPose(ids[i]);
    $('#count').textContent = `${i + 1} / ${items.length}`;
    $('#cat').textContent = p.category || 'Sans catégorie';
    $('#ttl').textContent = p.title || 'Sans titre';
    $('#body').innerHTML = detailsHtml(p, esc);
    $('#body').scrollTop = 0;
    $('#done').classList.toggle('is-done', !!items[i].done);
    refreshProgress();
  };

  const swiper = mountSwiper($('#track'), ids, { start, onChange: show, extraHtml: endHtml() });
  addSwipe($('#panel'), (dir) => swiper.goTo(current + dir));
  const untrack = trackPanelHeight(root, $('#panel'));

  $('#done').onclick = async () => {
    const it = items[current];
    if (!it) return;
    it.done = !it.done;
    $('#done').classList.toggle('is-done', it.done);
    refreshProgress();
    await saveSession(s);
    // pose faite : on passe à la suivante
    if (it.done) setTimeout(() => { if (current === items.indexOf(it)) swiper.goTo(current + 1); }, 450);
  };

  $('#toggle').onclick = () => {
    const open = !$('#panel').classList.contains('open');
    $('#panel').classList.toggle('open', open);
    $('#toggle').setAttribute('aria-expanded', open);
  };

  // « Photo seule » : on masque tout pour montrer la photo aux mariés
  const setClean = (on) => root.classList.toggle('clean', on);
  $('#clean').onclick = () => setClean(true);
  $('#restore').onclick = () => setClean(false);

  $('#close').onclick = () => back(`#/seance/${id}`);
  view.querySelector('.shoot-end').addEventListener('click', (e) => {
    const b = e.target.closest('[data-end]');
    if (!b) return;
    if (b.dataset.end === 'quit') back(`#/seance/${id}`);
    else {
      const next = items.findIndex((it) => !it.done);
      swiper.goTo(next >= 0 ? next : 0);
    }
  });

  // garder l'écran allumé (si l'iPhone le permet)
  const wake = keepAwake();

  return () => { swiper.destroy(); wake.release(); untrack(); };
}

function keepAwake() {
  let lock = null;
  let active = true;
  const request = async () => {
    if (!active || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try {
      lock = await navigator.wakeLock.request('screen');
    } catch (e) { /* non disponible : l'écran suivra le réglage de verrouillage auto */ }
  };
  const onVisible = () => { if (document.visibilityState === 'visible') request(); };
  document.addEventListener('visibilitychange', onVisible);
  request();
  return {
    release() {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
      if (lock) lock.release().catch(() => {});
    }
  };
}
