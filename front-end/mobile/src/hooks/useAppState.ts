import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export interface UseAppStateOptions {
  onForeground?: () => void;
  onBackground?: () => void;
  onActive?: () => void;
  onInactive?: () => void;
}

export function useAppState({
  onForeground,
  onBackground,
  onActive,
  onInactive
}: UseAppStateOptions = {}) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        onForeground?.();
        onActive?.();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        onBackground?.();
        onInactive?.();
      } else if (nextAppState === 'active') {
        onActive?.();
      } else if (nextAppState === 'inactive') {
        onInactive?.();
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => subscription?.remove();
  }, [onForeground, onBackground, onActive, onInactive]);

  return appState.current;
}