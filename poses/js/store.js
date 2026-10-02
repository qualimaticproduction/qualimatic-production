/* ============================================
   QUALIMATIC POSES — store.js
   Les données de l'appli en mémoire + leurs modifications.
   ============================================ */

import { db, DEFAULT_CATEGORIES, DEFAULT_LIGHTS, uid } from './db.js';
import { processPhoto, bufferToUrl } from './images.js';

export const state = {
  poses: [],
  sessions: [],
  categories: [],
  lights: [],
  prefs: { shootText: 'grand' },
  lastBackup: null,
  firstUse: null,
  // filtres du catalogue (conservés pendant la navigation)
  filters: { q: '', category: '', light: '', fav: false, todo: false }
};

export async function loadAll() {
  const [poses, sessions, categories, lights, prefs, lastBackup, firstUse] = await Promise.all([
    db.getAll('poses'),
    db.getAll('sessions'),
    db.getSetting('categories', null),
    db.getSetting('lights', null),
    db.getSetting('prefs', null),
    db.getSetting('lastBackup', null),
    db.getSetting('firstUse', null)
  ]);
  state.poses = poses.sort((a, b) => b.createdAt - a.createdAt);
  state.sessions = sessions;
  state.categories = categories || [...DEFAULT_CATEGORIES];
  state.lights = lights || [...DEFAULT_LIGHTS];
  state.prefs = { ...state.prefs, ...(prefs || {}) };
  state.lastBackup = lastBackup;
  state.firstUse = firstUse || Date.now();
  if (!categories) await db.setSetting('categories', state.categories);
  if (!lights) await db.setSetting('lights', state.lights);
  if (!firstUse) await db.setSetting('firstUse', state.firstUse);
}

/* ----- Poses ----- */

export function getPose(id) {
  return state.poses.find((p) => p.id === id);
}

export function isIncomplete(p) {
  return !p.title || !p.category;
}

export function emptyPose() {
  return {
    id: uid(), title: '', category: '', p1: '', p2: '', camera: '',
    accessory: '', light: '', notes: '', fav: false, ratio: 0.8,
    createdAt: Date.now(), updatedAt: Date.now()
  };
}

/* Vignettes gardées en mémoire pour une grille fluide */
const thumbCache = new Map();

export async function thumbUrl(id) {
  if (thumbCache.has(id)) return thumbCache.get(id);
  const img = await db.get('images', id);
  if (!img) return '';
  const url = bufferToUrl(img.thumb);
  thumbCache.set(id, url);
  return url;
}

/* Photo plein format : à libérer avec URL.revokeObjectURL quand elle n'est plus affichée */
export async function fullUrl(id) {
  const img = await db.get('images', id);
  return img ? bufferToUrl(img.full) : '';
}

function forgetThumb(id) {
  const url = thumbCache.get(id);
  if (url) URL.revokeObjectURL(url);
  thumbCache.delete(id);
}

export function clearThumbCache() {
  [...thumbCache.keys()].forEach(forgetThumb);
}

/* Import d'une ou plusieurs photos de la pellicule */
export async function importFiles(files, onProgress, preset = {}) {
  const created = [];
  const failed = [];
  for (let i = 0; i < files.length; i++) {
    onProgress && onProgress(i, files.length);
    try {
      const { full, thumb, ratio } = await processPhoto(files[i]);
      const pose = { ...emptyPose(), ...preset, ratio, createdAt: Date.now() + i };
      await db.addPose(pose, { id: pose.id, full, thumb });
      created.push(pose);
    } catch (e) {
      failed.push(files[i].name);
    }
  }
  onProgress && onProgress(files.length, files.length);
  state.poses = [...created].reverse().concat(state.poses);
  return { created, failed };
}

export async function replacePhoto(id, file) {
  const { full, thumb, ratio } = await processPhoto(file);
  await db.put('images', { id, full, thumb });
  forgetThumb(id);
  const p = getPose(id);
  if (p) await savePose({ ...p, ratio });
}

