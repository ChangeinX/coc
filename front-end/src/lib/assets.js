import { API_URL } from './api.js';
import { getIconCache, putIconCache } from './db.js';

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
    return cached.blob;
  }
  const res = await fetch(proxied);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  await putIconCache({ url: proxied, blob });
  return blob;
}
