import { API_URL } from './api.js';

const API_PREFIX = '/api/v1';

export function proxyImageUrl(url) {
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${API_PREFIX}/assets?url=${encodeURIComponent(url)}`;
}