export async function savePose(pose) {
  pose.updatedAt = Date.now();
  await db.put('poses', pose);
  const i = state.poses.findIndex((p) => p.id === pose.id);
  if (i >= 0) state.poses[i] = pose; else state.poses.unshift(pose);
}

export async function toggleFav(id) {
  const p = getPose(id);
  if (!p) return;
  p.fav = !p.fav;
  await savePose(p);
  return p.fav;
}

export async function removePose(id) {
  await db.deletePose(id);
  forgetThumb(id);
  state.poses = state.poses.filter((p) => p.id !== id);
  // retire aussi la pose des séances
  for (const s of state.sessions) {
    if (s.items.some((it) => it.poseId === id)) {
      s.items = s.items.filter((it) => it.poseId !== id);
      await saveSession(s);
    }
  }
}

function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function filterPoses(f = state.filters) {
  const q = normalize(f.q).trim();
  return state.poses.filter((p) => {
    if (f.category === '__none') { if (p.category) return false; } else if (f.category && p.category !== f.category) return false;
    if (f.light && p.light !== f.light) return false;
    if (f.fav && !p.fav) return false;
    if (f.todo && !isIncomplete(p)) return false;
    if (q) {
      const hay = normalize([p.title, p.category, p.p1, p.p2, p.camera, p.accessory, p.light, p.notes].join(' '));
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

/* ----- Séances ----- */

export function getSession(id) {
  return state.sessions.find((s) => s.id === id);
}

export async function createSession({ name, date, place }) {
  const s = { id: uid(), name, date, place, items: [], createdAt: Date.now(), updatedAt: Date.now() };
  await saveSession(s);
  return s;
}

export async function saveSession(s) {
  s.updatedAt = Date.now();
  await db.put('sessions', s);
  const i = state.sessions.findIndex((x) => x.id === s.id);
  if (i >= 0) state.sessions[i] = s; else state.sessions.push(s);
}

export async function removeSession(id) {
  await db.delete('sessions', id);
  state.sessions = state.sessions.filter((s) => s.id !== id);
}

export async function addPosesToSession(sessionId, poseIds) {
  const s = getSession(sessionId);
  const existing = new Set(s.items.map((it) => it.poseId));
  poseIds.forEach((id) => { if (!existing.has(id)) s.items.push({ poseId: id, done: false }); });
  await saveSession(s);
}

/* ----- Listes modifiables (catégories, lumières) ----- */

const LIST_FIELD = { categories: 'category', lights: 'light' };

export async function saveList(kind, list) {
  state[kind] = list;
  await db.setSetting(kind, list);
}

export async function renameInList(kind, oldName, newName) {
  const list = state[kind].map((x) => (x === oldName ? newName : x));
  await saveList(kind, list);
  const field = LIST_FIELD[kind];
  const changed = state.poses.filter((p) => p[field] === oldName);
  changed.forEach((p) => { p[field] = newName; p.updatedAt = Date.now(); });
  if (changed.length) await db.putMany('poses', changed);
  if (state.filters[field] === oldName) state.filters[field] = newName;
}

export async function removeFromList(kind, name) {
  await saveList(kind, state[kind].filter((x) => x !== name));
  const field = LIST_FIELD[kind];
  const changed = state.poses.filter((p) => p[field] === name);
  changed.forEach((p) => { p[field] = ''; p.updatedAt = Date.now(); });
  if (changed.length) await db.putMany('poses', changed);
  if (state.filters[field] === name) state.filters[field] = '';
}

export function countUsing(kind, name) {
  const field = LIST_FIELD[kind];
  return state.poses.filter((p) => p[field] === name).length;
}

/* ----- Préférences ----- */

export async function setPref(key, value) {
  state.prefs[key] = value;
  await db.setSetting('prefs', state.prefs);
}

export async function markBackup() {
  state.lastBackup = Date.now();
  await db.setSetting('lastBackup', state.lastBackup);
}

/* Nombre de jours depuis la dernière sauvegarde (ou le premier lancement) */
export function daysSinceBackup() {
  const ref = state.lastBackup || state.firstUse;
  return Math.floor((Date.now() - ref) / 86400000);
}
