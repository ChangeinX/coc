import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@theme/index';
import { useHaptics } from '@utils/index';

interface PlayerPostFormProps {
  onSubmit: (data: { description: string }) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

interface ValidationErrors {
  description?: string;
}

export default function PlayerPostForm({ onSubmit, onCancel, isLoading }: PlayerPostFormProps) {
  const theme = useTheme();
  const { light } = useHaptics();
  
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!description.trim()) {
      newErrors.description = 'Please tell clans why they should recruit you';
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
        description: description.trim(),
      });
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    // Clear error when user starts typing
    if (errors.description) {
      const { description: _description, ...otherErrors } = errors;
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
      minHeight: 120,
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
          <Text style={styles.title}>Create Player Post</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Message to Clans</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                errors.description && styles.textInputError,
              ]}
              value={description}
              onChangeText={handleDescriptionChange}
              placeholder="Tell clans why they should recruit you..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              returnKeyType="default"
              editable={!isLoading}
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
            <Text style={styles.hint}>
              Your player profile, league, and stats will be automatically included
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