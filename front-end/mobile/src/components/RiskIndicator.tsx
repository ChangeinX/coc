import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@theme/index';

export interface RiskIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

export function RiskIndicator({ 
  score, 
  size = 'md', 
  showLabel = true,
  animated: _animated = true 
}: RiskIndicatorProps) {
  const theme = useTheme();

  const getRiskLevel = (score: number) => {
    if (score < 30) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  };

  const getRiskColor = (score: number) => {
    const level = getRiskLevel(score);
    switch (level) {
      case 'low':
        return theme.colors.success;
      case 'medium':
        return theme.colors.warning;
      case 'high':
        return theme.colors.error;
      default:
        return theme.colors.textMuted;
    }
  };

  const getRiskLabel = (score: number) => {
    const level = getRiskLevel(score);
    switch (level) {
      case 'low':
        return 'Low Risk';
      case 'medium':
        return 'Medium Risk';
      case 'high':
        return 'High Risk';
      default:
        return 'Unknown';
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          diameter: 40,
          strokeWidth: 3,
          fontSize: theme.typography.fontSize.sm,
          labelSize: theme.typography.fontSize.xs,
        };
      case 'lg':
        return {
          diameter: 80,
          strokeWidth: 6,
          fontSize: theme.typography.fontSize.xl,
          labelSize: theme.typography.fontSize.sm,
        };
      default:
        return {
          diameter: 60,
          strokeWidth: 4,
          fontSize: theme.typography.fontSize.base,
          labelSize: theme.typography.fontSize.xs,
        };
    }
  };

  const config = getSizeConfig();
  const color = getRiskColor(score);
  const radius = (config.diameter - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const _strokeDasharray = circumference;
  const _strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <View style={{ 
      alignItems: 'center',
      gap: theme.spacing.xs,
    }}>
      <View style={{
        width: config.diameter,
        height: config.diameter,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Background circle */}
        <View style={{
          position: 'absolute',
          width: config.diameter,
          height: config.diameter,
          borderRadius: config.diameter / 2,
          borderWidth: config.strokeWidth,
          borderColor: theme.colors.border,
        }} />
        
        {/* Progress circle - we'll simulate with a colored overlay */}
        <View style={{
          position: 'absolute',
          width: config.diameter,
          height: config.diameter,
          borderRadius: config.diameter / 2,
          borderWidth: config.strokeWidth,
          borderColor: color,
          borderRightColor: score < 25 ? theme.colors.border : color,
          borderBottomColor: score < 50 ? theme.colors.border : color,
          borderLeftColor: score < 75 ? theme.colors.border : color,
          transform: [{ rotate: '-90deg' }],
        }} />
        
        {/* Score text */}
        <Text style={{
          fontSize: config.fontSize,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text,
        }}>
          {Math.round(score)}
        </Text>
      </View>
      
      {showLabel && (
        <Text style={{
          fontSize: config.labelSize,
          color: color,
          fontWeight: theme.typography.fontWeight.medium,
          textAlign: 'center',
        }}>
          {getRiskLabel(score)}
        </Text>
      )}
    </View>
  );
}