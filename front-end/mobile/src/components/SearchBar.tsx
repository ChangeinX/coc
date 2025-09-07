import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  Keyboard,
  ActivityIndicator 
} from 'react-native';
import { useThemedStyles, useTheme } from '@theme/index';

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onClear?: () => void;
  loading?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  returnKeyType?: 'search' | 'done' | 'go';
  submitButtonText?: string;
}

export function SearchBar({
  placeholder = 'Search...',
  value,
  onChangeText,
  onSubmit,
  onClear,
  loading = false,
  disabled = false,
  autoFocus = false,
  keyboardType = 'default',
  returnKeyType = 'search',
  submitButtonText = 'Search',
}: SearchBarProps) {
  const theme = useTheme();
  const commonStyles = useThemedStyles();
  const [internalValue, setInternalValue] = useState('');
  
  const currentValue = value !== undefined ? value : internalValue;
  const handleTextChange = value !== undefined ? onChangeText : setInternalValue;

  const handleSubmit = () => {
    if (currentValue.trim() && onSubmit) {
      onSubmit(currentValue.trim());
      Keyboard.dismiss();
    }
  };

  const handleClear = () => {
    if (handleTextChange) {
      handleTextChange('');
    }
    if (onClear) {
      onClear();
    }
  };

  return (
    <View style={{
      flexDirection: 'row',
      gap: theme.spacing.sm,
      alignItems: 'center',
    }}>
      <View style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        ...commonStyles.input,
        paddingRight: theme.spacing.sm,
      }}>
        <TextInput
          style={{
            flex: 1,
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.text,
            padding: 0, // Remove default padding to use parent's padding
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.inputPlaceholder}
          value={currentValue}
          onChangeText={handleTextChange}
          onSubmitEditing={handleSubmit}
          editable={!disabled && !loading}
          autoFocus={autoFocus}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        {loading && (
          <ActivityIndicator 
            size="small" 
            color={theme.colors.primary}
            style={{ marginLeft: theme.spacing.sm }}
          />
        )}
        
        {currentValue.length > 0 && !loading && (
          <TouchableOpacity
            onPress={handleClear}
            style={{
              marginLeft: theme.spacing.sm,
              padding: theme.spacing.xs,
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{
              fontSize: theme.typography.fontSize.lg,
              color: theme.colors.textMuted,
            }}>
              ×
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {onSubmit && (
        <TouchableOpacity
          style={{
            ...commonStyles.primaryButton,
            opacity: (!currentValue.trim() || loading || disabled) ? 0.5 : 1,
          }}
          onPress={handleSubmit}
          disabled={!currentValue.trim() || loading || disabled}
        >
          <Text style={{
            color: theme.colors.textInverse,
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.medium,
          }}>
            {submitButtonText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}