import { userApi, UserProfile, UserFeatures } from '../user.api';
import { apiFetch } from '@services/apiClient';

// Mock the apiFetch function
jest.mock('@services/apiClient', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('userApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockProfile: UserProfile = {
        verified: true,
        risk_weight_war: 0.4,
        risk_weight_idle: 0.35,
        risk_weight_don_deficit: 0.15,
        risk_weight_don_drop: 0.1,
      };

      mockApiFetch.mockResolvedValue(mockProfile);

      const result = await userApi.getProfile();

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/users/profile', {
        auth: true,
      });
      expect(result).toEqual(mockProfile);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockApiFetch.mockRejectedValue(error);

      await expect(userApi.getProfile()).rejects.toThrow('API Error');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const profile: UserProfile = {
        verified: false,
        risk_weight_war: 0.6,
        risk_weight_idle: 0.25,
        risk_weight_don_deficit: 0.1,
        risk_weight_don_drop: 0.05,
      };

      mockApiFetch.mockResolvedValue(undefined);

      await userApi.updateProfile(profile);

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
        auth: true,
      });
    });
  });

  describe('getFeatures', () => {
    it('should fetch user features successfully', async () => {
      const mockFeatures: UserFeatures = {
        all: false,
        features: ['chat'],
      };

      mockApiFetch.mockResolvedValue(mockFeatures);

      const result = await userApi.getFeatures();

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/users/features', {
        auth: true,
      });
      expect(result).toEqual(mockFeatures);
    });
  });

  describe('updateFeatures', () => {
    it('should update user features successfully', async () => {
      const features: UserFeatures = {
        all: false,
        features: ['chat'],
      };

      mockApiFetch.mockResolvedValue(undefined);

      await userApi.updateFeatures(features);

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/users/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(features),
        auth: true,
      });
    });
  });

  describe('verifyAccount', () => {
    it('should verify account successfully', async () => {
      const request = { token: 'test-token' };

      mockApiFetch.mockResolvedValue(undefined);

      await userApi.verifyAccount(request);

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/users/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        auth: true,
      });
    });

    it('should handle verification errors', async () => {
      const request = { token: 'invalid-token' };
      const error = new Error('Invalid token');
      mockApiFetch.mockRejectedValue(error);

      await expect(userApi.verifyAccount(request)).rejects.toThrow('Invalid token');
    });
  });
});