import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@theme/index';

export interface RoleIconProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function RoleIcon({ role, size = 'md', showText = false }: RoleIconProps) {
  const theme = useTheme();

  // Role icon and color mapping
  const getRoleInfo = (role: string) => {
    const roleKey = role.toLowerCase();
    switch (roleKey) {
      case 'leader':
        return {
          icon: '👑',
          color: '#FFD700', // Gold
          bgColor: '#FEF3C7', // Light gold background
          label: 'Leader'
        };
      case 'coleader':
      case 'co-leader':
        return {
          icon: '⭐',
          color: '#F59E0B', // Amber
          bgColor: '#FEF3C7', // Light amber background  
          label: 'Co-Leader'
        };
      case 'elder':
        return {
          icon: '🛡️',
          color: '#8B5CF6', // Purple
          bgColor: '#F3E8FF', // Light purple background
          label: 'Elder'
        };
      case 'member':
      default:
        return {
          icon: '⚔️',
          color: '#6B7280', // Gray
          bgColor: '#F9FAFB', // Light gray background
          label: 'Member'
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          iconSize: 12,
          textSize: theme.typography.fontSize.xs,
          containerPadding: theme.spacing.xs,
          borderRadius: theme.borderRadius.sm,
        };
      case 'lg':
        return {
          iconSize: 20,
          textSize: theme.typography.fontSize.base,
          containerPadding: theme.spacing.md,
          borderRadius: theme.borderRadius.base,
        };
      default:
        return {
          iconSize: 16,
          textSize: theme.typography.fontSize.sm,
          containerPadding: theme.spacing.sm,
          borderRadius: theme.borderRadius.sm,
        };
    }
  };

  const roleInfo = getRoleInfo(role);
  const styles = getSizeStyles();

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: roleInfo.bgColor,
      borderRadius: styles.borderRadius,
      borderWidth: 1,
      borderColor: roleInfo.color + '40',
      paddingHorizontal: styles.containerPadding,
      paddingVertical: styles.containerPadding * 0.5,
      gap: theme.spacing.xs,
    }}>
      <Text style={{
        fontSize: styles.iconSize,
      }}>
        {roleInfo.icon}
      </Text>
      {showText && (
        <Text style={{
          fontSize: styles.textSize,
          fontWeight: theme.typography.fontWeight.medium,
          color: roleInfo.color,
        }}>
          {roleInfo.label}
        </Text>
      )}
    </View>
  );
}