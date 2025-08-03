import { vi } from 'vitest';

function setup() {
  vi.resetModules();
  const listeners = {};
  let recruitCache;
  global.fetch = vi.fn(() => Promise.resolve(new Response('ok')));
  global.caches = {
    open: vi.fn(() => {
      if (!recruitCache) {
        recruitCache = {
          store: new Map(),
          match(req) {
            return Promise.resolve(this.store.get(req.url));
          },
          put(req, resp) {
            this.store.set(req.url, resp);
            return Promise.resolve();
          },
          keys() {
            return Promise.resolve(
              Array.from(this.store.keys()).map((url) => new Request(url))
            );
          },
        };
      }
      return Promise.resolve(recruitCache);
    }),
  };
  global.self = {
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
    registration: { sync: { register: vi.fn(() => Promise.resolve()) } },
    clients: { matchAll: vi.fn(() => Promise.resolve([])) },
    location: { origin: 'https://example.com' },
  };
  return listeners;
}

describe('service worker', () => {
  it('replays join requests on sync', async () => {
    const listeners = setup();
    await import('../public/sw.js');
    await listeners.sync({ tag: 'join-1', waitUntil: (p) => p });
    expect(fetch).toHaveBeenCalledWith('/api/v1/recruiting/join/1', {
      method: 'POST',
      credentials: 'include',
    });
  });

  it('caches only first two recruit pages', async () => {
    const listeners = setup();
    await import('../public/sw.js');
    const handler = listeners.fetch;
    const cache = await caches.open('recruit');
    let responsePromise;
    await handler({
      request: new Request('https://example.com/api/v1/recruiting/recruit'),
      respondWith: (p) => (responsePromise = p),
      waitUntil: (p) => p,
    });
    await responsePromise;
    expect((await cache.keys()).length).toBe(1);
    await handler({
      request: new Request(
        'https://example.com/api/v1/recruiting/recruit?pageCursor=abc'
      ),
      respondWith: (p) => (responsePromise = p),
      waitUntil: (p) => p,
    });
    await responsePromise;
    expect((await cache.keys()).length).toBe(2);
    await handler({
      request: new Request(
        'https://example.com/api/v1/recruiting/recruit?pageCursor=def'
      ),
      respondWith: (p) => (responsePromise = p),
      waitUntil: (p) => p,
    });
    await responsePromise;
    expect((await cache.keys()).length).toBe(2);
  });
});
