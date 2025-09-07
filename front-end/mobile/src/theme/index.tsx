import { createContext, useCallback, useContext, useMemo, useState, PropsWithChildren } from 'react';
import { useColorScheme, ViewStyle, TextStyle } from 'react-native';
import { MMKV } from '@services/storage/mmkv';
import { darkTheme } from './dark';
import { lightTheme } from './light';

type ThemeName = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: typeof lightTheme | typeof darkTheme;
  name: ThemeName;
  isDark: boolean;
  colors: typeof lightTheme['colors'];
  typography: typeof lightTheme['typography'];
  spacing: typeof lightTheme['spacing'];
  borderRadius: typeof lightTheme['borderRadius'];
  shadows: typeof lightTheme['shadows'];
  gradients: typeof lightTheme['gradients'];
  setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = 'theme.preference';

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const systemScheme = useColorScheme();
  const [name, setName] = useState<ThemeName>(() => {
    const saved = MMKV.getString(THEME_KEY) as ThemeName | undefined;
    return saved ?? 'system';
  });

  const effectiveDark = name === 'dark' || (name === 'system' && systemScheme === 'dark');
  const theme = effectiveDark ? darkTheme : lightTheme;

  const setTheme = useCallback((next: ThemeName) => {
    setName(next);
    MMKV.set(THEME_KEY, next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ 
      theme, 
      name, 
      isDark: effectiveDark, 
      colors: theme.colors,
      typography: theme.typography,
      spacing: theme.spacing,
      borderRadius: theme.borderRadius,
      shadows: theme.shadows,
      gradients: theme.gradients,
      setTheme 
    }),
    [theme, name, effectiveDark, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

// Theme utility functions for creating common styles
export const createThemedStyles = <T extends Record<string, ViewStyle | TextStyle>>(
  styleFunction: (theme: ThemeContextValue) => T
) => {
  return () => {
    const theme = useTheme();
    return styleFunction(theme);
  };
};

// Common style utilities
export const useThemedStyles = () => {
  const theme = useTheme();
  
  return {
    // Card styles
    card: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.base,
      ...theme.shadows.base,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    
    // Input styles
    input: {
      backgroundColor: theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: theme.borderRadius.base,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
    },
    
    // Button styles
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.base,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      ...theme.shadows.sm,
    },
    
    // Text styles
    heading1: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold as TextStyle['fontWeight'],
      color: theme.colors.text,
    },
    
    heading2: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.semibold as TextStyle['fontWeight'],
      color: theme.colors.text,
    },
    
    body: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.normal as TextStyle['fontWeight'],
      color: theme.colors.text,
    },
    
    bodySecondary: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.normal as TextStyle['fontWeight'],
      color: theme.colors.textSecondary,
    },
    
    caption: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.normal as TextStyle['fontWeight'],
      color: theme.colors.textMuted,
    },
  };
};
