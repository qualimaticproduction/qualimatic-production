/* ============================================
   QUALIMATIC POSES — sw.js (service worker)
   Garde une copie de l'appli sur le téléphone pour qu'elle
   fonctionne sans réseau. À chaque mise à jour de l'appli,
   changer VERSION ci-dessous (et dans js/version.js).
   ============================================ */

const VERSION = '1.0.0';
const CACHE = `qualimatic-poses-${VERSION}`;

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/nav.js',
  'js/version.js',
  'js/db.js',
  'js/store.js',
  'js/images.js',
  'js/zip.js',
  'js/backup.js',
  'js/ui.js',
  'js/views/catalogue.js',
  'js/views/viewer.js',
  'js/views/editor.js',
  'js/views/sessions.js',
  'js/views/shoot.js',
  'js/views/settings.js',
  'js/views/swiper.js',
  'fonts/inter-latin-var.woff2',
  'fonts/playfair-400.woff2',
  'fonts/playfair-400-italic.woff2',
  'fonts/playfair-500.woff2',
  'icons/icon.svg',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // cache: 'reload' évite de reprendre une ancienne copie du navigateur
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('qualimatic-poses-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// l'appli demande d'installer la nouvelle version tout de suite
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // ouverture de l'appli : toujours la page enregistrée
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('index.html').then((r) => r || fetch(req)));
    return;
  }
  // le reste : copie enregistrée d'abord, réseau sinon
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
});
