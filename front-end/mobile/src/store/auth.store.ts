import { create } from 'zustand';
import { tokenStorage, TokenBundle } from '@services/storage/secureStorage';

type AuthState = {
  tokens: TokenBundle | null;
  setTokens: (t: TokenBundle | null) => Promise<void>;
  isAuthenticated: boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  tokens: null,
  isAuthenticated: false,
  setTokens: async (tokens) => {
    if (tokens) {
      await tokenStorage.set(tokens);
    } else {
      await tokenStorage.clear();
    }
    set({ tokens, isAuthenticated: !!tokens?.accessToken });
  },
}));

