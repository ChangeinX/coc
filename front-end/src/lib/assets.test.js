import { describe, it, expect, vi, afterEach } from 'vitest';
import { proxyImageUrl, fetchCachedIcon } from './assets.js';
import { getIconCache } from './db.js';
import { API_URL } from './api.js';

afterEach(async () => {
  vi.restoreAllMocks();
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('coc-cache');
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
});

describe('proxyImageUrl', () => {
  it('returns same value for empty or relative urls', () => {
    expect(proxyImageUrl('')).toBe('');
    expect(proxyImageUrl(undefined)).toBeUndefined();
    expect(proxyImageUrl('/assets/foo.png')).toBe('/assets/foo.png');
  });

  it('proxies absolute http urls', () => {
    const url = 'https://api-assets.clashofclans.com/foo.png';
    const proxied = `${API_URL}/api/v1/assets?url=${encodeURIComponent(url)}`;
    expect(proxyImageUrl(url)).toBe(proxied);
  });
});

describe('fetchCachedIcon', () => {
  it('fetches and caches icons', async () => {
    const url = 'https://api-assets.clashofclans.com/icon.png';
    const proxied = `${API_URL}/api/v1/assets?url=${encodeURIComponent(url)}`;
    const blob = new Blob(['img'], { type: 'image/png' });
    const fetchMock = vi.fn().mockResolvedValue(new Response(blob, { status: 200 }));
    global.fetch = fetchMock;

    const data1 = await fetchCachedIcon(url);
    expect(fetchMock).toHaveBeenCalledWith(proxied);
    expect(typeof data1.size).toBe('number');

    fetchMock.mockClear();
    const data2 = await fetchCachedIcon(url);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(typeof data2.size).toBe('number');

    const cached = await getIconCache(proxied);
    expect(typeof cached.blob.size).toBe('number');
  });
});
