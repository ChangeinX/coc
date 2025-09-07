import { Platform } from 'react-native';

// Type definitions for different haptic feedback types
export type HapticFeedbackType = 
  | 'light'
  | 'medium' 
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

// Haptic feedback service
class HapticService {
  private isAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

  // Check if haptics are available on the current platform
  isHapticsAvailable(): boolean {
    return this.isAvailable;
  }

  // Trigger haptic feedback
  async trigger(type: HapticFeedbackType = 'light'): Promise<void> {
    if (!this.isAvailable) return;

    try {
      if (Platform.OS === 'ios') {
        // iOS uses Vibration API for simple feedback
        const { Vibration } = await import('react-native');
        
        switch (type) {
          case 'light':
          case 'selection':
            Vibration.vibrate(10);
            break;
          case 'medium':
            Vibration.vibrate(20);
            break;
          case 'heavy':
            Vibration.vibrate(40);
            break;
          case 'success':
            Vibration.vibrate([0, 10, 100, 10]);
            break;
          case 'warning':
            Vibration.vibrate([0, 20, 50, 20]);
            break;
          case 'error':
            Vibration.vibrate([0, 40, 100, 40, 100, 40]);
            break;
          default:
            Vibration.vibrate(10);
        }
      } else if (Platform.OS === 'android') {
        // Android uses Vibration API
        const { Vibration } = await import('react-native');
        
        switch (type) {
          case 'light':
          case 'selection':
            Vibration.vibrate(10);
            break;
          case 'medium':
            Vibration.vibrate(20);
            break;
          case 'heavy':
            Vibration.vibrate(40);
            break;
          case 'success':
            Vibration.vibrate([0, 10, 100, 10]);
            break;
          case 'warning':
            Vibration.vibrate([0, 20, 50, 20]);
            break;
          case 'error':
            Vibration.vibrate([0, 40, 100, 40, 100, 40]);
            break;
          default:
            Vibration.vibrate(10);
        }
      }
    } catch (error) {
      console.warn('Haptic feedback error:', error);
    }
  }

  // Convenience methods for common haptic types
  async light(): Promise<void> {
    return this.trigger('light');
  }

  async medium(): Promise<void> {
    return this.trigger('medium');
  }

  async heavy(): Promise<void> {
    return this.trigger('heavy');
  }

  async success(): Promise<void> {
    return this.trigger('success');
  }

  async warning(): Promise<void> {
    return this.trigger('warning');
  }

  async error(): Promise<void> {
    return this.trigger('error');
  }

  async selection(): Promise<void> {
    return this.trigger('selection');
  }
}

// Export singleton instance
export const haptics = new HapticService();

// React hook for haptic feedback
export function useHaptics() {
  return {
    trigger: haptics.trigger.bind(haptics),
    light: haptics.light.bind(haptics),
    medium: haptics.medium.bind(haptics),
    heavy: haptics.heavy.bind(haptics),
    success: haptics.success.bind(haptics),
    warning: haptics.warning.bind(haptics),
    error: haptics.error.bind(haptics),
    selection: haptics.selection.bind(haptics),
    isAvailable: haptics.isHapticsAvailable.bind(haptics),
  };
}