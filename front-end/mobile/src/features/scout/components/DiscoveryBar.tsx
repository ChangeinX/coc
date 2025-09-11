import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@theme/index';
import { useHaptics } from '@utils/index';

interface DiscoveryBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

export function DiscoveryBar({ searchQuery, onSearchChange, placeholder = 'Search...' }: DiscoveryBarProps) {
  const theme = useTheme();
  const { light } = useHaptics();

  const handleClear = () => {
    light();
    onSearchChange('');
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchIconText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      padding: 0, // Remove default padding on Android
    },
    clearButton: {
      marginLeft: 8,
      padding: 4,
    },
    clearButtonText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View testID="search-icon" style={styles.searchIcon}>
          <Text style={styles.searchIconText}>🔍</Text>
        </View>
        <TextInput
          style={styles.textInput}
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          accessibilityLabel="Search"
          returnKeyType="search"
          clearButtonMode="never" // We handle clear button manually
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            testID="clear-search-button"
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}