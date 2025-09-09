import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@theme/index';

export interface DonationIndicatorProps {
  donations: number;
  received: number;
  size?: 'sm' | 'md' | 'lg';
  showRatio?: boolean;
}

export function DonationIndicator({ 
  donations, 
  received, 
  size = 'md', 
  showRatio = true 
}: DonationIndicatorProps) {
  const theme = useTheme();

  const getRatio = () => {
    if (received === 0) return donations > 0 ? '∞' : '0';
    return (donations / received).toFixed(1);
  };

  const getRatioColor = () => {
    const ratio = donations / (received || 1);
    if (ratio >= 2) return theme.colors.success; // Great donor
    if (ratio >= 1) return theme.colors.warning; // Balanced
    if (ratio >= 0.5) return theme.colors.primary; // Decent
    return theme.colors.error; // Needs improvement
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          textSize: theme.typography.fontSize.xs,
          ratioSize: theme.typography.fontSize.sm,
          iconSize: 12,
          padding: theme.spacing.xs,
        };
      case 'lg':
        return {
          textSize: theme.typography.fontSize.base,
          ratioSize: theme.typography.fontSize.lg,
          iconSize: 20,
          padding: theme.spacing.md,
        };
      default:
        return {
          textSize: theme.typography.fontSize.sm,
          ratioSize: theme.typography.fontSize.base,
          iconSize: 16,
          padding: theme.spacing.sm,
        };
    }
  };

  const styles = getSizeStyles();
  const ratioColor = getRatioColor();

  return (
    <View style={{
      alignItems: 'center',
      gap: theme.spacing.xs,
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        paddingHorizontal: styles.padding,
        paddingVertical: styles.padding * 0.5,
      }}>
        <Text style={{ fontSize: styles.iconSize }}>📤</Text>
        <Text style={{
          fontSize: styles.textSize,
          fontWeight: theme.typography.fontWeight.medium,
          color: theme.colors.success,
        }}>
          {donations.toLocaleString()}
        </Text>
        
        <Text style={{
          fontSize: styles.textSize,
          color: theme.colors.textMuted,
        }}>
          /
        </Text>
        
        <Text style={{ fontSize: styles.iconSize }}>📥</Text>
        <Text style={{
          fontSize: styles.textSize,
          fontWeight: theme.typography.fontWeight.medium,
          color: theme.colors.primary,
        }}>
          {received.toLocaleString()}
        </Text>
      </View>
      
      {showRatio && (
        <View style={{
          backgroundColor: ratioColor + '20',
          borderRadius: theme.borderRadius.base,
          borderWidth: 1,
          borderColor: ratioColor,
          paddingHorizontal: styles.padding,
          paddingVertical: styles.padding * 0.5,
        }}>
          <Text style={{
            fontSize: styles.ratioSize,
            fontWeight: theme.typography.fontWeight.bold,
            color: ratioColor,
          }}>
            {getRatio()}
          </Text>
        </View>
      )}
    </View>
  );
}