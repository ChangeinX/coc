const CACHE_NAME = 'api-cache-v1';
const VAPID_PUBLIC_KEY = '';
const SW_VERSION = '';
console.log('Service Worker', SW_VERSION);
const API_TTL = 60 * 1000; // 1 minute
const ASSET_TTL = 30 * 60 * 1000; // 30 minutes
const COOKIE_PATH = '/cookies-20250729.html';
const PRIVACY_PATH = '/privacy-policy.html';
const TERMS_PATH = '/terms.html';
const LEGAL_FILES = [COOKIE_PATH, PRIVACY_PATH, TERMS_PATH];


let notificationCount = 0;
// track how many detailed friend message notifications were shown
let friendDetailCount = 0;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(LEGAL_FILES))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      broadcastBadgeCount();
    })
  );
});

function broadcastBadgeCount() {
  self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: 'badge-count', count: notificationCount });
    }
  });
}

const subscribedChats = new Set();

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

async function logError(message) {
  try {
    await fetch('/api/v1/log', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  } catch (err) {
    console.warn('Failed to send log', err);
  }
}

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg) return;
  if (msg.type === 'subscribe-chats' && Array.isArray(msg.ids)) {
    for (const id of msg.ids) {
      if (typeof id === 'string') subscribedChats.add(id);
    }
    console.log('Subscribed chats updated', [...subscribedChats]);
  } else if (msg.type === 'clear-badge') {
    notificationCount = 0;
    friendDetailCount = 0;
    if (self.registration.clearAppBadge) {
      self.registration.clearAppBadge().catch(() => {});
    } else if (self.registration.clearClientBadge) {
      self.registration.clearClientBadge().catch(() => {});
    }
    broadcastBadgeCount();
  } else if (msg.type === 'get-badge') {
    if (event.source) {
      event.source.postMessage({ type: 'badge-count', count: notificationCount });
    } else {
      broadcastBadgeCount();
    }
  }
});


self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    console.error('Failed to parse push payload', err);
    logError(`push parse failed: ${err}`);
  }
  console.log('Push event payload', data);
  const name = data.name;
  const title = name || 'Clan Boards';
  const senderId = data.senderId;
  const preview = data.body || '';
  const url = data.url || '/';
  const tag = data.tag || 'chat';
  event.waitUntil(
    (async () => {
      let body = preview;
      const options = { data: { url }, tag };
    const isFriendMessage = tag.startsWith('friend-');
    if (isFriendMessage) {
      friendDetailCount += 1;
      if (friendDetailCount === 3) {
        body = 'You have unread messages';
      } else if (friendDetailCount > 3) {
        return;
      }
    }
    notificationCount += 1;
    if (self.registration.setAppBadge) {
      await self.registration.setAppBadge(notificationCount).catch(() => {});
    } else if (self.registration.setClientBadge) {
      await self.registration.setClientBadge(notificationCount).catch(() => {});
    }
    await self.registration.showNotification(title, { ...options, body });
    broadcastBadgeCount();
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: 'refresh' });
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (notificationCount > 0) {
    notificationCount = 0;
    if (self.registration.clearAppBadge) {
      event.waitUntil(self.registration.clearAppBadge().catch(() => {}));
    } else if (self.registration.clearClientBadge) {
      event.waitUntil(self.registration.clearClientBadge().catch(() => {}));
    }
    broadcastBadgeCount();
  }
  if (event.notification.tag && event.notification.tag.startsWith('friend-')) {
    friendDetailCount = 0;
  }
  const url = event.notification.data && event.notification.data.url;
  const openUrl = url && url.startsWith('/') ? '/#' + url : url;
  if (openUrl) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          if (client.url.includes(openUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(openUrl);
        }
      })
    );
  }
});

self.addEventListener('notificationclose', (event) => {
  if (event.notification.tag && event.notification.tag.startsWith('friend-')) {
    friendDetailCount = 0;
  }
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
      .catch((err) => {
        console.error('resubscribe failed', err);
        logError(`resubscribe failed: ${err}`);
      })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag && event.tag.startsWith('join-')) {
    const id = event.tag.slice(5);
    event.waitUntil(
      fetch(`/api/v1/recruiting/join/${id}`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => self.registration.sync.register(event.tag))
    );
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname === '/api/v1/recruiting/recruit') {
    event.respondWith(staleWhileRevalidateRecruit(event));
    return;
  }
  if (url.origin === self.location.origin && (url.pathname === '/privacy' || url.pathname === '/privacy.html')) {
    event.respondWith(cacheFirstDoc(COOKIE_PATH));
    return;
  }
  if (url.origin === self.location.origin && (url.pathname === '/privacy-policy' || url.pathname === '/privacy-policy.html')) {
    event.respondWith(cacheFirstDoc(PRIVACY_PATH));
    return;
  }
  if (url.origin === self.location.origin && (url.pathname === '/terms' || url.pathname === '/terms.html')) {
    event.respondWith(cacheFirstDoc(TERMS_PATH));
    return;
  }
  if (url.origin === self.location.origin && url.pathname === COOKIE_PATH) {
    event.respondWith(cacheFirstDoc(COOKIE_PATH));
    return;
  }
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith('/api/') &&
    event.request.method === 'GET'
  ) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  const isDoc =
    url.origin === self.location.origin &&
    (url.pathname === '/privacy' || url.pathname.startsWith('/cookies-'));

  if (isDoc) {
    const req =
      url.pathname === '/privacy'
        ? new Request('/cookies-20250729.html')
        : event.request;
    event.respondWith(cacheFirstDoc(req));
  }
});

async function cacheFirstDoc(request) {
  const cache = await caches.open('doc-cache-v1');
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

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
      } catch (err) {
        console.warn('Failed to parse API response for caching', err);
      }
      return response;
    })
    .catch((err) => {
      console.error('Network request failed', err);
      logError(`fetch failed: ${err}`);
      throw err;
    });
  if (cached) return cached;
  return network; // let it reject
}

async function staleWhileRevalidateRecruit(event) {
  const cache = await caches.open('recruit');
  const request = event.request;
  const cached = await cache.match(request);
  const keys = await cache.keys();
  const network = fetch(request)
    .then((resp) => {
      if (cached || keys.length < 2) {
        cache.put(request, resp.clone());
      }
      return resp;
    })
    .catch((err) => {
      console.error('Recruit fetch failed', err);
      if (!cached) throw err;
      return undefined;
    });
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return network;
}

async function cacheFirst(path) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(path);
  if (cached) return cached;
  const resp = await fetch(path);
  cache.put(path, resp.clone());
  return resp;
}
