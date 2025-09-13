import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@theme/index';
import { useHaptics } from '@utils/index';

interface ClanPostFormProps {
  onSubmit: (data: { clanTag: string; callToAction: string }) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  clanTag?: string; // Optional pre-populated clan tag
}

interface ValidationErrors {
  clanTag?: string;
  callToAction?: string;
}

export function ClanPostForm({ onSubmit, onCancel, isLoading, clanTag: prePopulatedClanTag }: ClanPostFormProps) {
  const theme = useTheme();
  const { light } = useHaptics();
  
  const [clanTag, setClanTag] = useState(prePopulatedClanTag || '');
  const [callToAction, setCallToAction] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  
  const isAutoPopulated = !!prePopulatedClanTag;

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Only validate clan tag if it's not auto-populated
    if (!isAutoPopulated) {
      if (!clanTag.trim()) {
        newErrors.clanTag = 'Clan tag is required';
      } else if (!clanTag.startsWith('#')) {
        newErrors.clanTag = 'Clan tag must start with #';
      }
    }

    if (!callToAction.trim()) {
      newErrors.callToAction = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      light();
      return;
    }

    try {
      await onSubmit({
        clanTag: clanTag.trim(),
        callToAction: callToAction.trim(),
      });
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleClanTagChange = (text: string) => {
    setClanTag(text);
    // Clear error when user starts typing
    if (errors.clanTag) {
      const { clanTag: _clanTag, ...otherErrors } = errors;
      setErrors(otherErrors);
    }
  };

  const handleCallToActionChange = (text: string) => {
    setCallToAction(text);
    // Clear error when user starts typing
    if (errors.callToAction) {
      const { callToAction: _callToAction, ...otherErrors } = errors;
      setErrors(otherErrors);
    }
  };

  const handleCancel = () => {
    light();
    onCancel();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      flex: 1,
    },
    content: {
      padding: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 24,
      textAlign: 'center',
    },
    fieldContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      minHeight: 44,
    },
    textInputError: {
      borderColor: theme.colors.error,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: 4,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    primaryButtonDisabled: {
      backgroundColor: theme.colors.textSecondary,
      opacity: 0.6,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
    },
    hint: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Create Clan Post</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Clan Tag</Text>
            <TextInput
              style={[
                styles.textInput,
                errors.clanTag && styles.textInputError,
              ]}
              value={clanTag}
              onChangeText={handleClanTagChange}
              placeholder="Enter clan tag (e.g., #ABC123)"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="characters"
              returnKeyType="next"
              editable={!isLoading && !isAutoPopulated}
            />
            {errors.clanTag && (
              <Text style={styles.errorText}>{errors.clanTag}</Text>
            )}
            <Text style={styles.hint}>
              {isAutoPopulated ? 'Using your current clan' : 'Include the # symbol at the beginning'}
            </Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                errors.callToAction && styles.textInputError,
              ]}
              value={callToAction}
              onChangeText={handleCallToActionChange}
              placeholder="Tell players about your clan..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              returnKeyType="default"
              editable={!isLoading}
            />
            {errors.callToAction && (
              <Text style={styles.errorText}>{errors.callToAction}</Text>
            )}
            <Text style={styles.hint}>
              Clan details, level, and member count will be automatically included
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.content, { paddingTop: 0 }]}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleCancel}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              isLoading && styles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityState={{ disabled: isLoading }}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Creating...' : 'Create Post'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}