import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@theme/index';

export interface RoleIconProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function RoleIcon({ role, size = 'md', showText = false }: RoleIconProps) {
  const theme = useTheme();

  // Role icon and color mapping
  const getRoleInfo = (roleValue: string) => {
    const roleKey = roleValue.toLowerCase();
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
  const sizeStyles = getSizeStyles();

  const dynamicContainerStyle = {
    backgroundColor: roleInfo.bgColor,
    borderRadius: sizeStyles.borderRadius,
    borderColor: roleInfo.color + '40',
    paddingHorizontal: sizeStyles.containerPadding,
    paddingVertical: sizeStyles.containerPadding * 0.5,
    gap: theme.spacing.xs,
  };

  const dynamicIconStyle = {
    fontSize: sizeStyles.iconSize,
  };

  const dynamicTextStyle = {
    fontSize: sizeStyles.textSize,
    fontWeight: theme.typography.fontWeight.medium,
    color: roleInfo.color,
  };

  return (
    <View style={[styles.container, dynamicContainerStyle]}>
      <Text style={dynamicIconStyle}>
        {roleInfo.icon}
      </Text>
      {showText && (
        <Text style={dynamicTextStyle}>
          {roleInfo.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});