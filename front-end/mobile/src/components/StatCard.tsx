import React from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { useThemedStyles, useTheme } from '@theme/index';
import { useHaptics, useScaleAnimation } from '@utils/index';

export interface StatCardProps {
  icon?: string;
  iconUrl?: string | undefined;
  label: string;
  value: string | number;
  subtitle?: string;
  onPress?: () => void;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export function StatCard({ 
  icon, 
  iconUrl, 
  label, 
  value, 
  subtitle, 
  onPress, 
  variant = 'default',
  size = 'md' 
}: StatCardProps) {
  const theme = useTheme();
  const commonStyles = useThemedStyles();
  const { light, isAvailable } = useHaptics();
  const { animatedStyle, press } = useScaleAnimation();

  const handlePress = async () => {
    if (onPress) {
      if (isAvailable()) await light();
      press().start();
      onPress();
    }
  };

  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: theme.colors.successMuted,
          borderColor: theme.colors.success,
          iconBackground: theme.colors.success,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warningMuted,
          borderColor: theme.colors.warning,
          iconBackground: theme.colors.warning,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.errorMuted,
          borderColor: theme.colors.error,
          iconBackground: theme.colors.error,
        };
      default:
        return {
          backgroundColor: theme.colors.cardBackground,
          borderColor: theme.colors.cardBorder,
          iconBackground: theme.colors.surfaceTertiary,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: theme.spacing.md,
          iconSize: 24,
          valueSize: theme.typography.fontSize.lg,
          labelSize: theme.typography.fontSize.xs,
        };
      case 'lg':
        return {
          padding: theme.spacing['2xl'],
          iconSize: 40,
          valueSize: theme.typography.fontSize['3xl'],
          labelSize: theme.typography.fontSize.base,
        };
      default:
        return {
          padding: theme.spacing.base,
          iconSize: 32,
          valueSize: theme.typography.fontSize['2xl'],
          labelSize: theme.typography.fontSize.sm,
        };
    }
  };

  const variantColors = getVariantColors();
  const sizeStyles = getSizeStyles();

  const cardStyle = {
    ...commonStyles.card,
    backgroundColor: variantColors.backgroundColor,
    borderColor: variantColors.borderColor,
    padding: sizeStyles.padding,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.md,
  };

  const pressableStyle = onPress ? {
    ...cardStyle,
    ...theme.shadows.sm,
  } : cardStyle;

  const content = (
    <>
      {(iconUrl || icon) && (
        <View style={{
          width: sizeStyles.iconSize + theme.spacing.md,
          height: sizeStyles.iconSize + theme.spacing.md,
          borderRadius: theme.borderRadius.full,
          backgroundColor: variantColors.iconBackground,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {iconUrl ? (
            <Image
              source={{ uri: iconUrl }}
              style={{
                width: sizeStyles.iconSize,
                height: sizeStyles.iconSize,
              }}
              resizeMode="contain"
            />
          ) : (
            <Text style={{
              fontSize: sizeStyles.iconSize * 0.6,
              color: theme.colors.textInverse,
            }}>
              {icon}
            </Text>
          )}
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: sizeStyles.labelSize,
          color: theme.colors.textMuted,
          marginBottom: theme.spacing.xs,
        }}>
          {label}
        </Text>
        <Text style={{
          fontSize: sizeStyles.valueSize,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.text,
        }}>
          {value}
        </Text>
        {subtitle && (
          <Text style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
            marginTop: theme.spacing.xs,
          }}>
            {subtitle}
          </Text>
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Animated.View style={[pressableStyle, animatedStyle]}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.9}
          style={{ flex: 1 }}
        >
          {content}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return <View style={cardStyle}>{content}</View>;
}
