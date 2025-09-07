import { create } from 'zustand';
import { MMKV } from '@services/storage/mmkv';

type ThemePref = 'light' | 'dark' | 'system';

type SettingsState = {
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
};

const THEME_KEY = 'theme.preference';

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: (MMKV.getString(THEME_KEY) as ThemePref | undefined) ?? 'system',
  setTheme: (theme) => {
    MMKV.set(THEME_KEY, theme);
    set({ theme });
  },
}));

