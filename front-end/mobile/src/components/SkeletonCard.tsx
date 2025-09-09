import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useTheme } from '@theme/index';

export interface SkeletonCardProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonCard({ 
  width = '100%', 
  height = 120, 
  borderRadius, 
  style 
}: SkeletonCardProps) {
  const theme = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: theme.colors.cardBackground,
          borderRadius: borderRadius || theme.borderRadius.base,
          opacity,
          borderWidth: 1,
          borderColor: theme.colors.cardBorder,
        },
        style,
      ]}
    />
  );
}

export function MemberCardSkeleton({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();

  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.base,
      padding: compact ? theme.spacing.md : theme.spacing.base,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
      gap: theme.spacing.sm,
    }}>
      {/* Header skeleton */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <SkeletonCard width="60%" height={20} />
          <SkeletonCard width="40%" height={16} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: theme.spacing.xs }}>
          <SkeletonCard width={60} height={16} />
          <SkeletonCard width={24} height={24} borderRadius={12} />
        </View>
      </View>

      {!compact && (
        <>
          {/* Stats row skeleton */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: theme.spacing.sm,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}>
            {[1, 2, 3, 4].map((_, index) => (
              <View key={index} style={{ alignItems: 'center', gap: theme.spacing.xs }}>
                <SkeletonCard width={50} height={20} />
                <SkeletonCard width={40} height={14} />
              </View>
            ))}
          </View>

          {/* Risk section skeleton */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: theme.spacing.sm,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}>
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <SkeletonCard width="50%" height={16} />
              <SkeletonCard width="80%" height={14} />
              <SkeletonCard width="70%" height={14} />
            </View>
            <SkeletonCard width={60} height={50} borderRadius={theme.borderRadius.base} />
          </View>
        </>
      )}
    </View>
  );
}