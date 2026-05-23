const CACHE_NAME = 'escarbato-pwa-v18';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/logo.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/apple-touch-icon.png',
  '/js/app.js',
  '/js/config.js?v=20260523-1',
  '/js/data-store.js?v=20260523-1',
  '/js/pagination.js',
  '/js/pagination.js?v=20260521-1',
  '/js/sort.js',
  '/js/ui.js',
  '/js/ui.js?v=20260523-1',
  '/js/components/dashboard.js',
  '/js/components/productos.js',
  '/js/components/metodos-pago.js',
  '/js/components/cajas.js',
  '/js/components/proveedores.js',
  '/js/components/stock.js',
  '/js/components/tipos.js',
  '/js/components/ventas.js',
  '/js/components/mostrador.js',
  '/js/components/mostrador.js?v=20260519-2',
  '/js/components/peluqueria.js',
  '/js/components/usuarios.js',
  '/js/components/ticket-config.js',
  '/js/ticket.js'
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
    fetch(request).then(response => {
      const responseCopy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, responseCopy));
      return response;
    }).catch(() => caches.match(request))
  );
});
