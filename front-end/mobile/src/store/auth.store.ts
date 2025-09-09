import { create } from 'zustand';
import { tokenStorage, TokenBundle } from '@services/storage/secureStorage';
import { apiFetch } from '@services/apiClient';

type UserProfile = {
  id: string;
  sub: string;
  name: string;
  email?: string;
  player_tag?: string;
  verified: boolean;
};

type AuthState = {
  tokens: TokenBundle | null;
  user: UserProfile | null;
  isInitialized: boolean;
  setTokens: (t: TokenBundle | null) => Promise<void>;
  loadUserProfile: () => Promise<void>;
  setUserPlayerTag: (playerTag: string) => Promise<void>;
  initializeAuth: () => Promise<void>;
  isAuthenticated: boolean;
  hasPlayerTag: boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  tokens: null,
  user: null,
  isInitialized: false,
  isAuthenticated: false,
  hasPlayerTag: false,
  
  setTokens: async (tokens) => {
    if (tokens) {
      await tokenStorage.set(tokens);
      set({ tokens, isAuthenticated: !!tokens?.accessToken });
      // Load user profile after setting tokens
      try {
        await get().loadUserProfile();
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    } else {
      await tokenStorage.clear();
      set({ tokens, user: null, isAuthenticated: false, hasPlayerTag: false });
    }
  },

  loadUserProfile: async () => {
    try {
      const user = await apiFetch<UserProfile>('/api/v1/users/me', { auth: true });
      set({ 
        user, 
        hasPlayerTag: !!user.player_tag 
      });
    } catch (error) {
      console.error('Failed to load user profile:', error);
      set({ user: null, hasPlayerTag: false });
    }
  },

  setUserPlayerTag: async (playerTag: string) => {
    try {
      await apiFetch('/api/v1/users/player-tag', {
        method: 'POST',
        body: JSON.stringify({ player_tag: playerTag }),
        auth: true,
      });
      
      // Update local user state
      const currentUser = get().user;
      if (currentUser) {
        set({ 
          user: { ...currentUser, player_tag: playerTag },
          hasPlayerTag: true
        });
      }
    } catch (error) {
      console.error('Failed to set player tag:', error);
      throw error;
    }
  },

  initializeAuth: async () => {
    try {
      const tokens = await tokenStorage.get();
      if (tokens) {
        set({ tokens, isAuthenticated: true, isInitialized: true });
        // Load user profile
        try {
          await get().loadUserProfile();
        } catch (error) {
          console.error('Failed to load user profile on init:', error);
        }
      } else {
        set({ isInitialized: true });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isInitialized: true });
    }
  },
}));

