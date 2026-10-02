/* ============================================
   QUALIMATIC POSES — Visionneuse plein écran (swipe entre les poses)
   ============================================ */

import { state, getPose, filterPoses, toggleFav, removePose, addPosesToSession, createSession } from '../store.js';
import { esc, icon, toast, choiceDialog, confirmDialog, formDialog, formatDate, todayIso } from '../ui.js';
import { mountSwiper, addSwipe, detailsHtml, trackPanelHeight } from './swiper.js';
import { go, back } from '../nav.js';

let panelOpen = false; // l'état du panneau est conservé d'une pose à l'autre

export function render(view, { id }) {
  // on fait défiler la sélection actuelle du catalogue (ou tout le catalogue)
  let list = filterPoses();
  if (!list.some((p) => p.id === id)) list = state.poses;
  const ids = list.map((p) => p.id);
  const start = Math.max(0, ids.indexOf(id));
  if (!ids.length) { back('#/catalogue'); return; }

  view.innerHTML = `
    <div class="viewer">
      <div class="swiper" id="track"></div>
      <header class="viewer-top">
        <button type="button" class="icon-btn on-dark" id="close" aria-label="Fermer">${icon('close')}</button>
        <span class="viewer-count" id="count"></span>
        <div class="viewer-actions">
          <button type="button" class="icon-btn on-dark" id="fav" aria-label="Favori">${icon('heart')}</button>
          <button type="button" class="icon-btn on-dark" id="edit" aria-label="Modifier">${icon('edit')}</button>
          <button type="button" class="icon-btn on-dark" id="more" aria-label="Plus d’options">${icon('more')}</button>
        </div>
      </header>
      <section class="panel ${panelOpen ? 'open' : ''}" id="panel">
        <button type="button" class="panel-head" id="toggle" aria-expanded="${panelOpen}">
          <span class="grabber" aria-hidden="true"></span>
          <span class="panel-heading">
            <span class="kicker" id="cat"></span>
            <span class="panel-title" id="ttl"></span>
          </span>
          <span class="panel-chevron">${icon('up')}</span>
        </button>
        <div class="panel-body" id="body"></div>
      </section>
    </div>`;

  const $ = (s) => view.querySelector(s);
  let pose = null;

  const show = (i) => {
    pose = getPose(ids[i]);
    if (!pose) return;
    history.replaceState(null, '', `#/pose/${pose.id}`);
    $('#count').textContent = `${i + 1} / ${ids.length}`;
    $('#cat').textContent = pose.category || 'Sans catégorie';
    $('#ttl').textContent = pose.title || 'Sans titre';
    $('#body').innerHTML = detailsHtml(pose, esc);
    $('#fav').classList.toggle('active', !!pose.fav);
  };

  const swiper = mountSwiper($('#track'), ids, { start, onChange: show });
  addSwipe($('#panel'), (dir) => swiper.goTo(swiper.index + dir));
  const untrack = trackPanelHeight($('.viewer'), $('#panel'));

  $('#toggle').onclick = () => {
    panelOpen = !panelOpen;
    $('#panel').classList.toggle('open', panelOpen);
    $('#toggle').setAttribute('aria-expanded', panelOpen);
  };
  $('#close').onclick = () => back('#/catalogue');
  $('#edit').onclick = () => go(`#/pose/${pose.id}/modifier`);
  $('#fav').onclick = async () => {
    const on = await toggleFav(pose.id);
    $('#fav').classList.toggle('active', on);
    toast(on ? 'Ajoutée aux favoris' : 'Retirée des favoris');
  };
  $('#more').onclick = async () => {
    const choice = await choiceDialog({
      heading: pose.title || 'Cette pose',
      options: [
        { label: 'Ajouter à une séance', value: 'session', style: '' },
        { label: 'Modifier la fiche', value: 'edit' },
        { label: 'Supprimer la pose', value: 'delete', style: 'btn-quiet danger' }
      ]
    });
    if (choice === 'edit') go(`#/pose/${pose.id}/modifier`);
    if (choice === 'session') await addToSession(pose.id);
    if (choice === 'delete') {
      const ok = await confirmDialog({ heading: 'Supprimer cette pose', text: 'La photo et sa fiche seront effacées de l’appli, et retirées des séances.', ok: 'Supprimer', danger: true });
      if (ok) {
        await removePose(pose.id);
        toast('Pose supprimée');
        back('#/catalogue');
      }
    }
  };

  return () => { swiper.destroy(); untrack(); };
}

/* Choisir une séance (ou en créer une) pour y ajouter une pose */
export async function addToSession(poseId) {
  const sessions = [...state.sessions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const choice = await choiceDialog({
    heading: 'Ajouter à une séance',
    options: [
      ...sessions.map((s) => ({ label: `${s.name}${s.date ? ' · ' + formatDate(s.date, { day: 'numeric', month: 'short' }) : ''}`, value: s.id })),
      { label: 'Nouvelle séance', value: '__new', style: '' }
    ]
  });
  if (!choice) return;
  let sessionId = choice;
  if (choice === '__new') {
    const v = await formDialog({
      heading: 'Nouvelle séance',
      fields: [
        { name: 'name', label: 'Nom', placeholder: 'Mariage Claire & Hugo', required: true },
        { name: 'date', label: 'Date', type: 'date', value: todayIso() },
        { name: 'place', label: 'Lieu', placeholder: 'Château de…' }
      ],
      ok: 'Créer'
    });
    if (!v) return;
    sessionId = (await createSession(v)).id;
  }
  await addPosesToSession(sessionId, [poseId]);
  toast('Ajoutée à la séance', { label: 'Voir', run: () => go(`#/seance/${sessionId}`) });
}
