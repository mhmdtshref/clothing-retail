/* Simple SW: navigation NetworkFirst with offline fallback, static CacheFirst, JSON SWR */
const APP_CACHE = 'app-cache-v1';
const STATIC_CACHE = 'static-cache-v1';
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![APP_CACHE, STATIC_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim())
  );
});

function isNavigation(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass for next dev, APIs that must hit network POST/PUT/DELETE
  if (request.method !== 'GET') return;

  if (isNavigation(request)) {
    // Network-first for navigations
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          const cachePut = caches.open(APP_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          event.waitUntil(cachePut);
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/offline.html');
        }),
    );
    return;
  }

  // Static assets (next build output and public assets) - CacheFirst
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2');
  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        });
      }),
    );
    return;
  }

  // JSON/API GET - StaleWhileRevalidate
  const isJSON = request.headers.get('accept')?.includes('application/json');
  if (isJSON || url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(APP_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            cache.put(request, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
// No fetch handler -> does not interfere with network
