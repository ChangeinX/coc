import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useThemedStyles, useTheme } from '@theme/index';
import { LoadingSpinner } from '@components/index';
import { useAuthStore } from '@store/auth.store';

interface PlayerTagOnboardingScreenProps {
  onComplete: () => void;
}

export default function PlayerTagOnboardingScreen({ onComplete }: PlayerTagOnboardingScreenProps) {
  const theme = useTheme();
  const commonStyles = useThemedStyles();
  const { setUserPlayerTag } = useAuthStore();
  const [playerTag, setPlayerTag] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    let trimmed = playerTag.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter your player tag');
      return;
    }
    
    // Remove # if present
    if (trimmed.startsWith('#')) {
      trimmed = trimmed.slice(1);
    }

    setLoading(true);
    try {
      // Save player tag to user profile
      await setUserPlayerTag(trimmed);
      onComplete();
    } catch (error: any) {
      console.error('Failed to save player tag:', error);
      Alert.alert(
        'Error', 
        error?.message || 'Failed to save player tag. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{
        flex: 1,
        padding: theme.spacing.lg,
        justifyContent: 'center',
        gap: theme.spacing.xl,
      }}>
        <View style={{ alignItems: 'center', gap: theme.spacing.base }}>
          <Text style={{ fontSize: 48 }}>⚡</Text>
          <Text style={{
            ...commonStyles.heading1,
            textAlign: 'center',
          }}>
            Welcome to Clan Dashboard
          </Text>
          <Text style={{
            ...commonStyles.bodySecondary,
            textAlign: 'center',
            lineHeight: 24,
          }}>
            Enter your Clash of Clans player tag to get started. We'll automatically find your clan and load your dashboard.
          </Text>
        </View>

        <View style={{
          ...commonStyles.card,
          padding: theme.spacing.lg,
          gap: theme.spacing.base,
        }}>
          <Text style={{
            ...commonStyles.body,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing.sm,
          }}>
            Player Tag
          </Text>
          
          <TextInput
            style={{
              ...commonStyles.input,
              fontSize: theme.typography.fontSize.base,
              padding: theme.spacing.md,
            }}
            placeholder="Enter your player tag (e.g. #ABC123)"
            placeholderTextColor={theme.colors.textSecondary}
            value={playerTag}
            onChangeText={setPlayerTag}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
          />
          
          <Text style={{
            ...commonStyles.caption,
            color: theme.colors.textSecondary,
            marginTop: theme.spacing.xs,
          }}>
            You can find your player tag by tapping your profile in Clash of Clans
          </Text>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: loading ? theme.colors.surface : theme.colors.primary,
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.borderRadius.base,
            alignItems: 'center',
            ...theme.shadows.sm,
          }}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <LoadingSpinner size="small" />
          ) : (
            <Text style={{
              color: theme.colors.textInverse,
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
            }}>
              Continue
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}