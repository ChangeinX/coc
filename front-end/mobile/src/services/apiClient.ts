import { API_URL, AUTH_URL } from '@env';
import { tokenStorage } from '@services/storage/secureStorage';

let requestCounter = 0;

function generateCorrelationId(): string {
  return `mobile-${Date.now()}-${++requestCounter}`;
}

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

async function withAuth(headers: Headers, correlationId: string): Promise<Headers> {
  const tokens = await tokenStorage.get();
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    
    // Log token info for debugging
    const tokenParts = tokens.accessToken.split('.');
    if (tokenParts.length === 3) {
      try {
        const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const expiryTime = payload.exp * 1000;
        const now = Date.now();
        const timeToExpiry = expiryTime - now;
        
        console.log(`[${correlationId}] Token info:`, {
          hasToken: true,
          expiresAt: new Date(expiryTime).toISOString(),
          timeToExpiryMs: timeToExpiry,
          isExpired: timeToExpiry <= 0,
          tokenLength: tokens.accessToken.length
        });
      } catch (e) {
        console.log(`[${correlationId}] Token present but failed to parse expiry:`, e);
      }
    }
  } else {
    console.log(`[${correlationId}] No access token available`);
  }
  return headers;
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const correlationId = generateCorrelationId();
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const headers = new Headers({ 'Content-Type': 'application/json' });
  
  // Add correlation ID header
  headers.set('X-Request-ID', correlationId);
  
  if (opts.headers) {
    const incoming = new Headers(opts.headers as HeadersInit);
    incoming.forEach((v, k) => headers.set(k, v));
  }
  
  const startTime = Date.now();
  
  // Log request details
  console.log(`[${correlationId}] 🚀 API REQUEST:`, {
    method: opts.method || 'GET',
    url,
    hasAuth: Boolean(opts.auth),
    timestamp: new Date().toISOString()
  });
  
  if (opts.auth) await withAuth(headers, correlationId);

  let res = await fetch(url, { ...opts, headers });
  
  // Log initial response
  const duration = Date.now() - startTime;
  console.log(`[${correlationId}] 📥 API RESPONSE:`, {
    status: res.status,
    statusText: res.statusText,
    durationMs: duration,
    headers: Object.fromEntries(res.headers.entries())
  });
  
  if (res.status === 401 && opts.auth) {
    console.log(`[${correlationId}] 🔄 Attempting token refresh due to 401...`);
    const refreshed = await tryRefresh();
    if (refreshed) {
      console.log(`[${correlationId}] ✅ Token refresh successful, retrying request...`);
      // Rebuild headers to include new access token
      const retryHeaders = new Headers({ 'Content-Type': 'application/json' });
      retryHeaders.set('X-Request-ID', correlationId);
      if (opts.headers) new Headers(opts.headers as HeadersInit).forEach((v, k) => retryHeaders.set(k, v));
      await withAuth(retryHeaders, correlationId);
      
      const retryStartTime = Date.now();
      res = await fetch(url, { ...opts, headers: retryHeaders });
      const retryDuration = Date.now() - retryStartTime;
      
      console.log(`[${correlationId}] 📥 API RETRY RESPONSE:`, {
        status: res.status,
        statusText: res.statusText,
        durationMs: retryDuration,
        headers: Object.fromEntries(res.headers.entries())
      });
    } else {
      console.log(`[${correlationId}] ❌ Token refresh failed`);
    }
  }
  if (!res.ok) {
    let errorResponse: ApiErrorResponse | undefined;
    let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
    
    console.log(`[${correlationId}] ❌ API ERROR RESPONSE:`, {
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get('content-type'),
      url
    });
    
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        console.log(`[${correlationId}] Error JSON response:`, errorData);
        if (errorData && typeof errorData === 'object') {
          errorResponse = errorData as ApiErrorResponse;
          errorMessage = errorResponse.message || errorMessage;
        }
      } else {
        const text = await res.text().catch(() => '');
        console.log(`[${correlationId}] Error text response:`, text);
        if (text) {
          errorMessage = `HTTP ${res.status}: ${text}`;
        }
      }
    } catch (parseError) {
      // If we can't parse the error response, fall back to status text
      console.warn(`[${correlationId}] Failed to parse error response:`, parseError);
    }
    
    throw new ApiError(errorMessage, res.status, errorResponse);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

let refreshPromise: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) {
    console.log('🔄 Token refresh already in progress, waiting...');
    return refreshPromise;
  }
  
  refreshPromise = (async () => {
    const refreshId = generateCorrelationId();
    console.log(`[${refreshId}] 🔄 Starting token refresh...`);
    
    try {
      const tokens = await tokenStorage.get();
      const rt = tokens?.refreshToken;
      if (!rt) {
        console.warn(`[${refreshId}] ❌ No refresh token available for token refresh`);
        await tokenStorage.clear();
        return false;
      }
      
      console.log(`[${refreshId}] 📤 Making refresh request to auth service...`);
      const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rt }).toString();
      const refreshStartTime = Date.now();
      const res = await fetch(`${AUTH_URL}/api/v1/users/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      
      const refreshDuration = Date.now() - refreshStartTime;
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unable to read error response');
        console.warn(`[${refreshId}] ❌ Token refresh failed with status ${res.status} (${refreshDuration}ms):`, errorText);
        await tokenStorage.clear();
        triggerSessionExpired();
        return false;
      }
      
      const data = await res.json();
      const expiresAt = Date.now() + (data.expires_in * 1000); // Convert seconds to milliseconds
      
      const newTokens = { 
        accessToken: data.access_token, 
        refreshToken: rt,
        expiresAt 
      };
      
      await tokenStorage.set(newTokens);
      
      // Update auth store state to prevent continuous refresh attempts
      const { useAuthStore } = await import('@store/auth.store');
      useAuthStore.getState().updateTokens(newTokens);
      
      console.log(`[${refreshId}] ✅ Token refresh successful (${refreshDuration}ms):`, {
        newTokenLength: data.access_token.length,
        expiresAt: new Date(expiresAt).toISOString(),
        expiresInSeconds: data.expires_in
      });
      return true;
    } catch (error) {
      console.error(`[${refreshId}] ❌ Token refresh error:`, error);
      await tokenStorage.clear();
      triggerSessionExpired();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}
