import { useAuthStore } from '../auth.store';
import { tokenStorage } from '@services/storage/secureStorage';
import { setSessionExpiredCallback } from '@services/apiClient';

// Mock dependencies
jest.mock('@services/storage/secureStorage', () => ({
  tokenStorage: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('@services/apiClient', () => ({
  apiFetch: jest.fn(),
  setSessionExpiredCallback: jest.fn(),
  ApiError: class MockApiError extends Error {
    public status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
    get isUnauthorized() { return this.status === 401; }
  },
}));

const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;
const mockSetSessionExpiredCallback = setSessionExpiredCallback as jest.MockedFunction<typeof setSessionExpiredCallback>;

describe('AuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useAuthStore.setState({
      tokens: null,
      user: null,
      isInitialized: false,
      isAuthenticated: false,
      hasPlayerTag: false,
    });
  });

  describe('isTokenExpired', () => {
    it('should return false when no tokens exist', () => {
      const { isTokenExpired } = useAuthStore.getState();
      
      expect(isTokenExpired()).toBe(false);
    });

    it('should return false when no expiresAt is set', () => {
      useAuthStore.setState({
        tokens: { accessToken: 'token-123' },
      });
      
      const { isTokenExpired } = useAuthStore.getState();
      
      expect(isTokenExpired()).toBe(false);
    });

    it('should return false when token is not expired', () => {
      const futureTime = Date.now() + 60000; // 1 minute in future
      useAuthStore.setState({
        tokens: { 
          accessToken: 'token-123', 
          expiresAt: futureTime 
        },
      });
      
      const { isTokenExpired } = useAuthStore.getState();
      
      expect(isTokenExpired()).toBe(false);
    });

    it('should return true when token is expired', () => {
      const pastTime = Date.now() - 60000; // 1 minute in past
      useAuthStore.setState({
        tokens: { 
          accessToken: 'token-123', 
          expiresAt: pastTime 
        },
      });
      
      const { isTokenExpired } = useAuthStore.getState();
      
      expect(isTokenExpired()).toBe(true);
    });
  });

  describe('handleSessionExpired', () => {
    it('should clear token storage and reset auth state', async () => {
      // Set up initial state
      useAuthStore.setState({
        tokens: { accessToken: 'token-123' },
        user: { id: '1', sub: 'user-1', name: 'Test User', verified: true },
        isAuthenticated: true,
        hasPlayerTag: true,
      });
      
      const { handleSessionExpired } = useAuthStore.getState();
      
      await handleSessionExpired();
      
      expect(mockTokenStorage.clear).toHaveBeenCalled();
      
      const state = useAuthStore.getState();
      expect(state.tokens).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.hasPlayerTag).toBe(false);
    });
  });

  describe('initializeAuth', () => {
    it('should set up session expired callback when tokens exist', async () => {
      const mockTokens = { 
        accessToken: 'token-123', 
        refreshToken: 'refresh-456',
        expiresAt: Date.now() + 3600000 // 1 hour from now
      };
      
      mockTokenStorage.get.mockResolvedValue(mockTokens);
      
      const { initializeAuth } = useAuthStore.getState();
      
      await initializeAuth();
      
      expect(mockSetSessionExpiredCallback).toHaveBeenCalledWith(expect.any(Function));
      
      const state = useAuthStore.getState();
      expect(state.tokens).toEqual(mockTokens);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitialized).toBe(true);
    });

    it('should handle case when no tokens exist', async () => {
      mockTokenStorage.get.mockResolvedValue(null);
      
      const { initializeAuth } = useAuthStore.getState();
      
      await initializeAuth();
      
      expect(mockSetSessionExpiredCallback).not.toHaveBeenCalled();
      
      const state = useAuthStore.getState();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitialized).toBe(true);
    });
  });
});