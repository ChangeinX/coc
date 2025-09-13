import React from 'react';
import { View, Text } from 'react-native';

export default function VerifiedBadge() {

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