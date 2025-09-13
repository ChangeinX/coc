import { apiFetch, ApiError } from '../apiClient';
import { tokenStorage } from '../storage/secureStorage';

// Mock dependencies
jest.mock('../storage/secureStorage');
jest.mock('@env', () => ({
  API_URL: 'https://test-api.com'
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('apiClient logging enhancements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (tokenStorage.get as jest.Mock).mockResolvedValue({
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJleHAiOjk5OTk5OTk5OTl9.signature',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 3600000
    });
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();
  });

  it('should log request details with correlation ID', async () => {
    // Given
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ data: 'test' })
    });

    // When
    await apiFetch('/test', { auth: true });

    // Then
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[mobile-\d+-\d+\] 🚀 API REQUEST:/),
      expect.objectContaining({
        method: 'GET',
        url: 'https://test-api.com/test',
        hasAuth: true,
        timestamp: expect.any(String)
      })
    );
  });

  it('should log token information during authentication', async () => {
    // Given
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: true })
    });

    // When
    await apiFetch('/protected', { auth: true });

    // Then
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[mobile-\d+-\d+\] Token info:/),
      expect.objectContaining({
        hasToken: true,
        expiresAt: expect.any(String),
        timeToExpiryMs: expect.any(Number),
        isExpired: false,
        tokenLength: expect.any(Number)
      })
    );
  });

  it('should log response details including status and headers', async () => {
    // Given
    const mockHeaders = new Headers();
    mockHeaders.set('Content-Type', 'application/json');
    mockHeaders.set('X-Request-ID', 'server-123');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: mockHeaders,
      json: async () => ({ result: 'success' })
    });

    // When
    await apiFetch('/test');

    // Then
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[mobile-\d+-\d+\] 📥 API RESPONSE:/),
      expect.objectContaining({
        status: 200,
        statusText: 'OK',
        durationMs: expect.any(Number),
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-request-id': 'server-123'
        })
      })
    );
  });

  it('should log error responses with detailed information', async () => {
    // Given
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Access Denied', message: 'Insufficient permissions' })
    });

    // When
    try {
      await apiFetch('/protected');
    } catch (error) {
      // Expected to throw
    }

    // Then
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[mobile-\d+-\d+\] ❌ API ERROR RESPONSE:/),
      expect.objectContaining({
        status: 403,
        statusText: 'Forbidden',
        contentType: 'application/json',
        url: 'https://test-api.com/protected'
      })
    );

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[mobile-\d+-\d+\] Error JSON response:/),
      expect.objectContaining({
        error: 'Access Denied',
        message: 'Insufficient permissions'
      })
    );
  });

  it('should log 401 response appropriately', async () => {
    // Given
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers(),
      json: async () => ({ error: 'Token expired' })
    });

    // When
    try {
      await apiFetch('/test', { auth: true });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }

    // Then
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[mobile-\d+-\d+\] ❌ API ERROR RESPONSE:/),
      expect.objectContaining({
        status: 401,
        statusText: 'Unauthorized'
      })
    );
  });

  it('should add X-Request-ID header to requests', async () => {
    // Given
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ data: 'test' })
    });

    // When
    await apiFetch('/test');

    // Then
    const [url, options] = mockFetch.mock.calls[0];
    const headers = options.headers as Headers;
    
    expect(headers.get('X-Request-ID')).toMatch(/mobile-\d+-\d+/);
  });

  it('should handle missing token gracefully', async () => {
    // Given
    (tokenStorage.get as jest.Mock).mockResolvedValue(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ data: 'test' })
    });

    // When
    await apiFetch('/test', { auth: true });

    // Then
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[mobile-\d+-\d+\] No access token available/)
    );
  });

  it('should log token parsing errors', async () => {
    // Given
    (tokenStorage.get as jest.Mock).mockResolvedValue({
      accessToken: 'invalid.jwt.token',
      refreshToken: 'refresh-token'
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ data: 'test' })
    });

    // When
    await apiFetch('/test', { auth: true });

    // Then
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[mobile-\d+-\d+\] Token present but failed to parse expiry:/),
      expect.any(Error)
    );
  });
});