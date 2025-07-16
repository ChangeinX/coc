const CACHE_NAME = 'api-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      cache.put(request, response.clone());
      try {
        const data = await response.clone().json();
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({ type: 'api-update', url: request.url, data });
        }
      } catch {
        // ignore JSON parse errors
      }
      return response;
    })
    .catch(() => undefined);
  if (cached) return cached;
  return network || Response.error();
}
