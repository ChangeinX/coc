import { tokenStorage, TokenBundle } from '../secureStorage';
import * as SecureStore from 'expo-secure-store';

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('tokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return null when no access token exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      
      const result = await tokenStorage.get();
      
      expect(result).toBeNull();
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('auth.accessToken');
    });

    it('should return token bundle with all fields when available', async () => {
      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-456';
      const mockExpiresAt = '1640995200000'; // Unix timestamp as string
      
      mockSecureStore.getItemAsync
        .mockResolvedValueOnce(mockAccessToken) // accessToken
        .mockResolvedValueOnce(mockRefreshToken) // refreshToken
        .mockResolvedValueOnce(mockExpiresAt); // expiresAt
      
      const result = await tokenStorage.get();
      
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresAt: 1640995200000,
      });
    });

    it('should return token bundle without optional fields when not available', async () => {
      const mockAccessToken = 'access-token-123';
      
      mockSecureStore.getItemAsync
        .mockResolvedValueOnce(mockAccessToken) // accessToken
        .mockResolvedValueOnce(null) // refreshToken
        .mockResolvedValueOnce(null); // expiresAt
      
      const result = await tokenStorage.get();
      
      expect(result).toEqual({
        accessToken: mockAccessToken,
      });
    });
  });

  describe('set', () => {
    it('should store all token fields when provided', async () => {
      const tokens: TokenBundle = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: 1640995200000,
      };
      
      await tokenStorage.set(tokens);
      
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(3);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'auth.accessToken',
        tokens.accessToken,
        expect.any(Object)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'auth.refreshToken',
        tokens.refreshToken,
        expect.any(Object)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'auth.expiresAt',
        tokens.expiresAt!.toString(),
        expect.any(Object)
      );
    });

    it('should store only access token when optional fields not provided', async () => {
      const tokens: TokenBundle = {
        accessToken: 'access-token-123',
      };
      
      await tokenStorage.set(tokens);
      
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'auth.accessToken',
        tokens.accessToken,
        expect.any(Object)
      );
    });
  });

  describe('clear', () => {
    it('should delete all token related items', async () => {
      await tokenStorage.clear();
      
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth.accessToken');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth.refreshToken');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth.expiresAt');
    });
  });
});