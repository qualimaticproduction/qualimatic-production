/* ============================================
   QUALIMATIC POSES — ui.js
   Petits outils d'interface partagés : icônes, messages, fenêtres.
   ============================================ */

/* Protège le texte saisi avant de l'afficher */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Titre éditorial : ✻ bordeaux + dernier mot en italique */
export function title(text, tag = 'h1', cls = '') {
  const words = String(text).trim().split(/\s+/);
  const last = words.pop();
  const head = words.length ? esc(words.join(' ')) + ' ' : '';
  return `<${tag} class="title ${cls}"><span class="mark" aria-hidden="true">✻</span>${head}<em>${esc(last)}</em></${tag}>`;
}

/* Icônes au trait, dessinées pour l'appli */
const P = {
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
  list: '<path d="M8 6.5h12M8 12h12M8 17.5h12"/><circle cx="4.5" cy="6.5" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="17.5" r=".8"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  heart: '<path d="M12 19.5s-7.5-4.4-7.5-9.6A4 4 0 0 1 12 7.6a4 4 0 0 1 7.5 2.3c0 5.2-7.5 9.6-7.5 9.6z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  edit: '<path d="M5 19h3.5L19 8.5 15.5 5 5 15.5V19z"/><path d="M13.5 7l3.5 3.5"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeOff: '<path d="M4 4l16 16"/><path d="M9.6 6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.9 3.6M6.2 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.5 0 2.8-.4 4-1"/><path d="M10 10.2a2.8 2.8 0 0 0 3.8 3.8"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  grip: '<path d="M9 6.5h.01M15 6.5h.01M9 12h.01M15 12h.01M9 17.5h.01M15 17.5h.01" stroke-width="2.6"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  export: '<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v6h14v-6"/>',
  import: '<path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 13v6h14v-6"/>',
  more: '<circle cx="5.5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18.5" cy="12" r="1"/>',
  photo: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><circle cx="9" cy="10.5" r="1.6"/><path d="M20.5 15.5l-5-5-8 8"/>'
};

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${P[name] || ''}</svg>`;
}

/* ----- Message bref en bas de l'écran ----- */
let toastTimer;
let toastAt = 0;
export function toast(message, action) {
  toastAt = Date.now();
  const el = document.getElementById('toast');
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { el.classList.remove('show'); action.run(); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 6000 : 2600);
}

/* Au changement d'écran, on retire un ancien message sans bouton */
export function clearStaleToast() {
  const el = document.getElementById('toast');
  if (el.classList.contains('show') && !el.querySelector('button') && Date.now() - toastAt > 800) el.classList.remove('show');
}

/* ----- Fenêtres (dialogues) ----- */

/* Ouvre une fenêtre et renvoie une promesse résolue à sa fermeture.
   build(dialog, close) remplit la fenêtre ; close(valeur) la ferme. */
export function openDialog(html, build, { sheet = false } = {}) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = sheet ? 'sheet' : 'modal';
    d.innerHTML = `<div class="dialog-inner">${html}</div>`;
    document.body.appendChild(d);
    let value;
    const close = (v) => { value = v; d.classList.add('closing'); setTimeout(() => d.close(), 180); };
    d.addEventListener('close', () => { d.remove(); resolve(value); });
    d.addEventListener('cancel', (e) => { e.preventDefault(); close(undefined); });
    // toucher le fond ferme la fenêtre
    d.addEventListener('click', (e) => { if (e.target === d) close(undefined); });
    if (build) build(d, close);
    d.showModal();
  });
}

export function confirmDialog({ heading, text = '', ok = 'Confirmer', cancel = 'Annuler', danger = false }) {
  return openDialog(`
    ${title(heading, 'h2', 'dialog-title')}
    ${text ? `<p class="dialog-text">${esc(text)}</p>` : ''}
    <div class="dialog-actions">
      <button type="button" class="btn btn-ghost" data-v="0">${esc(cancel)}</button>
      <button type="button" class="btn ${danger ? 'btn-danger' : ''}" data-v="1">${esc(ok)}</button>
    </div>`, (d, close) => {
    d.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => close(b.dataset.v === '1'); });
  }).then(Boolean);
}

/* Choix parmi plusieurs boutons. options = [{ label, value, style }] */
export function choiceDialog({ heading, text = '', options }) {
  return openDialog(`
    ${title(heading, 'h2', 'dialog-title')}
    ${text ? `<p class="dialog-text">${esc(text)}</p>` : ''}
    <div class="dialog-stack">
      ${options.map((o, i) => `<button type="button" class="btn ${o.style || 'btn-ghost'}" data-i="${i}">${esc(o.label)}</button>`).join('')}
    </div>`, (d, close) => {
    d.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => close(options[+b.dataset.i].value); });
  }, { sheet: true });
}

/* Petit formulaire. fields = [{ name, label, type, value, placeholder, required }] */
export function formDialog({ heading, fields, ok = 'Enregistrer' }) {
  return openDialog(`
    ${title(heading, 'h2', 'dialog-title')}
    <form method="dialog" class="form">
      ${fields.map((f) => `
        <label class="field">
          <span class="field-label">${esc(f.label)}</span>
          <input class="input" name="${f.name}" type="${f.type || 'text'}" value="${esc(f.value || '')}"
            placeholder="${esc(f.placeholder || '')}" ${f.required ? 'required' : ''} autocomplete="off">
        </label>`).join('')}
      <div class="dialog-actions">
        <button type="button" class="btn btn-ghost" data-cancel>Annuler</button>
        <button type="submit" class="btn">${esc(ok)}</button>
      </div>
    </form>`, (d, close) => {
    const form = d.querySelector('form');
    d.querySelector('[data-cancel]').onclick = () => close(undefined);
    form.onsubmit = (e) => {
      e.preventDefault();
      const out = {};
      fields.forEach((f) => { out[f.name] = form.elements[f.name].value.trim(); });
      close(out);
    };
  });
}

/* ----- Voile de progression (import, sauvegarde) ----- */
export function progress(label) {
  const el = document.createElement('div');
  el.className = 'progress-veil';
  el.innerHTML = `<div class="progress-box"><span class="mark spin" aria-hidden="true">✻</span>
    <p class="progress-label">${esc(label)}</p><div class="progress-bar"><span></span></div></div>`;
  document.body.appendChild(el);
  const bar = el.querySelector('.progress-bar span');
  const lab = el.querySelector('.progress-label');
  return {
    set(done, total, text) {
      bar.style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
      if (text) lab.textContent = text;
    },
    done() { el.classList.add('closing'); setTimeout(() => el.remove(), 200); }
  };
}

/* ----- Dates ----- */
export function formatDate(iso, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('fr-FR', opts);
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function plural(n, one, many) {
  return `${n} ${n > 1 ? many : one}`;
}

/* Taille lisible : 12,4 Mo */
export function formatBytes(b) {
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} Ko`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2).replace('.', ',')} Go`;
}
