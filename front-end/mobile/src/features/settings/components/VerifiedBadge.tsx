import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@theme/index';

export default function VerifiedBadge() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: '#10b981', // Emerald green
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: 'white',
          fontSize: 10,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        ✓ Verified
      </Text>
    </View>
  );
}