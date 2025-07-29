import { API_URL } from './api.js';
import { getIconCache, putIconCache } from './db.js';

const ICON_TTL = 30 * 60 * 1000; // 30 minutes
// in memory cache used for global chat where the number of league
// badges can grow quickly. Each entry mirrors the structure stored in
// indexedDB but lives only for the current session.
const memoryCache = new Map();

const API_PREFIX = '/api/v1';

export function proxyImageUrl(url) {
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${API_PREFIX}/assets?url=${encodeURIComponent(url)}`;
}

export async function fetchCachedIcon(url, strategy = 'indexed') {
  if (!url || !/^https?:\/\//i.test(url)) return undefined;
  const proxied = proxyImageUrl(url);
  const now = Date.now();

  if (strategy === 'memory') {
    const cached = memoryCache.get(proxied);
    if (cached) {
      const age = now - cached.ts;
      if (age < ICON_TTL) {
        // refresh icon in background when stale but still valid
        if (age > ICON_TTL / 2) {
          fetch(proxied)
            .then((res) => (res.ok ? res.blob() : null))
            .then((blob) => {
              if (blob) memoryCache.set(proxied, { blob, ts: Date.now() });
            })
            .catch(() => {});
        }
        return cached.blob;
      }
    }
    const res = await fetch(proxied);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    memoryCache.set(proxied, { blob, ts: now });
    return blob;
  }

  const cached = await getIconCache(proxied);
  if (cached) {
    const age = now - cached.ts;
    if (age < ICON_TTL) {
      return cached.blob;
    }
    // refresh icon in background
    fetch(proxied)
      .then(async (res) => {
        if (res.ok) {
          const blob = await res.blob();
          await putIconCache({ url: proxied, ts: Date.now(), blob });
        }
      })
      .catch(() => {});
    return cached.blob;
  }
  const res = await fetch(proxied);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  await putIconCache({ url: proxied, ts: now, blob });
  return blob;
}
