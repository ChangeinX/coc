import { useCallback, useRef } from 'react';
import { PanResponder, Dimensions } from 'react-native';
import { haptics } from './haptics';

// Screen dimensions for gesture calculations
const { width: _SCREEN_WIDTH, height: _SCREEN_HEIGHT } = Dimensions.get('window');

// Gesture configuration types
export interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  hapticFeedback?: boolean;
}

export interface LongPressConfig {
  onLongPress: () => void;
  duration?: number;
  hapticFeedback?: boolean;
}

export interface PullToRefreshConfig {
  onRefresh: () => void;
  threshold?: number;
  hapticFeedback?: boolean;
}

// Swipe gesture hook
export function useSwipeGesture(config: SwipeGestureConfig) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    hapticFeedback = true
  } = config;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Set responder if there's significant movement
      return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
    },

    onPanResponderMove: (_evt, _gestureState) => {
      // Optional: Add visual feedback during gesture
    },

    onPanResponderRelease: async (evt, gestureState) => {
      const { dx, dy } = gestureState;
      
      // Determine swipe direction based on velocity and distance
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (Math.abs(dx) > threshold) {
          if (dx > 0 && onSwipeRight) {
            if (hapticFeedback) await haptics.selection();
            onSwipeRight();
          } else if (dx < 0 && onSwipeLeft) {
            if (hapticFeedback) await haptics.selection();
            onSwipeLeft();
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(dy) > threshold) {
          if (dy > 0 && onSwipeDown) {
            if (hapticFeedback) await haptics.selection();
            onSwipeDown();
          } else if (dy < 0 && onSwipeUp) {
            if (hapticFeedback) await haptics.selection();
            onSwipeUp();
          }
        }
      }
    },
  });

  return panResponder.panHandlers;
}

// Enhanced long press hook with haptic feedback
export function useLongPress(config: LongPressConfig) {
  const { onLongPress, duration: _duration = 500, hapticFeedback = true } = config;

  return useCallback(async () => {
    if (hapticFeedback) {
      await haptics.medium();
    }
    onLongPress();
  }, [onLongPress, hapticFeedback]);
}

// Pull to refresh gesture
export function usePullToRefresh(config: PullToRefreshConfig) {
  const { onRefresh, threshold = 100, hapticFeedback = true } = config;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to downward pulls at the top of the screen
      return gestureState.dy > 0 && evt.nativeEvent.pageY < 100;
    },

    onPanResponderMove: (_evt, _gestureState) => {
      // Optional: Add visual feedback during pull
    },

    onPanResponderRelease: async (evt, gestureState) => {
      if (gestureState.dy > threshold) {
        if (hapticFeedback) await haptics.success();
        onRefresh();
      }
    },
  });

  return panResponder.panHandlers;
}

// Double tap gesture
export function useDoubleTap(onDoubleTap: () => void, hapticFeedback = true) {
  const lastTapRef = useRef(0);
  
  return useCallback(async () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    
    if (lastTapRef.current && (now - lastTapRef.current) < DOUBLE_PRESS_DELAY) {
      if (hapticFeedback) await haptics.light();
      onDoubleTap();
    }
    lastTapRef.current = now;
  }, [onDoubleTap, hapticFeedback]);
}

// Enhanced touch feedback hook
export function useEnhancedTouch() {
  const handlePressIn = useCallback(async () => {
    await haptics.light();
  }, []);

  const handlePressOut = useCallback(() => {
    // Optional: Add visual feedback on press out
  }, []);

  const createPressHandler = useCallback((
    onPress: () => void,
    feedbackType: 'light' | 'medium' | 'heavy' | 'success' = 'light'
  ) => {
    return async () => {
      await haptics.trigger(feedbackType);
      onPress();
    };
  }, []);

  return {
    handlePressIn,
    handlePressOut,
    createPressHandler,
  };
}

// Gesture utilities
export const GestureUtils = {
  // Calculate distance between two points
  getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  },

  // Calculate angle between two points
  getAngle(x1: number, y1: number, x2: number, y2: number): number {
    return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  },

  // Check if point is within bounds
  isWithinBounds(x: number, y: number, bounds: { x: number, y: number, width: number, height: number }): boolean {
    return x >= bounds.x && 
           x <= bounds.x + bounds.width && 
           y >= bounds.y && 
           y <= bounds.y + bounds.height;
  },

  // Get velocity from gesture
  getVelocity(dx: number, dy: number, dt: number): { vx: number, vy: number } {
    return {
      vx: dx / dt,
      vy: dy / dt,
    };
  },
};