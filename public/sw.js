/* Katavi E-Kilimo — Service Worker (PWA / offline-first MVP) */
const CACHE_NAME = 'katavi-ekilimo-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/default-image.png',
];

// Install: precache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML navigation, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // API calls: network only (do not cache dynamic data)
  if (url.pathname.startsWith('/api/')) return;

  // Page navigations: network-first with offline fallback to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/offline-shell', copy));
          return response;
        })
        .catch(() => caches.match('/offline-shell').then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Static assets: cache-first then network
  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request)
        .then((response) => {
          if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }))
      .catch(() => caches.match('/default-image.png'))
  );
});