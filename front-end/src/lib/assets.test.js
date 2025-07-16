import { describe, it, expect } from 'vitest';
import { proxyImageUrl } from './assets.js';
import { API_URL } from './api.js';

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
