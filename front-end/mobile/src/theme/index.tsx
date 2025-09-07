import { createContext, useCallback, useContext, useMemo, useState, PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { MMKV } from '@services/storage/mmkv';
import { darkTheme } from './dark';
import { lightTheme } from './light';

type ThemeName = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: typeof lightTheme | typeof darkTheme;
  name: ThemeName;
  isDark: boolean;
  colors: typeof lightTheme['colors'];
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
    () => ({ theme, name, isDark: effectiveDark, colors: theme.colors, setTheme }),
    [theme, name, effectiveDark, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
