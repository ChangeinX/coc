import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'favorites' });

export interface FavoriteMember {
  tag: string;
  name: string;
  addedAt: number;
}

interface FavoritesState {
  favoriteMembers: FavoriteMember[];
  addFavorite: (member: { tag: string; name: string }) => void;
  removeFavorite: (tag: string) => void;
  isFavorite: (tag: string) => boolean;
  clearFavorites: () => void;
}

const STORAGE_KEY = 'favorite_members';

// Load initial favorites from storage
const loadFavorites = (): FavoriteMember[] => {
  try {
    const stored = storage.getString(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load favorites:', error);
    return [];
  }
};

// Save favorites to storage
const saveFavorites = (favorites: FavoriteMember[]) => {
  try {
    storage.set(STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.warn('Failed to save favorites:', error);
  }
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteMembers: loadFavorites(),

  addFavorite: (member) => {
    const { favoriteMembers } = get();
    
    // Don't add duplicates
    if (favoriteMembers.some(fav => fav.tag === member.tag)) {
      return;
    }

    const newFavorite: FavoriteMember = {
      ...member,
      addedAt: Date.now(),
    };

    const updatedFavorites = [...favoriteMembers, newFavorite];
    
    set({ favoriteMembers: updatedFavorites });
    saveFavorites(updatedFavorites);
  },

  removeFavorite: (tag) => {
    const { favoriteMembers } = get();
    const updatedFavorites = favoriteMembers.filter(fav => fav.tag !== tag);
    
    set({ favoriteMembers: updatedFavorites });
    saveFavorites(updatedFavorites);
  },

  isFavorite: (tag) => {
    const { favoriteMembers } = get();
    return favoriteMembers.some(fav => fav.tag === tag);
  },

  clearFavorites: () => {
    set({ favoriteMembers: [] });
    saveFavorites([]);
  },
}));