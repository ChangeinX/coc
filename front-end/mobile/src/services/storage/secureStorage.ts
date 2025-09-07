import * as SecureStore from 'expo-secure-store';

export type TokenBundle = {
  accessToken: string;
  refreshToken?: string;
};

export type TokenStorage = {
  get: () => Promise<TokenBundle | null>;
  set: (tokens: TokenBundle) => Promise<void>;
  clear: () => Promise<void>;
  isBiometricEnabled: () => Promise<boolean>;
};

const ACCESS_KEY = 'auth.accessToken';
const REFRESH_KEY = 'auth.refreshToken';
const BIOMETRIC_KEY = 'auth.biometric.enabled';

export const tokenStorage: TokenStorage = {
  async get() {
    const accessToken = await SecureStore.getItemAsync(ACCESS_KEY);
    if (!accessToken) return null;
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    const bundle: TokenBundle = refreshToken
      ? { accessToken, refreshToken }
      : { accessToken };
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
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
  async isBiometricEnabled() {
    const flag = await SecureStore.getItemAsync(BIOMETRIC_KEY);
    return flag === '1';
  },
};
