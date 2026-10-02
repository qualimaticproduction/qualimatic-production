/* ============================================
   QUALIMATIC POSES — db.js
   Stockage local (IndexedDB), tout reste sur le téléphone.
   ============================================ */

const DB_NAME = 'qualimatic-poses';
const DB_VERSION = 1;

/* Magasins :
   - poses    : les infos de chaque pose (sans la photo, pour rester léger)
   - images   : les photos { id, full, thumb } en ArrayBuffer (plus fiable que Blob sur iPhone)
   - sessions : les séances { id, name, date, place, items: [{ poseId, done }] }
   - settings : réglages clé / valeur (catégories, lumières, date de sauvegarde…) */

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('poses')) db.createObjectStore('poses', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(stores, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result;
    Promise.resolve(fn(t)).then((r) => { result = r; }, reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transaction annulée'));
  });
}

export const db = {
  async getAll(store) {
    return tx([store], 'readonly', (t) => reqToPromise(t.objectStore(store).getAll()));
  },
  async get(store, key) {
    return tx([store], 'readonly', (t) => reqToPromise(t.objectStore(store).get(key)));
  },
  async put(store, value) {
    return tx([store], 'readwrite', (t) => { t.objectStore(store).put(value); });
  },
  async putMany(store, values) {
    return tx([store], 'readwrite', (t) => { const s = t.objectStore(store); values.forEach((v) => s.put(v)); });
  },
  async delete(store, key) {
    return tx([store], 'readwrite', (t) => { t.objectStore(store).delete(key); });
  },
  async clearAll() {
    return tx(['poses', 'images', 'sessions', 'settings'], 'readwrite', (t) => {
      ['poses', 'images', 'sessions', 'settings'].forEach((s) => t.objectStore(s).clear());
    });
  },
  /* Ajoute une pose et sa photo en une seule opération */
  async addPose(pose, image) {
    return tx(['poses', 'images'], 'readwrite', (t) => {
      t.objectStore('poses').put(pose);
      t.objectStore('images').put(image);
    });
  },
  async deletePose(id) {
    return tx(['poses', 'images'], 'readwrite', (t) => {
      t.objectStore('poses').delete(id);
      t.objectStore('images').delete(id);
    });
  },
  async getSetting(key, fallback) {
    const row = await this.get('settings', key);
    return row ? row.value : fallback;
  },
  async setSetting(key, value) {
    return this.put('settings', { key, value });
  }
};

/* ----- Valeurs par défaut ----- */

export const DEFAULT_CATEGORIES = [
  'Préparatifs', 'Couple', 'Cérémonie', 'Cocktail',
  'Famille et invités', 'Détails', 'Signature Chef', 'Corporate'
];

export const DEFAULT_LIGHTS = [
  'Heure dorée', 'Contre-jour', 'Lumière douce / ombre', 'Plein soleil',
  'Intérieur', 'Fenêtre', 'Nuit / lumière artificielle'
];

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* Demande au navigateur de ne pas effacer les données en cas de manque de place */
export async function askPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (e) { /* ignoré */ }
  return false;
}
