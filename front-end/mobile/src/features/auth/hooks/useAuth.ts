import { useCallback } from 'react';
import { useAuthStore } from '@store/auth.store';
import { login as loginApi } from '../api/auth.api';

export function useAuth() {
  const { tokens, setTokens, isAuthenticated } = useAuthStore();

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await loginApi({ username, password });
      const bundle = res.refreshToken
        ? { accessToken: res.accessToken, refreshToken: res.refreshToken }
        : { accessToken: res.accessToken };
      await setTokens(bundle);
    },
    [setTokens]
  );

  const logout = useCallback(async () => {
    await setTokens(null);
  }, [setTokens]);

  return { tokens, isAuthenticated, login, logout };
}
