import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useThemedStyles, useTheme } from '@theme/index';
import { useHaptics } from '@utils/index';

export interface SortOption {
  key: string;
  label: string;
}

export interface SwipeableSortBarProps {
  options: SortOption[];
  activeSort: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (key: string) => void;
}

export function SwipeableSortBar({ 
  options, 
  activeSort, 
  sortDirection, 
  onSortChange 
}: SwipeableSortBarProps) {
  const theme = useTheme();
  const commonStyles = useThemedStyles();
  const { selection, isAvailable } = useHaptics();
  
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const handleGestureStateChange = async (event: any) => {
    const { translationX, state } = event.nativeEvent;
    
    if (state === 5) { // GESTURE_STATE_END
      const currentIndex = options.findIndex(opt => opt.key === activeSort);
      const threshold = 50; // Minimum swipe distance
      
      if (Math.abs(translationX) > threshold) {
        if (isAvailable()) await selection();
        
        if (translationX > 0 && currentIndex > 0) {
          // Swipe right - previous option
          onSortChange(options[currentIndex - 1].key);
        } else if (translationX < 0 && currentIndex < options.length - 1) {
          // Swipe left - next option
          onSortChange(options[currentIndex + 1].key);
        }
      }
      
      // Reset animation
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
      
      lastOffset.current = 0;
    }
  };

  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.base,
      padding: theme.spacing.xs,
      ...theme.shadows.sm,
    }}>
      <Text style={{
        ...commonStyles.caption,
        textAlign: 'center',
        marginBottom: theme.spacing.xs,
        color: theme.colors.textMuted,
      }}>
        Swipe to change sort • Tap to reverse
      </Text>
      
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleGestureStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View style={{
          transform: [{ translateX }],
        }}>
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
            justifyContent: 'center',
          }}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.base,
                  borderWidth: 1,
                  borderColor: activeSort === option.key 
                    ? theme.colors.primary 
                    : theme.colors.border,
                  backgroundColor: activeSort === option.key 
                    ? theme.colors.primaryMuted 
                    : theme.colors.surface,
                  minWidth: 80,
                  alignItems: 'center',
                }}
                onPress={() => onSortChange(option.key)}
              >
                <Text style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: activeSort === option.key 
                    ? theme.colors.primary 
                    : theme.colors.textSecondary,
                  fontWeight: activeSort === option.key 
                    ? theme.typography.fontWeight.medium 
                    : theme.typography.fontWeight.normal,
                }}>
                  {option.label} {activeSort === option.key ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}