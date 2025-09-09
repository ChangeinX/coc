import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@theme/index';
import { useHaptics, useScaleAnimation } from '@utils/index';

export interface FABAction {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
}

export interface FloatingActionButtonProps {
  actions: FABAction[];
  mainIcon?: string;
  mainLabel?: string;
}

export function FloatingActionButton({ 
  actions, 
  mainIcon = '⚡', 
  mainLabel: _mainLabel = 'Quick Actions' 
}: FloatingActionButtonProps) {
  const theme = useTheme();
  const { light, isAvailable } = useHaptics();
  const { animatedStyle, press: _press } = useScaleAnimation();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const actionAnimations = useRef(
    actions.map(() => new Animated.Value(0))
  ).current;

  const toggleExpanded = async () => {
    if (isAvailable()) await light();
    
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    // Rotate main button
    Animated.timing(rotateAnim, {
      toValue: newExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Animate action buttons
    if (newExpanded) {
      // Stagger the animations when opening
      const animations = actionAnimations.map((anim, index) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 150,
          delay: index * 50,
          useNativeDriver: true,
        })
      );
      Animated.parallel(animations).start();
    } else {
      // Close all at once
      const animations = actionAnimations.map(anim =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        })
      );
      Animated.parallel(animations).start();
    }
  };

  const handleActionPress = async (action: FABAction) => {
    if (isAvailable()) await light();
    action.onPress();
    toggleExpanded(); // Close after action
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={[styles.container, { bottom: theme.spacing['2xl'] + 60 }]}>
      {/* Action buttons */}
      {actions.map((action, index) => {
        const translateY = actionAnimations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(60 * (index + 1))],
        });

        const scale = actionAnimations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        });

        return (
          <Animated.View
            key={action.id}
            style={[
              styles.actionButton,
              {
                transform: [{ translateY }, { scale }],
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                ...theme.shadows.base,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleActionPress(action)}
              style={styles.actionTouchable}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={[
                styles.actionLabel,
                { color: theme.colors.text, fontSize: theme.typography.fontSize.xs }
              ]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* Main FAB */}
      <Animated.View style={[animatedStyle]}>
        <TouchableOpacity
          onPress={toggleExpanded}
          style={[
            styles.mainButton,
            {
              backgroundColor: theme.colors.primary,
              ...theme.shadows.lg,
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.mainIcon,
              {
                color: theme.colors.textInverse,
                transform: [{ rotate: rotateInterpolate }],
              },
            ]}
          >
            {mainIcon}
          </Animated.Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  mainIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionButton: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 120,
    height: 40,
  },
  actionTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionLabel: {
    fontWeight: '500',
    flex: 1,
  },
});