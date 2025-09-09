import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@theme/index';

export interface TownHallIconProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
}

export function TownHallIcon({ level, size = 'md', showLevel = true }: TownHallIconProps) {
  const theme = useTheme();

  // Town Hall icon mapping - using castle/building emojis with color coding
  const getTownHallIcon = (level: number) => {
    if (level >= 16) return '🏰'; // Legendary
    if (level >= 14) return '🏯'; // High tier
    if (level >= 12) return '🏛️'; // Mid-high tier
    if (level >= 9) return '🏤'; // Mid tier
    if (level >= 6) return '🏠'; // Low-mid tier
    return '🏘️'; // Low tier
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          iconSize: 16,
          textSize: theme.typography.fontSize.xs,
          containerSize: 24,
        };
      case 'lg':
        return {
          iconSize: 24,
          textSize: theme.typography.fontSize.base,
          containerSize: 36,
        };
      default:
        return {
          iconSize: 20,
          textSize: theme.typography.fontSize.sm,
          containerSize: 28,
        };
    }
  };

  const getBackgroundColor = (level: number) => {
    if (level >= 16) return '#8B5CF6'; // Legendary purple
    if (level >= 14) return theme.colors.warning; // Gold/yellow
    if (level >= 12) return theme.colors.primary; // Blue
    if (level >= 9) return theme.colors.success; // Green
    if (level >= 6) return '#F97316'; // Orange
    return '#6B7280'; // Gray
  };

  const styles = getSizeStyles();
  const backgroundColor = getBackgroundColor(level);

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: backgroundColor + '20',
      borderRadius: theme.borderRadius.base,
      borderWidth: 1,
      borderColor: backgroundColor,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      gap: theme.spacing.xs,
      minWidth: styles.containerSize,
      justifyContent: 'center',
    }}>
      <Text style={{
        fontSize: styles.iconSize * 0.8,
      }}>
        {getTownHallIcon(level)}
      </Text>
      {showLevel && (
        <Text style={{
          fontSize: styles.textSize,
          fontWeight: theme.typography.fontWeight.semibold,
          color: backgroundColor,
        }}>
          {level}
        </Text>
      )}
    </View>
  );
}