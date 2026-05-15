const CACHE_NAME = 'escarbato-pwa-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/logo.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/apple-touch-icon.png',
  '/assets/icon.svg',
  '/assets/maskable-icon.svg',
  '/js/app.js',
  '/js/config.js',
  '/js/data-store.js',
  '/js/pagination.js',
  '/js/ui.js',
  '/js/components/dashboard.js',
  '/js/components/productos.js',
  '/js/components/proveedores.js',
  '/js/components/stock.js',
  '/js/components/tipos.js',
  '/js/components/ventas.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const responseCopy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, responseCopy));
      return response;
    }))
  );
});
