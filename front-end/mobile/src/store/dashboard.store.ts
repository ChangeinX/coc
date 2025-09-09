import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'dashboard_prefs' });

export interface StatCardConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

interface DashboardState {
  // Dashboard customization
  statCards: StatCardConfig[];
  defaultSortField: string;
  defaultSortDirection: 'asc' | 'desc';
  showCompactMemberCards: boolean;
  autoRefreshInterval: number; // in minutes, 0 = disabled
  
  // Actions
  updateStatCardVisibility: (cardId: string, visible: boolean) => void;
  reorderStatCards: (newOrder: StatCardConfig[]) => void;
  setDefaultSort: (field: string, direction: 'asc' | 'desc') => void;
  setCompactMemberCards: (compact: boolean) => void;
  setAutoRefreshInterval: (minutes: number) => void;
  resetToDefaults: () => void;
}

const STORAGE_KEY = 'dashboard_preferences';

const defaultStatCards: StatCardConfig[] = [
  { id: 'members', label: 'Members', visible: true, order: 0 },
  { id: 'level', label: 'Clan Level', visible: true, order: 1 },
  { id: 'warWins', label: 'War Wins', visible: true, order: 2 },
  { id: 'warLosses', label: 'War Losses', visible: true, order: 3 },
  { id: 'winStreak', label: 'Win Streak', visible: true, order: 4 },
];

const defaultPreferences = {
  statCards: defaultStatCards,
  defaultSortField: 'loyalty',
  defaultSortDirection: 'desc' as const,
  showCompactMemberCards: false,
  autoRefreshInterval: 5, // 5 minutes
};

// Load preferences from storage
const loadPreferences = () => {
  try {
    const stored = storage.getString(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultPreferences,
        ...parsed,
        // Ensure stat cards have all required fields
        statCards: parsed.statCards?.length 
          ? parsed.statCards.map((card: any, index: number) => ({
              ...defaultStatCards.find(dc => dc.id === card.id) || defaultStatCards[index],
              ...card,
            }))
          : defaultStatCards,
      };
    }
    return defaultPreferences;
  } catch (error) {
    console.warn('Failed to load dashboard preferences:', error);
    return defaultPreferences;
  }
};

// Save preferences to storage
const savePreferences = (state: Omit<DashboardState, 'updateStatCardVisibility' | 'reorderStatCards' | 'setDefaultSort' | 'setCompactMemberCards' | 'setAutoRefreshInterval' | 'resetToDefaults'>) => {
  try {
    const { statCards, defaultSortField, defaultSortDirection, showCompactMemberCards, autoRefreshInterval } = state;
    storage.set(STORAGE_KEY, JSON.stringify({
      statCards,
      defaultSortField,
      defaultSortDirection,
      showCompactMemberCards,
      autoRefreshInterval,
    }));
  } catch (error) {
    console.warn('Failed to save dashboard preferences:', error);
  }
};

export const useDashboardStore = create<DashboardState>((set, get) => {
  const initialState = loadPreferences();
  
  return {
    ...initialState,

    updateStatCardVisibility: (cardId, visible) => {
      const state = get();
      const updatedCards = state.statCards.map(card =>
        card.id === cardId ? { ...card, visible } : card
      );
      
      const newState = { ...state, statCards: updatedCards };
      set(newState);
      savePreferences(newState);
    },

    reorderStatCards: (newOrder) => {
      const state = get();
      const newState = { ...state, statCards: newOrder };
      set(newState);
      savePreferences(newState);
    },

    setDefaultSort: (field, direction) => {
      const state = get();
      const newState = { 
        ...state, 
        defaultSortField: field, 
        defaultSortDirection: direction 
      };
      set(newState);
      savePreferences(newState);
    },

    setCompactMemberCards: (compact) => {
      const state = get();
      const newState = { ...state, showCompactMemberCards: compact };
      set(newState);
      savePreferences(newState);
    },

    setAutoRefreshInterval: (minutes) => {
      const state = get();
      const newState = { ...state, autoRefreshInterval: minutes };
      set(newState);
      savePreferences(newState);
    },

    resetToDefaults: () => {
      set(defaultPreferences);
      savePreferences(defaultPreferences);
    },
  };
});