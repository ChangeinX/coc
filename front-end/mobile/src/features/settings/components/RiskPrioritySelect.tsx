import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '@theme/index';

export interface RiskWeights {
  risk_weight_war: number;
  risk_weight_idle: number;
  risk_weight_don_deficit: number;
  risk_weight_don_drop: number;
}

export interface RiskPreset {
  label: string;
  weights: RiskWeights;
}

export const PRESETS: Record<string, RiskPreset> = {
  balanced: {
    label: 'Balanced',
    weights: {
      risk_weight_war: 0.4,
      risk_weight_idle: 0.35,
      risk_weight_don_deficit: 0.15,
      risk_weight_don_drop: 0.1,
    },
  },
  war: {
    label: 'War Focused',
    weights: {
      risk_weight_war: 0.6,
      risk_weight_idle: 0.25,
      risk_weight_don_deficit: 0.1,
      risk_weight_don_drop: 0.05,
    },
  },
  donor: {
    label: 'Donation Focused',
    weights: {
      risk_weight_war: 0.3,
      risk_weight_idle: 0.25,
      risk_weight_don_deficit: 0.35,
      risk_weight_don_drop: 0.1,
    },
  },
  idle: {
    label: 'Idle Focused',
    weights: {
      risk_weight_war: 0.2,
      risk_weight_idle: 0.6,
      risk_weight_don_deficit: 0.1,
      risk_weight_don_drop: 0.1,
    },
  },
};

export function getPreset(weights: RiskWeights): string {
  for (const [key, preset] of Object.entries(PRESETS)) {
    const w = preset.weights;
    if (
      Math.abs(w.risk_weight_war - weights.risk_weight_war) < 0.01 &&
      Math.abs(w.risk_weight_idle - weights.risk_weight_idle) < 0.01 &&
      Math.abs(w.risk_weight_don_deficit - weights.risk_weight_don_deficit) < 0.01 &&
      Math.abs(w.risk_weight_don_drop - weights.risk_weight_don_drop) < 0.01
    ) {
      return key;
    }
  }
  return 'balanced';
}

interface RiskPrioritySelectProps {
  weights: RiskWeights;
  onSelect: (weights: RiskWeights) => void;
}

export default function RiskPrioritySelect({ weights, onSelect }: RiskPrioritySelectProps) {
  const { colors } = useTheme();
  const currentPreset = getPreset(weights);

  const PresetButton = ({ 
    presetKey, 
    preset, 
    isSelected 
  }: { 
    presetKey: string; 
    preset: RiskPreset; 
    isSelected: boolean; 
  }) => (
    <Pressable
      onPress={() => onSelect(preset.weights)}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isSelected ? colors.primary : colors.border,
        marginBottom: 8,
        backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
      }}
    >
      <Text style={{ 
        color: isSelected ? colors.primary : colors.text,
        fontWeight: isSelected ? '600' : '400',
      }}>
        {preset.label}
      </Text>
    </Pressable>
  );

  return (
    <View>
      {Object.entries(PRESETS).map(([key, preset]) => (
        <PresetButton
          key={key}
          presetKey={key}
          preset={preset}
          isSelected={currentPreset === key}
        />
      ))}
    </View>
  );
}