import { create } from 'zustand';
import { tokenStorage, TokenBundle } from '@services/storage/secureStorage';
import { apiFetch, ApiError, setSessionExpiredCallback } from '@services/apiClient';

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
  updateTokens: (t: TokenBundle) => void;
  loadUserProfile: () => Promise<void>;
  setUserPlayerTag: (playerTag: string) => Promise<void>;
  initializeAuth: () => Promise<void>;
  handleSessionExpired: () => Promise<void>;
  isTokenExpired: () => boolean;
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
      
      // Set up session expiry callback when tokens are set
      setSessionExpiredCallback(() => {
        get().handleSessionExpired();
      });
      
      // Load user profile after setting tokens
      try {
        await get().loadUserProfile();
      } catch (error) {
        if (error instanceof ApiError && error.isUnauthorized) {
          // Tokens might be invalid, clear them
          console.warn('Initial profile load failed - unauthorized, clearing session');
          await tokenStorage.clear();
          set({ tokens: null, user: null, isAuthenticated: false, hasPlayerTag: false });
        } else {
          console.error('Failed to load user profile:', error);
        }
      }
    } else {
      await tokenStorage.clear();
      set({ tokens, user: null, isAuthenticated: false, hasPlayerTag: false });
    }
  },

  updateTokens: (tokens) => {
    set({ tokens, isAuthenticated: !!tokens?.accessToken });
  },

  loadUserProfile: async () => {
    try {
      const user = await apiFetch<UserProfile>('/api/v1/users/me', { auth: true });
      set({ 
        user, 
        hasPlayerTag: !!user.player_tag 
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isUnauthorized) {
          console.warn('User profile load failed - unauthorized, clearing session');
          await get().setTokens(null);
          return;
        }
        console.error(`Failed to load user profile [${error.errorCode}]: ${error.userMessage}`);
      } else {
        console.error('Failed to load user profile:', error);
      }
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
      if (error instanceof ApiError) {
        if (error.isUnauthorized) {
          console.warn('Player tag update failed - unauthorized, clearing session');
          await get().setTokens(null);
          throw new Error('Session expired. Please log in again.');
        }
        if (error.isValidationError) {
          // Validation errors should be shown to user as-is
          throw new Error(error.userMessage);
        }
        console.error(`Failed to set player tag [${error.errorCode}]: ${error.userMessage}`);
        throw new Error(error.userMessage || 'Failed to update player tag');
      } else {
        console.error('Failed to set player tag:', error);
        throw new Error('Failed to update player tag');
      }
    }
  },

  initializeAuth: async () => {
    try {
      const tokens = await tokenStorage.get();
      if (tokens) {
        // If tokens don't have expiry, add a default (1 hour from now)
        let migratedTokens = tokens;
        if (!tokens.expiresAt) {
          migratedTokens = {
            ...tokens,
            expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour default
          };
          // Save the migrated tokens back to storage
          await tokenStorage.set(migratedTokens);
          console.log('Migrated tokens to include expiry time');
        }
        
        set({ tokens: migratedTokens, isAuthenticated: true, isInitialized: true });
        // Set up session expiry callback
        setSessionExpiredCallback(() => {
          get().handleSessionExpired();
        });
        // Load user profile
        try {
          await get().loadUserProfile();
        } catch (error) {
          if (error instanceof ApiError && error.isUnauthorized) {
            // Session invalid during init, clear it
            console.warn('Session invalid during initialization, clearing tokens');
            await get().setTokens(null);
          } else {
            console.error('Failed to load user profile on init:', error);
          }
        }
      } else {
        set({ isInitialized: true });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isInitialized: true });
    }
  },

  handleSessionExpired: async () => {
    console.log('Session expired, clearing auth state');
    await tokenStorage.clear();
    set({ 
      tokens: null, 
      user: null, 
      isAuthenticated: false, 
      hasPlayerTag: false 
    });
  },

  isTokenExpired: () => {
    const tokens = get().tokens;
    if (!tokens?.expiresAt) return false;
    return Date.now() >= tokens.expiresAt;
  },
}));

