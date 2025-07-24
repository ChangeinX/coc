const CACHE_NAME = 'api-cache-v1';
const API_TTL = 60 * 1000; // 1 minute
const ASSET_TTL = 30 * 60 * 1000; // 30 minutes

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const subscribedChats = new Set();

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || msg.type !== 'subscribe-chats' || !Array.isArray(msg.ids)) return;
  for (const id of msg.ids) {
    if (typeof id === 'string') subscribedChats.add(id);
  }
  console.log('Subscribed chats updated', [...subscribedChats]);
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  let cached = await cache.match(request);
  if (cached) {
    const ttl = request.url.includes('/assets?') ? ASSET_TTL : API_TTL;
    const ts = parseInt(cached.headers.get('sw-cache-time') || '0', 10);
    if (Date.now() - ts > ttl) {
      await cache.delete(request);
      cached = undefined;
    }
  }
  const network = fetch(request)
    .then(async (response) => {
      const cloned = response.clone();
      const headers = new Headers(cloned.headers);
      headers.set('sw-cache-time', Date.now().toString());
      const body = await cloned.blob();
      const cachedResp = new Response(body, {
        status: cloned.status,
        statusText: cloned.statusText,
        headers,
      });
      cache.put(request, cachedResp);
      try {
        const data = await response.clone().json();
        const etag = response.headers.get('ETag') || null;
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({ type: 'api-update', url: request.url, data, etag });
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
