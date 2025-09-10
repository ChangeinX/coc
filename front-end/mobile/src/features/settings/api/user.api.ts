import { apiFetch } from '@services/apiClient';

// Types for user profile
export interface UserProfile {
  verified: boolean;
  risk_weight_war?: number;
  risk_weight_idle?: number;
  risk_weight_don_deficit?: number;
  risk_weight_don_drop?: number;
  [key: string]: any; // For additional profile fields
}

// Types for user features
export interface UserFeatures {
  all: boolean;
  features: string[];
}

// Types for verification request
export interface VerificationRequest {
  token: string;
}

// User API service
export const userApi = {
  // Get user profile
  getProfile: async (): Promise<UserProfile> => {
    return apiFetch<UserProfile>('/api/v1/users/profile', {
      auth: true,
    });
  },

  // Update user profile
  updateProfile: async (profile: UserProfile): Promise<void> => {
    return apiFetch<void>('/api/v1/users/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
      auth: true,
    });
  },

  // Get user features
  getFeatures: async (): Promise<UserFeatures> => {
    return apiFetch<UserFeatures>('/api/v1/users/features', {
      auth: true,
    });
  },

  // Update user features
  updateFeatures: async (features: UserFeatures): Promise<void> => {
    return apiFetch<void>('/api/v1/users/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
      auth: true,
    });
  },

  // Verify user account with API token
  verifyAccount: async (request: VerificationRequest): Promise<void> => {
    return apiFetch<void>('/api/v1/users/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      auth: true,
    });
  },
};