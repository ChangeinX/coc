import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@store/auth.store';
import { tokenStorage } from '@services/storage/secureStorage';
import { triggerSessionExpired } from '@services/apiClient';
import { AUTH_URL } from '@env';

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

export function useSessionManager() {
  const { tokens, isAuthenticated, handleSessionExpired, isTokenExpired, updateTokens } = useAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  const refreshToken = useCallback(async () => {
    if (isRefreshingRef.current) return;
    if (!tokens?.refreshToken) {
      console.warn('No refresh token available for proactive refresh');
      await handleSessionExpired();
      return;
    }

    isRefreshingRef.current = true;
    try {
      const response = await fetch(`${AUTH_URL}/api/v1/users/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 
          grant_type: 'refresh_token', 
          refresh_token: tokens.refreshToken 
        }).toString(),
      });

      if (!response.ok) {
        console.warn('Proactive token refresh failed');
        await handleSessionExpired();
        return;
      }

      const data = await response.json();
      const expiresAt = Date.now() + (data.expires_in * 1000);
      
      const newTokens = {
        accessToken: data.access_token,
        refreshToken: tokens.refreshToken,
        expiresAt
      };
      
      await tokenStorage.set(newTokens);
      updateTokens(newTokens);

      console.log('Proactive token refresh successful');
    } catch (error) {
      console.error('Proactive token refresh error:', error);
      await handleSessionExpired();
    } finally {
      isRefreshingRef.current = false;
    }
  }, [tokens, handleSessionExpired, updateTokens]);

  const checkTokenExpiry = useCallback(async () => {
    if (!isAuthenticated || !tokens?.expiresAt) return;

    const timeUntilExpiry = tokens.expiresAt - Date.now();
    
    if (timeUntilExpiry <= 0) {
      console.log('Token has expired, triggering session cleanup');
      triggerSessionExpired();
      return;
    }

    if (timeUntilExpiry <= REFRESH_THRESHOLD_MS && tokens.refreshToken) {
      console.log('Token expires soon, attempting proactive refresh');
      await refreshToken();
    }
  }, [isAuthenticated, tokens, refreshToken]);

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && isAuthenticated) {
      // Check token status when app becomes active
      checkTokenExpiry();
    }
  }, [isAuthenticated, checkTokenExpiry]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear interval when not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start monitoring token expiry
    intervalRef.current = setInterval(checkTokenExpiry, CHECK_INTERVAL_MS);

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initial check
    checkTokenExpiry();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription?.remove();
    };
  }, [isAuthenticated, checkTokenExpiry, handleAppStateChange]);

  return {
    refreshToken,
    isTokenExpired,
  };
}