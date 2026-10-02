/* ============================================
   QUALIMATIC POSES — Séances (liste, déroulé, ajout de poses)
   ============================================ */

import { state, getSession, getPose, createSession, saveSession, removeSession, addPosesToSession, filterPoses, thumbUrl } from '../store.js';
import { esc, title, icon, toast, confirmDialog, formDialog, choiceDialog, openDialog, formatDate, todayIso, plural } from '../ui.js';
import { go, back } from '../nav.js';

const sessionFields = (s = {}) => [
  { name: 'name', label: 'Nom', value: s.name, placeholder: 'Mariage Claire & Hugo', required: true },
  { name: 'date', label: 'Date', type: 'date', value: s.date || todayIso() },
  { name: 'place', label: 'Lieu', value: s.place, placeholder: 'Château de…' }
];

/* ----- Liste des séances ----- */

export function renderList(view) {
  const today = todayIso();
  const upcoming = state.sessions.filter((s) => !s.date || s.date >= today).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const past = state.sessions.filter((s) => s.date && s.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const item = (s) => {
    const done = s.items.filter((it) => it.done).length;
    return `
      <a class="session-card" href="#/seance/${s.id}">
        <span class="session-date">${s.date ? `<span class="d">${formatDate(s.date, { day: 'numeric' })}</span><span class="m">${formatDate(s.date, { month: 'short' })}</span>` : '<span class="m">—</span>'}</span>
        <span class="session-info">
          <span class="session-name">${esc(s.name)}</span>
          <span class="session-meta">${esc(s.place || '')}${s.place ? ' · ' : ''}${plural(s.items.length, 'pose', 'poses')}${done ? ` · ${done} faite${done > 1 ? 's' : ''}` : ''}</span>
        </span>
        ${icon('next', 'chev')}
      </a>`;
  };

  view.innerHTML = `
    <div class="page">
      <header class="page-head">
        <p class="kicker">Qualimatic Production</p>
        ${title('Séances de tournage')}
        <p class="page-sub">Préparez le déroulé, puis lancez le mode tournage le jour J.</p>
      </header>
      <button type="button" class="btn btn-block" id="new">${icon('plus')}Nouvelle séance</button>
      ${!state.sessions.length ? `
        <div class="empty">
          <span class="mark" aria-hidden="true">✻</span>
          <p class="empty-title">Aucune séance pour <em>l’instant</em></p>
          <p>Créez une séance pour un mariage ou un tournage, puis ajoutez-y les poses de votre catalogue dans l’ordre voulu.</p>
        </div>` : ''}
      ${upcoming.length ? `${title('À venir', 'h2', 'section-title')}<div class="session-list">${upcoming.map(item).join('')}</div>` : ''}
      ${past.length ? `${title('Passées', 'h2', 'section-title')}<div class="session-list past">${past.map(item).join('')}</div>` : ''}
    </div>`;

  view.querySelector('#new').onclick = async () => {
    const v = await formDialog({ heading: 'Nouvelle séance', fields: sessionFields(), ok: 'Créer' });
    if (!v) return;
    const s = await createSession(v);
    go(`#/seance/${s.id}`);
  };
}

/* ----- Déroulé d'une séance ----- */

export function renderDetail(view, { id }) {
  const s = getSession(id);
  if (!s) { back('#/seances'); return; }
  // on ignore les poses supprimées entre-temps
  s.items = s.items.filter((it) => getPose(it.poseId));
  const done = s.items.filter((it) => it.done).length;

  view.innerHTML = `
    <div class="page">
      <header class="bar bar-page">
        <button type="button" class="bar-btn" id="back">${icon('back')}Séances</button>
        <button type="button" class="icon-btn" id="more" aria-label="Options de la séance">${icon('more')}</button>
      </header>
      <header class="page-head">
        <p class="kicker">${s.date ? esc(formatDate(s.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) : 'Sans date'}</p>
        ${title(s.name)}
        ${s.place ? `<p class="page-sub">${esc(s.place)}</p>` : ''}
      </header>

      <button type="button" class="btn btn-block btn-shoot" id="shoot" ${s.items.length ? '' : 'disabled'}>
        ${icon('play')}Lancer le tournage
      </button>

      <div class="section-head">
        ${title('Le déroulé', 'h2', 'section-title')}
        <span class="section-count">${s.items.length ? `${done} / ${s.items.length} faites` : ''}</span>
      </div>
      ${s.items.length ? '<p class="hint">Faites glisser la poignée pour changer l’ordre.</p>' : ''}
      <ol class="run-list" id="list">
        ${s.items.map((it, i) => runRow(it, i)).join('')}
      </ol>
      ${!s.items.length ? '<div class="empty small"><p>Ajoutez des poses depuis votre catalogue.</p></div>' : ''}
      <button type="button" class="btn btn-ghost btn-block" id="add">${icon('plus')}Ajouter des poses</button>
    </div>`;

  const $ = (q) => view.querySelector(q);
  const list = $('#list');
  list.querySelectorAll('img[data-id]').forEach(async (img) => { img.src = await thumbUrl(img.dataset.id); });

  $('#back').onclick = () => back('#/seances');
  $('#shoot').onclick = () => go(`#/seance/${id}/tournage`);
  $('#add').onclick = async () => {
    const picked = await pickPoses(s);
    if (picked && picked.length) {
      await addPosesToSession(id, picked);
      toast(`${plural(picked.length, 'pose ajoutée', 'poses ajoutées')}`);
      renderDetail(view, { id });
    }
  };

  list.addEventListener('click', async (e) => {
    const row = e.target.closest('.run-row');
    if (!row) return;
    const idx = [...list.children].indexOf(row);
    if (e.target.closest('[data-remove]')) {
      s.items.splice(idx, 1);
      await saveSession(s);
      renderDetail(view, { id });
    } else if (e.target.closest('[data-done]')) {
      s.items[idx].done = !s.items[idx].done;
      await saveSession(s);
      renderDetail(view, { id });
    } else if (e.target.closest('.run-main')) {
      go(`#/seance/${id}/tournage/${idx}`);
    }
  });

  enableDrag(list, async (order) => {
    s.items = order.map((i) => s.items[i]);
    await saveSession(s);
    renderDetail(view, { id });
  });

  $('#more').onclick = async () => {
    const choice = await choiceDialog({
      heading: s.name,
      options: [
        { label: 'Modifier nom, date, lieu', value: 'edit' },
        ...(done ? [{ label: 'Tout remettre à « à faire »', value: 'reset' }] : []),
        { label: 'Dupliquer la séance', value: 'dup' },
        { label: 'Supprimer la séance', value: 'delete', style: 'btn-quiet danger' }
      ]
    });
    if (choice === 'edit') {
      const v = await formDialog({ heading: 'Modifier la séance', fields: sessionFields(s) });
      if (v) { Object.assign(s, v); await saveSession(s); renderDetail(view, { id }); }
    }
    if (choice === 'reset') {
      s.items.forEach((it) => { it.done = false; });
      await saveSession(s);
      renderDetail(view, { id });
    }
    if (choice === 'dup') {
      const copy = await createSession({ name: `${s.name} (copie)`, date: s.date, place: s.place });
      copy.items = s.items.map((it) => ({ poseId: it.poseId, done: false }));
      await saveSession(copy);
      go(`#/seance/${copy.id}`);
    }
    if (choice === 'delete') {
      const ok = await confirmDialog({ heading: 'Supprimer la séance', text: 'Les poses restent dans votre catalogue.', ok: 'Supprimer', danger: true });
      if (ok) { await removeSession(id); toast('Séance supprimée'); back('#/seances'); }
    }
  };
}

function runRow(it, i) {
  const p = getPose(it.poseId);
  return `
    <li class="run-row ${it.done ? 'is-done' : ''}">
      <span class="run-grip" data-grip aria-label="Déplacer">${icon('grip')}</span>
      <button type="button" class="run-main">
        <span class="run-num">${String(i + 1).padStart(2, '0')}</span>
        <img data-id="${p.id}" alt="">
        <span class="run-text">
          <span class="run-title">${esc(p.title || 'Sans titre')}</span>
          <span class="run-cat">${esc(p.category || 'Sans catégorie')}</span>
        </span>
      </button>
      <button type="button" class="icon-btn small ${it.done ? 'active' : ''}" data-done aria-label="${it.done ? 'Marquer à faire' : 'Marquer faite'}">${icon('check')}</button>
      <button type="button" class="icon-btn small" data-remove aria-label="Retirer">${icon('close')}</button>
    </li>`;
}

/* Réordonner au doigt en tenant la poignée */
function enableDrag(list, onDrop) {
  list.addEventListener('pointerdown', (e) => {
    const grip = e.target.closest('[data-grip]');
    if (!grip) return;
    e.preventDefault();
    const row = grip.closest('.run-row');
    const rows = [...list.children];
    rows.forEach((r, i) => { r.dataset.orig = i; });
    const grab = e.clientY - row.getBoundingClientRect().top;
    let lastY = e.clientY;
    let raf = null;
    grip.setPointerCapture(e.pointerId);
    row.classList.add('dragging');

    const place = () => {
      row.style.transform = '';
      let natural = row.getBoundingClientRect().top;
      let dy = lastY - grab - natural;
      let moved = true;
      while (moved) {
        moved = false;
        const next = row.nextElementSibling;
        const prev = row.previousElementSibling;
        if (next && dy > next.offsetHeight / 2) { list.insertBefore(next, row); moved = true; }
        else if (prev && dy < -prev.offsetHeight / 2) { list.insertBefore(row, prev); moved = true; }
        if (moved) { natural = row.getBoundingClientRect().top; dy = lastY - grab - natural; }
      }
      row.style.transform = `translateY(${dy}px)`;
    };

    // défilement automatique près des bords de l'écran
    const autoScroll = () => {
      const h = window.innerHeight;
      if (lastY < 70) window.scrollBy(0, -8);
      else if (lastY > h - 130) window.scrollBy(0, 8);
      place();
      raf = requestAnimationFrame(autoScroll);
    };
    raf = requestAnimationFrame(autoScroll);

    const move = (ev) => { lastY = ev.clientY; };
    const end = () => {
      cancelAnimationFrame(raf);
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', end);
      grip.removeEventListener('pointercancel', end);
      row.classList.remove('dragging');
      row.style.transform = '';
      const order = [...list.children].map((r) => +r.dataset.orig);
      if (order.some((v, i) => v !== i)) onDrop(order);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  });
}

/* ----- Choisir des poses du catalogue ----- */

function pickPoses(session) {
  const already = new Set(session.items.map((it) => it.poseId));
  const selected = [];
  const f = { q: '', category: '', light: '', fav: false, todo: false };

  return openDialog(`
    <div class="picker">
      <header class="bar">
        <button type="button" class="bar-btn" data-cancel>Annuler</button>
        <span class="bar-title">Choisir des poses</span>
        <button type="button" class="bar-btn strong" data-ok>Ajouter</button>
      </header>
      <label class="search">${icon('search')}<input type="search" placeholder="Rechercher" autocomplete="off"></label>
      <div class="chips">
        <button type="button" class="chip on" data-cat="">Toutes</button>
        <button type="button" class="chip" data-cat="__fav">Favoris</button>
        ${state.categories.map((c) => `<button type="button" class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>
      <div class="picker-grid"></div>
    </div>`, (d, close) => {
    const grid = d.querySelector('.picker-grid');
    const okBtn = d.querySelector('[data-ok]');
    const refreshOk = () => { okBtn.textContent = selected.length ? `Ajouter (${selected.length})` : 'Ajouter'; };

    const draw = () => {
      const list = filterPoses(f);
      grid.innerHTML = list.length ? list.map((p) => `
        <button type="button" class="pick ${selected.includes(p.id) ? 'on' : ''} ${already.has(p.id) ? 'already' : ''}" data-id="${p.id}" ${already.has(p.id) ? 'disabled' : ''}>
          <img data-src="${p.id}" alt="">
          <span class="pick-title">${esc(p.title || 'Sans titre')}</span>
          <span class="pick-check">${already.has(p.id) ? 'Déjà là' : icon('check')}</span>
        </button>`).join('') : '<p class="hint">Aucune pose.</p>';
      grid.querySelectorAll('img[data-src]').forEach(async (img) => { img.src = await thumbUrl(img.dataset.src); });
    };
    draw();

    d.querySelector('input').addEventListener('input', (e) => { f.q = e.target.value; draw(); });
    d.querySelector('.chips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      d.querySelectorAll('.chips .chip').forEach((c) => c.classList.toggle('on', c === b));
      f.fav = b.dataset.cat === '__fav';
      f.category = f.fav ? '' : b.dataset.cat;
      draw();
    });
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('.pick');
      if (!b || b.disabled) return;
      const i = selected.indexOf(b.dataset.id);
      if (i >= 0) selected.splice(i, 1); else selected.push(b.dataset.id);
      b.classList.toggle('on', i < 0);
      refreshOk();
    });
    d.querySelector('[data-cancel]').onclick = () => close(null);
    okBtn.onclick = () => close(selected);
  }, { sheet: true }).then((v) => v || null);
}
