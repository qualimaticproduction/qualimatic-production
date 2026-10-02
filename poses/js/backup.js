/* ============================================
   QUALIMATIC POSES — backup.js
   Export de tout (photos + infos) dans un seul fichier .zip,
   et restauration depuis ce fichier.
   ============================================ */

import { db } from './db.js';
import { ZipWriter, readZip } from './zip.js';
import { processPhoto } from './images.js';
import { state, loadAll, clearThumbCache } from './store.js';
import { todayIso } from './ui.js';

const APP_ID = 'qualimatic-poses';
const FORMAT = 1;

function slug(s) {
  return String(s || 'pose').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'pose';
}

/* Fabrique le fichier de sauvegarde. Renvoie un File prêt à être partagé. */
export async function buildBackup(onProgress) {
  const zip = new ZipWriter();
  const poses = [];
  const total = state.poses.length;

  for (let i = 0; i < total; i++) {
    onProgress && onProgress(i, total);
    const p = state.poses[i];
    const img = await db.get('images', p.id);
    const base = `${slug(p.title)}-${p.id}`;
    const entry = { ...p, photo: `photos/${base}.jpg`, thumb: `vignettes/${base}.jpg` };
    if (img) {
      zip.add(entry.photo, img.full);
      zip.add(entry.thumb, img.thumb);
    }
    poses.push(entry);
  }

  const data = {
    app: APP_ID,
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    categories: state.categories,
    lights: state.lights,
    prefs: state.prefs,
    poses,
    sessions: state.sessions
  };
  zip.add('donnees.json', new TextEncoder().encode(JSON.stringify(data, null, 2)));
  onProgress && onProgress(total, total);

  const blob = zip.finish();
  return new File([blob], `qualimatic-poses-${todayIso()}.zip`, { type: 'application/zip' });
}

/* Lit un fichier de sauvegarde sans rien modifier : renvoie un résumé + de quoi l'appliquer */
export async function inspectBackup(file) {
  const zip = await readZip(file);
  // le fichier peut avoir été décompressé puis recompressé sur un ordinateur
  const jsonName = zip.names.filter((n) => n.endsWith('donnees.json')).sort((a, b) => a.length - b.length)[0];
  if (!jsonName) throw new Error('Ce fichier n’est pas une sauvegarde Qualimatic Poses.');
  const prefix = jsonName.slice(0, -'donnees.json'.length);
  const data = JSON.parse(new TextDecoder().decode(await zip.read(jsonName)));
  if (data.app !== APP_ID) throw new Error('Ce fichier n’est pas une sauvegarde Qualimatic Poses.');
  const names = new Set(zip.names);
  const missingPhotos = (data.poses || []).filter((p) => !p.photo || !names.has(prefix + p.photo)).length;
  return { zip, prefix, data, missingPhotos };
}

/* Applique une sauvegarde. mode = 'replace' (tout remplacer) ou 'merge' (ajouter) */
export async function applyBackup({ zip, prefix, data }, mode, onProgress) {
  const poses = data.poses || [];
  const sessions = data.sessions || [];

  if (mode === 'replace') {
    await db.clearAll();
    clearThumbCache();
    await db.setSetting('categories', data.categories || []);
    await db.setSetting('lights', data.lights || []);
    if (data.prefs) await db.setSetting('prefs', data.prefs);
  } else {
    const union = (a, b) => [...a, ...(b || []).filter((x) => !a.includes(x))];
    await db.setSetting('categories', union(state.categories, data.categories));
    await db.setSetting('lights', union(state.lights, data.lights));
  }

  let missing = 0;
  for (let i = 0; i < poses.length; i++) {
    onProgress && onProgress(i, poses.length);
    const { photo, thumb, ...pose } = poses[i];
    const full = photo ? await zip.read(prefix + photo) : null;
    if (!full) { missing++; continue; }
    let small = thumb ? await zip.read(prefix + thumb) : null;
    if (!small) small = (await processPhoto(new Blob([full], { type: 'image/jpeg' }))).thumb;
    await db.addPose(pose, { id: pose.id, full, thumb: small });
  }
  onProgress && onProgress(poses.length, poses.length);

  if (sessions.length) await db.putMany('sessions', sessions);
  // ce qu'on vient de restaurer existe déjà dans un fichier : c'est une sauvegarde
  await db.setSetting('lastBackup', Date.now());

  await loadAll();
  return { poses: poses.length - missing, sessions: sessions.length, missing };
}

/* Propose d'enregistrer le fichier (feuille de partage iPhone → « Enregistrer dans Fichiers »).
   Doit être appelé directement depuis un toucher. Renvoie true si le fichier a été enregistré. */
export async function shareFile(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
      // partage refusé : on tente le téléchargement classique
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}
