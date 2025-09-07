import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme, useThemedStyles } from '@theme/index';

export interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

export function LoadingSpinner({ 
  size = 'large',
  color,
  message,
  fullScreen = false,
  overlay = false
}: LoadingSpinnerProps) {
  const theme = useTheme();
  const commonStyles = useThemedStyles();

  const spinnerColor = color || theme.colors.primary;

  const containerStyle = {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: theme.spacing.md,
    ...(fullScreen && {
      flex: 1,
      backgroundColor: theme.colors.background,
    }),
    ...(overlay && {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background + 'E6', // 90% opacity
      zIndex: 999,
    }),
  };

  return (
    <View style={containerStyle}>
      <ActivityIndicator 
        size={size} 
        color={spinnerColor}
      />
      {message && (
        <Text style={{
          ...commonStyles.bodySecondary,
          textAlign: 'center',
          maxWidth: 200,
        }}>
          {message}
        </Text>
      )}
    </View>
  );
}

export function SkeletonLoader({ 
  width = '100%', 
  height = 20,
  borderRadius,
  style 
}: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}) {
  const theme = useTheme();

  return (
    <View style={[{
      width,
      height,
      backgroundColor: theme.colors.surfaceTertiary,
      borderRadius: borderRadius || theme.borderRadius.sm,
      opacity: 0.7,
    }, style]} />
  );
}