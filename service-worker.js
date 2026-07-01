const VERSION = '1.1.3'; // CHANGER CE NUMÉRO À CHAQUE NOUVELLE MISE À JOUR POUR LE PWA
const CACHE_NAME = 'musesound-v-' + Date.now();

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/app.js',
  './js/modules/api.js',
  './js/modules/config.js',
  './js/modules/jam.js',
  './js/modules/player.js',
  './js/modules/qrcode.min.js',
  './js/modules/state.js',
  './js/modules/ui.js',
  './js/modules/utils.js',
  './js/modules/youtube-private.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Ne gère en cache que les requêtes locales (fichiers de l'app)
  const isLocal = e.request.url.startsWith(self.location.origin);
  
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (isLocal) {
    e.respondWith(
      caches.match(e.request).then((response) => {
        return response || fetch(e.request);
      })
    );
  } else {
    // Laisse passer le flux YouTube / API en direct sans saturer le stockage
    e.respondWith(fetch(e.request));
  }
});