/* ============================================
   QUALIMATIC POSES — app.js
   Démarrage, aiguillage entre les écrans, mise à jour hors ligne.
   ============================================ */

import { loadAll } from './store.js';
import { askPersistentStorage } from './db.js';
import { toast, clearStaleToast } from './ui.js';
import * as catalogue from './views/catalogue.js';
import * as viewer from './views/viewer.js';
import * as editor from './views/editor.js';
import * as sessions from './views/sessions.js';
import * as shoot from './views/shoot.js';
import * as settings from './views/settings.js';

/* Les écrans : adresse → affichage */
const routes = [
  { re: /^#\/catalogue$/, tab: 'catalogue', render: catalogue.render },
  { re: /^#\/pose\/([\w]+)$/, keys: ['id'], immersive: true, render: viewer.render },
  { re: /^#\/pose\/([\w]+)\/modifier$/, keys: ['id'], immersive: true, render: editor.render },
  { re: /^#\/seances$/, tab: 'seances', render: sessions.renderList },
  { re: /^#\/seance\/([\w]+)$/, keys: ['id'], tab: 'seances', render: sessions.renderDetail },
  { re: /^#\/seance\/([\w]+)\/tournage(?:\/(\d+))?$/, keys: ['id', 'index'], immersive: true, render: shoot.render },
  { re: /^#\/reglages$/, tab: 'reglages', render: settings.render }
];

const view = document.getElementById('view');
let cleanup = null;
const scrollMemo = {};
let currentHash = '';

function route() {
  const hash = location.hash || '#/catalogue';
  const match = routes.map((r) => ({ r, m: hash.match(r.re) })).find((x) => x.m);
  if (!match) { location.replace('#/catalogue'); return; }

  if (currentHash) scrollMemo[currentHash] = window.scrollY;
  if (cleanup) { cleanup(); cleanup = null; }
  clearStaleToast();

  const params = {};
  (match.r.keys || []).forEach((k, i) => { if (match.m[i + 1] !== undefined) params[k] = match.m[i + 1]; });

  document.body.classList.toggle('immersive', !!match.r.immersive);
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === match.r.tab));

  view.classList.remove('enter');
  const result = match.r.render(view, params);
  cleanup = typeof result === 'function' ? result : null;
  void view.offsetWidth; // relance l'animation d'entrée
  view.classList.add('enter');

  currentHash = hash;
  window.scrollTo(0, match.r.tab && scrollMemo[hash] ? scrollMemo[hash] : 0);
}

/* Toucher l'onglet actif ramène en haut de la page */
document.querySelectorAll('.tabbar a').forEach((a) => {
  a.addEventListener('click', (e) => {
    if (location.hash === a.getAttribute('href')) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
});

/* ----- Hors ligne : service worker ----- */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const offerUpdate = (worker) => {
      toast('Une nouvelle version est prête.', {
        label: 'Mettre à jour',
        run: () => worker.postMessage('skipWaiting')
      });
    };
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
      });
    });
    // vérifie s'il existe une mise à jour à chaque retour dans l'appli
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});

  // on recharge seulement lors d'une mise à jour, pas à la toute première installation
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    reloading = true;
    location.reload();
  });
}

/* ----- Démarrage ----- */
async function start() {
  try {
    await loadAll();
  } catch (e) {
    view.innerHTML = '<div class="page"><div class="empty"><p class="empty-title">Stockage <em>indisponible</em></p><p>Le navigateur bloque l’enregistrement des données (navigation privée ?). Ouvrez l’appli normalement depuis l’écran d’accueil.</p></div></div>';
    return;
  }
  window.addEventListener('hashchange', route);
  route();
  document.body.classList.add('ready');
  askPersistentStorage();
  registerServiceWorker();
}

start();
