import { create } from 'zustand';
import { UserProfile, UserFeatures } from '@features/settings/api/user.api';

type ProfileState = {
  profile: UserProfile | null;
  features: UserFeatures | null;
  isLoading: boolean;
  error: string | null;
  setProfile: (profile: UserProfile | null) => void;
  setFeatures: (features: UserFeatures | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  features: null,
  isLoading: false,
  error: null,
  setProfile: (profile) => set({ profile }),
  setFeatures: (features) => set({ features }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ 
    profile: null, 
    features: null, 
    isLoading: false, 
    error: null 
  }),
}));