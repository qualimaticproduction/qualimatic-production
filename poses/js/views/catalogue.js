/* ============================================
   QUALIMATIC POSES — Catalogue (grille + recherche + filtres)
   ============================================ */

import { state, filterPoses, isIncomplete, thumbUrl, importFiles, daysSinceBackup } from '../store.js';
import { esc, title, icon, toast, progress, plural } from '../ui.js';
import { go } from '../nav.js';

export function render(view) {
  const f = state.filters;
  const todoCount = state.poses.filter(isIncomplete).length;

  view.innerHTML = `
    <div class="page">
      <header class="page-head">
        <p class="kicker">Qualimatic Production</p>
        ${title('Catalogue de poses')}
        <p class="page-sub">${state.poses.length ? plural(state.poses.length, 'pose', 'poses') : 'Aucune pose pour l’instant'}${todoCount ? ` · ${todoCount} à compléter` : ''}</p>
      </header>

      ${notices()}

      <div class="toolbar">
        <label class="search">
          ${icon('search')}
          <input type="search" id="q" placeholder="Rechercher" value="${esc(f.q)}" autocomplete="off" enterkeyhint="search">
        </label>
        <button type="button" class="btn btn-add" id="add">${icon('plus')}<span>Ajouter</span></button>
        <input type="file" id="file" accept="image/*" multiple hidden>
      </div>

      <div class="chips" id="cats">
        ${chip('', 'Toutes', !f.category)}
        ${state.categories.map((c) => chip(c, c, f.category === c)).join('')}
        ${state.poses.some((p) => !p.category) ? chip('__none', 'Sans catégorie', f.category === '__none') : ''}
      </div>

      <div class="filters">
        <button type="button" class="toggle ${f.fav ? 'on' : ''}" id="fav">${icon('heart')}Favoris</button>
        ${todoCount ? `<button type="button" class="toggle ${f.todo ? 'on' : ''}" id="todo">À compléter</button>` : ''}
        <label class="select-wrap ${f.light ? 'on' : ''}">
          <select id="light" aria-label="Lumière">
            <option value="">Toutes lumières</option>
            ${state.lights.map((l) => `<option ${f.light === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}
          </select>
          ${icon('down')}
        </label>
      </div>

      <div id="results"></div>
    </div>`;

  const results = view.querySelector('#results');
  const observer = new IntersectionObserver(onVisible, { rootMargin: '400px 0px' });
  const drawGrid = () => renderGrid(results, observer);
  drawGrid();

  // recherche
  view.querySelector('#q').addEventListener('input', (e) => { f.q = e.target.value; drawGrid(); });
  // catégories
  view.querySelector('#cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    f.category = b.dataset.cat;
    view.querySelectorAll('#cats .chip').forEach((c) => c.classList.toggle('on', c === b));
    b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    drawGrid();
  });
  // favoris, à compléter, lumière
  view.querySelector('#fav').onclick = (e) => { f.fav = !f.fav; e.currentTarget.classList.toggle('on', f.fav); drawGrid(); };
  const todoBtn = view.querySelector('#todo');
  if (todoBtn) todoBtn.onclick = () => { f.todo = !f.todo; todoBtn.classList.toggle('on', f.todo); drawGrid(); };
  view.querySelector('#light').onchange = (e) => {
    f.light = e.target.value;
    e.target.parentElement.classList.toggle('on', !!f.light);
    drawGrid();
  };

  // ajout de photos
  const input = view.querySelector('#file');
  view.querySelector('#add').onclick = () => input.click();
  input.onchange = async () => {
    const files = [...input.files];
    input.value = '';
    if (!files.length) return;
    const bar = progress(files.length > 1 ? `Import de ${files.length} photos` : 'Import de la photo');
    const preset = state.categories.includes(f.category) ? { category: f.category } : {};
    const { created, failed } = await importFiles(files, (i, n) => bar.set(i, n, `Photo ${Math.min(i + 1, n)} sur ${n}`), preset);
    bar.done();
    if (failed.length) toast(`${plural(failed.length, 'photo illisible', 'photos illisibles')}, ignorée${failed.length > 1 ? 's' : ''}.`);
    if (created.length === 1) { go(`#/pose/${created[0].id}/modifier`); return; }
    if (created.length > 1) {
      render(view);
      toast(`${created.length} poses ajoutées. Complétez-les quand vous voulez.`, {
        label: 'Compléter', run: () => go(`#/pose/${created[created.length - 1].id}/modifier`)
      });
    }
  };

  // bandeaux d'information
  view.querySelectorAll('[data-dismiss]').forEach((b) => {
    b.onclick = () => {
      const key = b.dataset.dismiss;
      try { (key === 'install' ? localStorage : sessionStorage).setItem(`qp-hide-${key}`, '1'); } catch (e) { /* ignoré */ }
      b.closest('.notice').remove();
    };
  });

  return () => observer.disconnect();
}

