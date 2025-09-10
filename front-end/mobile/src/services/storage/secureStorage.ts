import * as SecureStore from 'expo-secure-store';

export type TokenBundle = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp in milliseconds
};

export type TokenStorage = {
  get: () => Promise<TokenBundle | null>;
  set: (tokens: TokenBundle) => Promise<void>;
  clear: () => Promise<void>;
  isBiometricEnabled: () => Promise<boolean>;
};

const ACCESS_KEY = 'auth.accessToken';
const REFRESH_KEY = 'auth.refreshToken';
const EXPIRES_AT_KEY = 'auth.expiresAt';
const BIOMETRIC_KEY = 'auth.biometric.enabled';

export const tokenStorage: TokenStorage = {
  async get() {
    const accessToken = await SecureStore.getItemAsync(ACCESS_KEY);
    if (!accessToken) return null;
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    const expiresAtStr = await SecureStore.getItemAsync(EXPIRES_AT_KEY);
    const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : undefined;
    
    const bundle: TokenBundle = {
      accessToken,
      ...(refreshToken && { refreshToken }),
      ...(expiresAt && { expiresAt })
    };
    return bundle;
  },
  async set(tokens) {
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK, // iOS
      requireAuthentication: false,
    });
    if (tokens.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        requireAuthentication: false,
      });
    }
    if (tokens.expiresAt) {
      await SecureStore.setItemAsync(EXPIRES_AT_KEY, tokens.expiresAt.toString(), {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        requireAuthentication: false,
      });
    }
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(EXPIRES_AT_KEY);
  },
  async isBiometricEnabled() {
    const flag = await SecureStore.getItemAsync(BIOMETRIC_KEY);
    return flag === '1';
  },
};
