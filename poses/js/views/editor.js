/* ============================================
   QUALIMATIC POSES — Fiche d'une pose (modification)
   ============================================ */

import { state, getPose, savePose, removePose, replacePhoto, isIncomplete, saveList, thumbUrl, fullUrl } from '../store.js';
import { esc, title, icon, toast, confirmDialog, formDialog, progress } from '../ui.js';
import { back } from '../nav.js';

export function render(view, { id }) {
  const pose = getPose(id);
  if (!pose) { back('#/catalogue'); return; }
  const draft = { ...pose };

  // prochaine pose « à compléter » (pour enchaîner après un import en lot)
  const nextTodo = () => {
    const i = state.poses.findIndex((p) => p.id === id);
    const order = [...state.poses.slice(i + 1), ...state.poses.slice(0, i)];
    return order.find((p) => p.id !== id && isIncomplete(p));
  };

  const options = (list, current, emptyLabel) => `
    <option value="">${emptyLabel}</option>
    ${list.map((x) => `<option ${x === current ? 'selected' : ''}>${esc(x)}</option>`).join('')}
    ${current && !list.includes(current) ? `<option selected>${esc(current)}</option>` : ''}
    <option value="__new">Nouvelle…</option>`;

  view.innerHTML = `
    <div class="page page-form">
      <header class="bar">
        <button type="button" class="bar-btn" id="cancel">Annuler</button>
        <span class="bar-title">Fiche de la pose</span>
        <button type="button" class="bar-btn strong" id="save">OK</button>
      </header>

      <div class="editor-photo">
        <img id="photo" alt="">
        <button type="button" class="btn btn-ghost btn-small on-photo" id="change">${icon('photo')}Changer la photo</button>
        <input type="file" id="file" accept="image/*" hidden>
      </div>

      <form class="form" id="form" autocomplete="off">
        ${title('L’essentiel', 'h2', 'section-title')}
        <label class="field">
          <span class="field-label">Titre</span>
          <input class="input" name="title" value="${esc(draft.title)}" placeholder="Ex. Regard sous le voile" enterkeyhint="next">
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Catégorie</span>
            <span class="select-field"><select class="input" name="category">${options(state.categories, draft.category, 'Sans catégorie')}</select>${icon('down')}</span>
          </label>
          <label class="field">
            <span class="field-label">Lumière idéale</span>
            <span class="select-field"><select class="input" name="light">${options(state.lights, draft.light, 'Indifférente')}</select>${icon('down')}</span>
          </label>
        </div>
        <label class="field">
          <span class="field-label">Accessoire nécessaire</span>
          <input class="input" name="accessory" value="${esc(draft.accessory)}" placeholder="Voile, ombrelle, bouquet…">
        </label>

        ${title('Les consignes', 'h2', 'section-title')}
        <label class="field">
          <span class="field-label">Personne 1</span>
          <textarea class="input" name="p1" rows="2" placeholder="Ce que la première personne fait">${esc(draft.p1)}</textarea>
        </label>
        <label class="field">
          <span class="field-label">Personne 2 <span class="optional">facultatif</span></span>
          <textarea class="input" name="p2" rows="2" placeholder="Ce que la seconde personne fait">${esc(draft.p2)}</textarea>
        </label>
        <label class="field">
          <span class="field-label">Caméra</span>
          <textarea class="input" name="camera" rows="2" placeholder="Mouvement, focale, cadrage. Ex. travelling latéral lent, 35 mm, plan taille">${esc(draft.camera)}</textarea>
        </label>

        ${title('Notes libres', 'h2', 'section-title')}
        <label class="field">
          <span class="field-label">Notes</span>
          <textarea class="input" name="notes" rows="3" placeholder="Variantes, idée de musique, référence…">${esc(draft.notes)}</textarea>
        </label>

        <label class="switch">
          <input type="checkbox" name="fav" ${draft.fav ? 'checked' : ''}>
          <span class="switch-track" aria-hidden="true"></span>
          <span>Dans mes favoris</span>
        </label>

        <div class="form-actions">
          <button type="submit" class="btn btn-block">Enregistrer</button>
          <button type="button" class="btn btn-ghost btn-block" id="saveNext" hidden>Enregistrer et compléter la suivante</button>
          <button type="button" class="btn btn-quiet danger" id="delete">${icon('trash')}Supprimer la pose</button>
        </div>
      </form>
    </div>`;

  const $ = (s) => view.querySelector(s);
  const form = $('#form');
  let photoUrl = null;

  // photo : vignette immédiate puis version nette
  thumbUrl(id).then((u) => { if (!photoUrl) $('#photo').src = u; });
  fullUrl(id).then((u) => { photoUrl = u; $('#photo').src = u; });

  // agrandir les zones de texte au fil de la saisie
  const grow = (t) => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; };
  form.querySelectorAll('textarea').forEach((t) => { grow(t); t.addEventListener('input', () => grow(t)); });

  // « Nouvelle… » dans les listes
  form.querySelectorAll('select').forEach((sel) => {
    sel.dataset.prev = sel.value;
    sel.addEventListener('change', async () => {
      if (sel.value !== '__new') { sel.dataset.prev = sel.value; return; }
      const kind = sel.name === 'category' ? 'categories' : 'lights';
      const v = await formDialog({
        heading: kind === 'categories' ? 'Nouvelle catégorie' : 'Nouvelle lumière',
        fields: [{ name: 'name', label: 'Nom', required: true }],
        ok: 'Ajouter'
      });
      const name = v && v.name;
      if (!name) { sel.value = sel.dataset.prev; return; }
      if (!state[kind].includes(name)) await saveList(kind, [...state[kind], name]);
      const opt = document.createElement('option');
      opt.textContent = name;
      sel.insertBefore(opt, sel.querySelector('option[value="__new"]'));
      sel.value = name;
      sel.dataset.prev = name;
    });
  });

  const nextBtn = $('#saveNext');
  if (isIncomplete(pose) && nextTodo()) nextBtn.hidden = false;

  async function save() {
    const data = new FormData(form);
    ['title', 'category', 'light', 'accessory', 'p1', 'p2', 'camera', 'notes'].forEach((k) => {
      const v = String(data.get(k) || '').trim();
      draft[k] = v === '__new' ? '' : v;
    });
    draft.fav = form.elements.fav.checked;
    await savePose(draft);
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    await save();
    toast('Fiche enregistrée');
    back(`#/pose/${id}`);
  };
  $('#save').onclick = () => form.requestSubmit();
  $('#cancel').onclick = () => back(`#/pose/${id}`);
  nextBtn.onclick = async () => {
    await save();
    const n = nextTodo();
    if (n) back(`#/pose/${n.id}/modifier`); else back('#/catalogue');
  };

  $('#change').onclick = () => $('#file').click();
  $('#file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const bar = progress('Remplacement de la photo');
    try {
      await replacePhoto(id, file);
      draft.ratio = getPose(id).ratio;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = await fullUrl(id);
      $('#photo').src = photoUrl;
    } catch (err) {
      toast('Cette photo n’a pas pu être lue.');
    }
    bar.done();
  };

  $('#delete').onclick = async () => {
    const ok = await confirmDialog({ heading: 'Supprimer cette pose', text: 'La photo et sa fiche seront effacées de l’appli, et retirées des séances.', ok: 'Supprimer', danger: true });
    if (!ok) return;
    await removePose(id);
    toast('Pose supprimée');
    back('#/catalogue');
  };

  return () => { if (photoUrl) URL.revokeObjectURL(photoUrl); };
}

