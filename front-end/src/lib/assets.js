import { API_URL } from './api.js';
import { getIconCache, putIconCache } from './db.js';

const ICON_TTL = 30 * 60 * 1000; // 30 minutes

const API_PREFIX = '/api/v1';

export function proxyImageUrl(url) {
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${API_PREFIX}/assets?url=${encodeURIComponent(url)}`;
}

export async function fetchCachedIcon(url) {
  if (!url || !/^https?:\/\//i.test(url)) return undefined;
  const proxied = proxyImageUrl(url);
  const cached = await getIconCache(proxied);
  if (cached) {
    const age = Date.now() - cached.ts;
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
  await putIconCache({ url: proxied, ts: Date.now(), blob });
  return blob;
}
