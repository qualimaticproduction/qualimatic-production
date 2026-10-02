/* ============================================
   QUALIMATIC POSES — Réglages (sauvegarde, catégories, lumières…)
   ============================================ */

import { state, saveList, renameInList, removeFromList, countUsing, setPref, markBackup, daysSinceBackup } from '../store.js';
import { esc, title, icon, toast, confirmDialog, formDialog, choiceDialog, openDialog, progress, formatDate, formatBytes, plural } from '../ui.js';
import { buildBackup, inspectBackup, applyBackup, shareFile } from '../backup.js';
import { APP_VERSION } from '../version.js';

export function render(view) {
  const last = state.lastBackup;
  const days = daysSinceBackup();

  view.innerHTML = `
    <div class="page">
      <header class="page-head">
        <p class="kicker">Qualimatic Production</p>
        ${title('Réglages et sauvegarde')}
      </header>

      <section class="block">
        ${title('Sauvegarde', 'h2', 'section-title')}
        <p class="block-text">Vos poses vivent uniquement sur ce téléphone. Exportez-les régulièrement dans un fichier que vous rangez dans iCloud Drive : il contient toutes les photos et toutes les fiches.</p>
        <p class="status ${last && days < 30 ? '' : 'warn'}">
          ${last ? `Dernière sauvegarde le ${formatDate(new Date(last).toISOString())}` : 'Aucune sauvegarde pour le moment'}
        </p>
        <div class="stack">
          <button type="button" class="btn btn-block" id="export">${icon('export')}Exporter tout</button>
          <button type="button" class="btn btn-ghost btn-block" id="import">${icon('import')}Restaurer une sauvegarde</button>
          <input type="file" id="file" accept=".zip,application/zip" hidden>
        </div>
      </section>

      <section class="block">
        ${title('Catégories', 'h2', 'section-title')}
        <p class="block-text">Touchez une catégorie pour la renommer, la déplacer ou la supprimer.</p>
        ${listEditor('categories')}
      </section>

      <section class="block">
        ${title('Lumières', 'h2', 'section-title')}
        ${listEditor('lights')}
      </section>

      <section class="block">
        ${title('Mode tournage', 'h2', 'section-title')}
        <p class="block-text">Taille du texte des consignes pendant le tournage.</p>
        <div class="segmented" id="textsize">
          ${[['normal', 'Normal'], ['grand', 'Grand'], ['tres-grand', 'Très grand']].map(([v, l]) => `
            <button type="button" data-v="${v}" class="${state.prefs.shootText === v ? 'on' : ''}">${l}</button>`).join('')}
        </div>
        <p class="block-text small">${'wakeLock' in navigator
          ? 'L’écran reste allumé pendant le tournage.'
          : 'Ce téléphone ne permet pas de garder l’écran allumé automatiquement. Pensez à régler le verrouillage automatique (Réglages › Luminosité et affichage).'}</p>
      </section>

      <section class="block">
        ${title('Stockage', 'h2', 'section-title')}
        <p class="block-text" id="storage">Calcul en cours…</p>
      </section>

      <section class="block about">
        <p class="about-name">Qualimatic <em>Poses</em></p>
        <p class="block-text small">Version ${APP_VERSION} · Fonctionne hors connexion · Aucune donnée ne quitte ce téléphone sans votre action.</p>
      </section>
    </div>`;

  const $ = (q) => view.querySelector(q);

  /* ----- Export ----- */
  $('#export').onclick = async () => {
    if (!state.poses.length && !state.sessions.length) { toast('Rien à sauvegarder pour l’instant.'); return; }
    const bar = progress('Préparation de la sauvegarde');
    let file;
    try {
      file = await buildBackup((i, n) => bar.set(i, n, `Photo ${Math.min(i + 1, n)} sur ${n}`));
    } catch (e) {
      bar.done();
      toast('La sauvegarde a échoué. Réessayez.');
      return;
    }
    bar.done();
    // l'iPhone demande un toucher juste avant d'ouvrir la feuille de partage
    await openDialog(`
      ${title('Sauvegarde prête', 'h2', 'dialog-title')}
      <p class="dialog-text">${esc(file.name)} · ${formatBytes(file.size)}</p>
      <p class="dialog-text small">Dans la fenêtre qui s’ouvre, choisissez <strong>Enregistrer dans Fichiers</strong>, puis le dossier iCloud Drive de votre choix.</p>
      <div class="dialog-stack">
        <button type="button" class="btn" data-save>${icon('export')}Enregistrer le fichier</button>
        <button type="button" class="btn btn-quiet" data-cancel>Plus tard</button>
      </div>`, (d, close) => {
      d.querySelector('[data-cancel]').onclick = () => close();
      d.querySelector('[data-save]').onclick = async () => {
        const ok = await shareFile(file);
        if (ok) {
          await markBackup();
          toast('Sauvegarde enregistrée');
          close();
          render(view);
        }
      };
    });
  };

  /* ----- Restauration ----- */
  const input = $('#file');
  $('#import').onclick = () => input.click();
  input.onchange = async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    let backup;
    try {
      backup = await inspectBackup(file);
    } catch (e) {
      toast(e.message || 'Fichier illisible.');
      return;
    }
    const d = backup.data;
    const summary = `${plural((d.poses || []).length, 'pose', 'poses')}, ${plural((d.sessions || []).length, 'séance', 'séances')}`
      + (d.exportedAt ? `, sauvegardées le ${formatDate(d.exportedAt)}` : '')
      + (backup.missingPhotos ? `. Attention : ${plural(backup.missingPhotos, 'photo manque', 'photos manquent')}.` : '.');
    const mode = await choiceDialog({
      heading: 'Restaurer la sauvegarde',
      text: `Ce fichier contient ${summary}`,
      options: [
        { label: 'Tout remplacer', value: 'replace', style: '' },
        { label: 'Ajouter à mes poses actuelles', value: 'merge' },
        { label: 'Annuler', value: null, style: 'btn-quiet' }
      ]
    });
    if (!mode) return;
    if (mode === 'replace' && (state.poses.length || state.sessions.length)) {
      const ok = await confirmDialog({
        heading: 'Tout remplacer',
        text: `Les ${plural(state.poses.length, 'pose', 'poses')} et ${plural(state.sessions.length, 'séance', 'séances')} actuellement sur ce téléphone seront remplacées par le contenu du fichier.`,
        ok: 'Remplacer', danger: true
      });
      if (!ok) return;
    }
    const bar = progress('Restauration');
    try {
      const r = await applyBackup(backup, mode, (i, n) => bar.set(i, n, `Pose ${Math.min(i + 1, n)} sur ${n}`));
      bar.done();
      toast(`${plural(r.poses, 'pose restaurée', 'poses restaurées')}${r.missing ? ` (${r.missing} sans photo, ignorées)` : ''}`);
    } catch (e) {
      bar.done();
      toast('La restauration a échoué. Réessayez avec le même fichier.');
    }
    render(view);
  };

  /* ----- Catégories et lumières ----- */
  view.querySelectorAll('.list-editor').forEach((ul) => {
    const kind = ul.dataset.kind;
    const word = kind === 'categories' ? 'catégorie' : 'lumière';
    ul.addEventListener('click', async (e) => {
      const li = e.target.closest('[data-name]');
      if (li) {
        const name = li.dataset.name;
        const list = state[kind];
        const i = list.indexOf(name);
        const choice = await choiceDialog({
          heading: name,
          options: [
            { label: 'Renommer', value: 'rename' },
            ...(i > 0 ? [{ label: 'Monter', value: 'up' }] : []),
            ...(i < list.length - 1 ? [{ label: 'Descendre', value: 'down' }] : []),
            { label: 'Supprimer', value: 'delete', style: 'btn-quiet danger' }
          ]
        });
        if (choice === 'rename') {
          const v = await formDialog({ heading: `Renommer la ${word}`, fields: [{ name: 'name', label: 'Nom', value: name, required: true }] });
          if (v && v.name && v.name !== name) {
            if (list.includes(v.name)) { toast('Ce nom existe déjà.'); return; }
            await renameInList(kind, name, v.name);
          }
        }
        if (choice === 'up' || choice === 'down') {
          const copy = [...list];
          const j = choice === 'up' ? i - 1 : i + 1;
          [copy[i], copy[j]] = [copy[j], copy[i]];
          await saveList(kind, copy);
        }
        if (choice === 'delete') {
          const n = countUsing(kind, name);
          const ok = await confirmDialog({
            heading: `Supprimer la ${word}`,
            text: n ? `${plural(n, 'pose l’utilise', 'poses l’utilisent')}. Elles ne seront pas supprimées, seulement sans ${word}.` : '',
            ok: 'Supprimer', danger: true
          });
          if (ok) await removeFromList(kind, name);
        }
        render(view);
      }
      if (e.target.closest('[data-add]')) {
        const v = await formDialog({ heading: `Nouvelle ${word}`, fields: [{ name: 'name', label: 'Nom', required: true }], ok: 'Ajouter' });
        if (v && v.name) {
          if (state[kind].includes(v.name)) { toast('Ce nom existe déjà.'); return; }
          await saveList(kind, [...state[kind], v.name]);
          render(view);
        }
      }
    });
  });

  /* ----- Taille du texte ----- */
  $('#textsize').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    await setPref('shootText', b.dataset.v);
    view.querySelectorAll('#textsize button').forEach((x) => x.classList.toggle('on', x === b));
  });

  /* ----- Espace utilisé ----- */
  (async () => {
    let text = plural(state.poses.length, 'pose', 'poses');
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const { usage } = await navigator.storage.estimate();
        text += ` · environ ${formatBytes(usage || 0)} utilisés`;
      }
      if (navigator.storage && navigator.storage.persisted) {
        text += (await navigator.storage.persisted()) ? ' · stockage protégé' : '';
      }
    } catch (e) { /* ignoré */ }
    const el = $('#storage');
    if (el) el.textContent = text;
  })();
}

function listEditor(kind) {
  const word = kind === 'categories' ? 'une catégorie' : 'une lumière';
  return `
    <ul class="list-editor" data-kind="${kind}">
      ${state[kind].map((name) => {
        const n = countUsing(kind, name);
        return `<li><button type="button" data-name="${esc(name)}">
          <span>${esc(name)}</span><span class="count">${n || ''}</span>${icon('next', 'chev')}</button></li>`;
      }).join('')}
      <li><button type="button" class="add" data-add>${icon('plus')}<span>Ajouter ${word}</span></button></li>
    </ul>`;
}
