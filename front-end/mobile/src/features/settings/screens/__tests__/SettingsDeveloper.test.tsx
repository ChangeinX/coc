import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../SettingsScreen';
import { ThemeProvider } from '@theme/index';

// Mock user API to avoid network in mount effect
jest.mock('../../api/user.api', () => ({
  userApi: {
    getProfile: jest.fn(async () => ({ verified: true })),
    getFeatures: jest.fn(async () => ({ all: true, features: ['chat'] })),
    updateProfile: jest.fn(),
    updateFeatures: jest.fn(),
    verifyAccount: jest.fn(),
  },
}));

// Mock Alert to observe modal calls
import { Alert } from 'react-native';
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('Settings Developer section', () => {
  it('shows JWKS cache button and fetches cache data', async () => {
    // Arrange: mock jwks-cache response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        kids: { 'dev-1': 'abcd1234' },
        lastFetch: '2025-09-01T00:00:00Z',
        providerLastUpdated: '2025-09-01T00:00:00Z',
      }),
    });

    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    // Act: press the JWKS cache button
    const btn = await screen.findByText('Show JWKS Cache');
    fireEvent.press(btn);

    // Assert: fetch called and alert shown
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/chat/debug/jwks-cache')
      );
      expect(Alert.alert).toHaveBeenCalled();
    });
  });
});
