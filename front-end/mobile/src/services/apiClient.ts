import { API_URL, AUTH_URL } from '@env';
import { tokenStorage } from '@services/storage/secureStorage';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = RequestInit & {
  auth?: boolean;
  signal?: AbortSignal;
};

async function withAuth(headers: Headers): Promise<Headers> {
  const tokens = await tokenStorage.get();
  if (tokens?.accessToken) headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  return headers;
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (opts.headers) {
    const incoming = new Headers(opts.headers as HeadersInit);
    incoming.forEach((v, k) => headers.set(k, v));
  }
  if (opts.auth) await withAuth(headers);

  let res = await fetch(url, { ...opts, headers });
  if (res.status === 401 && opts.auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Rebuild headers to include new access token
      const retryHeaders = new Headers({ 'Content-Type': 'application/json' });
      if (opts.headers) new Headers(opts.headers as HeadersInit).forEach((v, k) => retryHeaders.set(k, v));
      await withAuth(retryHeaders);
      res = await fetch(url, { ...opts, headers: retryHeaders });
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status}: ${text || res.statusText}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

let refreshPromise: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const tokens = await tokenStorage.get();
      const rt = tokens?.refreshToken;
      if (!rt) return false;
      const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rt }).toString();
      const res = await fetch(`${AUTH_URL}/api/v1/users/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) return false;
      const data = await res.json();
      await tokenStorage.set({ accessToken: data.access_token, refreshToken: rt });
      return true;
    } catch {
      await tokenStorage.clear();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}
