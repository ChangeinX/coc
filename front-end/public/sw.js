const CACHE_NAME = 'api-cache-v1';
const VAPID_PUBLIC_KEY = '';
const API_TTL = 60 * 1000; // 1 minute
const ASSET_TTL = 30 * 60 * 1000; // 30 minutes

// cache player info fetched during push handling
const PLAYER_CACHE = 'player-info-cache-v1';
const PLAYER_TTL = 6 * 60 * 60 * 1000; // 6 hours

let notificationCount = 0;
// track how many detailed friend message notifications were shown
let friendDetailCount = 0;
let authToken = null;

self.addEventListener('install', (event) => {
  self.skipWaiting();
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
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge().catch(() => {});
    }
    broadcastBadgeCount();
  } else if (msg.type === 'get-badge') {
    if (event.source) {
      event.source.postMessage({ type: 'badge-count', count: notificationCount });
    } else {
      broadcastBadgeCount();
    }
  } else if (msg.type === 'set-token') {
    authToken = msg.token || null;
  }
});

async function getPlayerInfo(userId) {
  const cache = await caches.open(PLAYER_CACHE);
  const url = `/api/v1/player/by-user/${encodeURIComponent(userId)}`;
  const req = new Request(url);
  let resp = await cache.match(req);
  if (resp) {
    const ts = parseInt(resp.headers.get('sw-cache-time') || '0', 10);
    if (Date.now() - ts <= PLAYER_TTL) {
      try {
        return await resp.clone().json();
      } catch (err) {
        await cache.delete(req);
      }
    } else {
      await cache.delete(req);
    }
  }
  const net = await fetch(url, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  }).catch(() => null);
  if (net && net.ok) {
    const cloned = net.clone();
    const headers = new Headers(cloned.headers);
    headers.set('sw-cache-time', Date.now().toString());
    const body = await cloned.blob();
    cache.put(req, new Response(body, { status: cloned.status, statusText: cloned.statusText, headers }));
    return net.json();
  }
  return null;
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    console.error('Failed to parse push payload', err);
  }
  console.log('Push event payload', data);
  const title = 'Clan Boards';
  const senderId = data.senderId;
  const preview = data.body || '';
  const url = data.url || '/';
  const tag = data.tag || 'chat';
  const promise = (async () => {
    let body = preview;
    const options = { data: { url }, tag };
    if (senderId) {
      try {
        const info = await getPlayerInfo(senderId);
        if (info) {
          options.icon = info.leagueIcon || options.icon;
          body = `${info.name}: ${preview}`;
        }
      } catch (err) {
        console.error('Failed to fetch sender info', err);
      }
    }
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
    if (navigator.setAppBadge) {
      await navigator.setAppBadge(notificationCount).catch(() => {});
    }
    await self.registration.showNotification(title, { ...options, body });
    broadcastBadgeCount();
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'refresh' });
    }
  })();
  event.waitUntil(promise);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (notificationCount > 0) {
    notificationCount = 0;
    if (navigator.clearAppBadge) {
      event.waitUntil(navigator.clearAppBadge().catch(() => {}));
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
      } catch (err) {
        console.warn('Failed to parse API response for caching', err);
      }
      return response;
    })
    .catch((err) => {
      console.error('Network request failed', err);
      throw err;
    });
  if (cached) return cached;
  return network; // let it reject
}
