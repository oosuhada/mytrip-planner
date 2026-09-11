const CACHE = 'mytrip-2026-v9';
const PACK_CACHE = 'mytrip-offline-pack-v3';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  const keep = new Set([CACHE, PACK_CACHE]);
  event.waitUntil(
    caches.keys().then(async (keys) => {
      const upgrading = keys.some((key) => key.startsWith('mytrip-2026-') && key !== CACHE);
      await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
      await self.clients.claim();
      if (upgrading) {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        await Promise.all(windows.map((client) => client.navigate(client.url)));
      }
    }),
  );
});

async function networkFirst(request, timeoutMs = 4000) {
  const cache = await caches.open(CACHE);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('offline');
  }
}

async function cacheFirst(request, cacheName = CACHE) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, 1800).catch(async () => (await caches.open(CACHE)).match('/index.html')));
    return;
  }

  if (url.pathname.startsWith('/api/trips') || url.pathname.startsWith('/api/weather')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || networkFirst(request)));
});
