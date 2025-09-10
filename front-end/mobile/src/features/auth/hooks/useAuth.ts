import { useCallback } from 'react';
import { useAuthStore } from '@store/auth.store';

export function useAuth() {
  const { tokens, setTokens, isAuthenticated } = useAuthStore();

  const logout = useCallback(async () => {
    await setTokens(null);
  }, [setTokens]);

  // Note: Login is handled directly in LoginScreen.tsx via Apple Sign-In
  // This hook only provides logout and auth state
  return { tokens, isAuthenticated, logout };
}
