import { getApiCache, putApiCache } from './db.js';

// Base URL for the backend API. When running the React dev server the
// environment variable `VITE_API_URL` can be used to override this value.
// It defaults to the Flask development server location so that API calls
// from the front-end during local development reach the backend correctly.
// In production the API runs on the same host as the front-end so we use a
// relative path. During local development set `VITE_API_URL` to the backend
// URL (for example `http://localhost:8080`).
let apiUrl = import.meta.env.VITE_API_URL || '';
// If the provided API URL omits a scheme, assume HTTPS to ensure requests
// are sent to the correct host. This also strips any leading slashes so that
// `fetch` doesn't treat the value as a relative path.
if (apiUrl && !/^https?:\/\//i.test(apiUrl)) {
    apiUrl = apiUrl.replace(/^\/*/, '');
    apiUrl = `https://${apiUrl}`;
}
// Strip any trailing slash so we can safely append the API prefix
if (apiUrl.endsWith('/')) {
    apiUrl = apiUrl.slice(0, -1);
}
export const API_URL = apiUrl;

// All API endpoints are versioned under /api/v1 on the backend
const API_PREFIX = '/api/v1';

export async function fetchJSON(path, options = {}) {
    const token = localStorage.getItem('token');
    options.headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${API_URL}${API_PREFIX}${path}`, options);
    if (res.status === 401) {
        localStorage.removeItem('token');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function fetchJSONWithError(path, options = {}) {
    const token = localStorage.getItem('token');
    options.headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${API_URL}${API_PREFIX}${path}`, options);
    if (res.status === 401) {
        localStorage.removeItem('token');
    }
    const text = await res.text();
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { error: text };
    }
    if (!res.ok) {
        const err = new Error(data.error || `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
    }
    return data;
}

const CACHE_PREFIX = 'cache:';
const CACHE_TTL = 60 * 1000; // 1 minute

async function requestWithETag(path, options = {}, etag) {
    const token = localStorage.getItem('token');
    const cleanOptions = { ...options };
    if (!cleanOptions.method || cleanOptions.method.toUpperCase() === 'GET') {
        delete cleanOptions.body;
    }
    const headers = {
        ...(cleanOptions.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(etag ? { 'If-None-Match': etag } : {}),
    };
    const res = await fetch(`${API_URL}${API_PREFIX}${path}`, { ...cleanOptions, headers });
    if (res.status === 401) {
        localStorage.removeItem('token');
    }
    if (res.status === 304) {
        return { notModified: true, etag: res.headers.get('ETag') || etag, data: null };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { notModified: false, etag: res.headers.get('ETag') || etag, data };
}

export async function fetchJSONCached(path, options = {}) {
    const key = `${CACHE_PREFIX}${path}`;
    const cached = await getApiCache(key);

    const hasMeta = cached && Object.prototype.hasOwnProperty.call(cached, 'ts');
    const ts = hasMeta ? cached.ts : 0;
    const data = hasMeta ? cached.data : cached;
    const etag = hasMeta ? cached.etag : null;
    const age = Date.now() - ts;

    if (hasMeta && age < CACHE_TTL) {
        requestWithETag(path, options, etag)
            .then((res) => {
                if (res.notModified) {
                    putApiCache({ path: key, ts: Date.now(), data, etag: res.etag });
                } else {
                    putApiCache({ path: key, ts: Date.now(), data: res.data, etag: res.etag });
                }
            })
            .catch(() => {});
        return data;
    }

    const res = await requestWithETag(path, options, etag);
    if (res.notModified) {
        await putApiCache({ path: key, ts: Date.now(), data, etag: res.etag });
        return data;
    }
    await putApiCache({ path: key, ts: Date.now(), data: res.data, etag: res.etag });
    return res.data;
}