function chip(value, label, on) {
  return `<button type="button" class="chip ${on ? 'on' : ''}" data-cat="${esc(value)}">${esc(label)}</button>`;
}

function renderGrid(results, observer) {
  const list = filterPoses();
  observer.disconnect();
  if (!state.poses.length) {
    results.innerHTML = `
      <div class="empty">
        <span class="mark" aria-hidden="true">✻</span>
        <p class="empty-title">Votre catalogue est <em>vide</em></p>
        <p>Touchez « Ajouter » pour importer des photos depuis votre pellicule. Vous pouvez en choisir plusieurs d’un coup et compléter les fiches plus tard.</p>
      </div>`;
    return;
  }
  if (!list.length) {
    results.innerHTML = '<div class="empty"><p class="empty-title">Aucune pose ne <em>correspond</em></p><p>Essayez une autre recherche ou retirez un filtre.</p></div>';
    return;
  }
  results.innerHTML = `
    <p class="results-count">${plural(list.length, 'pose', 'poses')}</p>
    <div class="grid">${list.map(card).join('')}</div>`;
  results.querySelectorAll('img[data-id]').forEach((img) => observer.observe(img));
}

function card(p) {
  const todo = isIncomplete(p);
  return `
    <a class="card" href="#/pose/${p.id}">
      <div class="card-img">
        <img data-id="${p.id}" alt="">
        ${p.fav ? `<span class="card-fav" aria-label="Favori">${icon('heart')}</span>` : ''}
        ${todo ? '<span class="card-todo">À compléter</span>' : ''}
      </div>
      <div class="card-meta">
        <p class="card-cat">${esc(p.category || 'Sans catégorie')}</p>
        <h3 class="card-title">${esc(p.title || 'Sans titre')}</h3>
      </div>
    </a>`;
}

async function onVisible(entries, observer) {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    observer.unobserve(e.target);
    const img = e.target;
    img.src = await thumbUrl(img.dataset.id);
    img.onload = () => img.classList.add('loaded');
  }
}

function notices() {
  let html = '';
  const hidden = (k, store) => { try { return store.getItem(`qp-hide-${k}`) === '1'; } catch (e) { return false; } };
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (ios && !standalone && !hidden('install', localStorage)) {
    html += `
      <div class="notice">
        <p>Pour l’utiliser hors connexion, ajoutez l’appli à l’écran d’accueil : bouton <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>.</p>
        <button type="button" class="icon-btn" data-dismiss="install" aria-label="Masquer">${icon('close')}</button>
      </div>`;
  }
  const days = daysSinceBackup();
  if (state.poses.length && days >= 30 && !hidden('backup', sessionStorage)) {
    html += `
      <div class="notice">
        <p>${state.lastBackup ? `Dernière sauvegarde il y a ${days} jours.` : 'Vous n’avez pas encore sauvegardé vos poses.'}
          <a href="#/reglages">Sauvegarder</a></p>
        <button type="button" class="icon-btn" data-dismiss="backup" aria-label="Masquer">${icon('close')}</button>
      </div>`;
  }
  return html;
}
