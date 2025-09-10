import { API_URL, AUTH_URL } from '@env';
import { tokenStorage } from '@services/storage/secureStorage';

// Global callback for handling session expiry
let onSessionExpiredCallback: (() => void) | null = null;

export function setSessionExpiredCallback(callback: () => void) {
  onSessionExpiredCallback = callback;
}

export function triggerSessionExpired() {
  if (onSessionExpiredCallback) {
    onSessionExpiredCallback();
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = RequestInit & {
  auth?: boolean;
  signal?: AbortSignal;
};

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: string;
  field?: string;
  path?: string;
  timestamp?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorResponse?: ApiErrorResponse
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isValidationError(): boolean {
    return this.status === 400;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get errorCode(): string | undefined {
    return this.errorResponse?.error;
  }

  get userMessage(): string {
    return this.errorResponse?.message || this.message;
  }
}

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
    let errorResponse: ApiErrorResponse | undefined;
    let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
    
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        if (errorData && typeof errorData === 'object') {
          errorResponse = errorData as ApiErrorResponse;
          errorMessage = errorResponse.message || errorMessage;
        }
      } else {
        const text = await res.text().catch(() => '');
        if (text) {
          errorMessage = `HTTP ${res.status}: ${text}`;
        }
      }
    } catch (parseError) {
      // If we can't parse the error response, fall back to status text
      console.warn('Failed to parse error response:', parseError);
    }
    
    throw new ApiError(errorMessage, res.status, errorResponse);
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
      if (!rt) {
        console.warn('No refresh token available for token refresh');
        await tokenStorage.clear();
        return false;
      }
      
      const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rt }).toString();
      const res = await fetch(`${AUTH_URL}/api/v1/users/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      
      if (!res.ok) {
        console.warn(`Token refresh failed with status ${res.status}`);
        await tokenStorage.clear();
        triggerSessionExpired();
        return false;
      }
      
      const data = await res.json();
      const expiresAt = Date.now() + (data.expires_in * 1000); // Convert seconds to milliseconds
      
      await tokenStorage.set({ 
        accessToken: data.access_token, 
        refreshToken: rt,
        expiresAt 
      });
      
      console.log('Token refresh successful');
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      await tokenStorage.clear();
      triggerSessionExpired();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}
