const CACHE_NAME = 'api-cache-v1';
const VAPID_PUBLIC_KEY = '';
const API_TTL = 60 * 1000; // 1 minute
const ASSET_TTL = 30 * 60 * 1000; // 30 minutes

let notificationCount = 0;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const subscribedChats = new Set();

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || msg.type !== 'subscribe-chats' || !Array.isArray(msg.ids)) return;
  for (const id of msg.ids) {
    if (typeof id === 'string') subscribedChats.add(id);
  }
  console.log('Subscribed chats updated', [...subscribedChats]);
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch {}
  const title = data.title || 'Clan Boards';
  const options = {
    body: data.body || '',
    data: { url: data.url || '/' },
    tag: data.tag || 'chat',
  };
  notificationCount += 1;
  if (self.registration.setAppBadge) {
    event.waitUntil(self.registration.setAppBadge(notificationCount).catch(() => {}));
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (notificationCount > 0) {
    notificationCount = 0;
    if (self.registration.clearAppBadge) {
      event.waitUntil(self.registration.clearAppBadge().catch(() => {}));
    }
  }
  const url = event.notification.data && event.notification.data.url;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      .then(async (sub) => {
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: 'pushsubscriptionchange', subscription: sub });
        }
      })
      .catch((err) => console.error('resubscribe failed', err))
  );
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
