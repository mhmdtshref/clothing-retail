/* Simple SW: navigation NetworkFirst with offline fallback, static CacheFirst, JSON SWR + mutation invalidation */
const APP_CACHE = 'app-cache-v3';
const STATIC_CACHE = 'static-cache-v1';
const STATIC_ASSETS = ['/offline.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => ![APP_CACHE, STATIC_CACHE].includes(k)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isNavigation(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  );
}

function shouldInvalidateAfterMutation(request, url) {
  if (!request || !url) return false;
  // Only handle same-origin API mutations.
  if (url.origin !== self.location.origin) return false;

  const p = url.pathname;
  const m = String(request.method || '').toUpperCase();

  // Create new product
  if (m === 'POST' && p === '/api/products') return true;
  // Update product
  if (m === 'PATCH' && p.startsWith('/api/products/')) return true;
  // Add variants
  if (m === 'POST' && p.startsWith('/api/products/') && p.endsWith('/variants/generate')) return true;
  // Update product variant qty (inventory)
  if (m === 'PATCH' && p.startsWith('/api/inventory/')) return true;
  // Add new sale / delivery (receipts)
  if (m === 'POST' && p === '/api/receipts') return true;

  return false;
}

function shouldDeleteCachedApiPath(pathname) {
  if (!pathname) return false;
  return (
    pathname === '/api/products' ||
    pathname.startsWith('/api/products/') ||
    pathname === '/api/pos/search' ||
    pathname === '/api/receipts' ||
    pathname.startsWith('/api/receipts/')
  );
}

async function invalidateAfterMutation() {
  try {
    const cache = await caches.open(APP_CACHE);
    const keys = await cache.keys();
    await Promise.all(
      keys.map((req) => {
        try {
          const u = new URL(req.url);
          if (shouldDeleteCachedApiPath(u.pathname)) return cache.delete(req);
        } catch {}
        return undefined;
      }),
    );
  } catch {}
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Non-GET mutations: pass-through, but invalidate relevant cached GET APIs on success.
  if (request.method !== 'GET') {
    if (shouldInvalidateAfterMutation(request, url)) {
      event.respondWith(
        fetch(request).then((res) => {
          if (res && res.ok) event.waitUntil(invalidateAfterMutation());
          return res;
        }),
      );
    }
    return;
  }

  if (isNavigation(request)) {
    // Network-first for navigations
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          const cachePut = caches
            .open(APP_CACHE)
            .then((c) => c.put(request, copy))
            .catch(() => {});
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
          caches
            .open(STATIC_CACHE)
            .then((c) => c.put(request, copy))
            .catch(() => {});
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
            // Cache only successful responses (avoid caching 401/500/etc).
            if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
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
// Fetch handler above provides caching + mutation invalidation
