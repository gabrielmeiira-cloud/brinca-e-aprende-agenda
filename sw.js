// Service Worker - Brinca e Aprende PWA
const CACHE_NAME = 'brinca-aprende-pwa-v4';
const ASSETS_TO_CACHE = [
  './css/style.css',
  './manifest.json',
  './assets/logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('PWA Cache warmup partial fail:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
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

// Network-first para páginas HTML e navegação, cache fallback para estáticos
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Firestore / Google APIs direto na rede
  if (url.origin.includes('firestore.googleapis.com') || url.origin.includes('identitytoolkit') || url.origin.includes('firebase')) {
    return;
  }

  // Requisições de página HTML: SEMPRE busca da rede primeiro para nunca servir HTML com meta tag antiga
  if (event.request.mode === 'navigate' || event.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
