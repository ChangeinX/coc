import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDashboardData, useRefreshDashboard, dashboardKeys } from '../useDashboard';
import { dashboardApi } from '../../api/dashboard.api';

// Mock the API
jest.mock('../../api/dashboard.api');
const mockedDashboardApi = dashboardApi as jest.Mocked<typeof dashboardApi>;

// Mock services
jest.mock('@services/apiClient');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useDashboard hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useDashboardData', () => {
    const mockDashboardData = {
      clan: {
        tag: '#123ABC',
        name: 'Test Clan',
        clanLevel: 10,
        clanPoints: 45000,
        requiredTrophies: 2800,
        warWins: 50,
        warLosses: 20,
        warWinStreak: 5,
        memberList: [],
        members: 0,
      },
      members: [
        {
          tag: '#PLAYER1',
          name: 'Player 1',
          townHallLevel: 12,
          trophies: 3200,
          donations: 150,
          donationsReceived: 75,
          loyalty: 45,
          risk_score: 25,
        }
      ],
      topRisk: []
    };

    it('fetches dashboard data successfully', async () => {
      mockedDashboardApi.getDashboardData.mockResolvedValue(mockDashboardData);

      const { result } = renderHook(
        () => useDashboardData('#123ABC'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockDashboardData);
      expect(mockedDashboardApi.getDashboardData).toHaveBeenCalledWith('#123ABC');
    });

    it('does not fetch when clanTag is null', () => {
      const { result } = renderHook(
        () => useDashboardData(null),
        { wrapper: createWrapper() }
      );

      expect(result.current.isPending).toBe(false);
      expect(mockedDashboardApi.getDashboardData).not.toHaveBeenCalled();
    });

    it('does not fetch when enabled is false', () => {
      const { result } = renderHook(
        () => useDashboardData('#123ABC', false),
        { wrapper: createWrapper() }
      );

      expect(result.current.isPending).toBe(false);
      expect(mockedDashboardApi.getDashboardData).not.toHaveBeenCalled();
    });

    it('handles API errors', async () => {
      const error = new Error('Clan not found');
      (error as any).status = 404;
      mockedDashboardApi.getDashboardData.mockRejectedValue(error);

      const { result } = renderHook(
        () => useDashboardData('#INVALID'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('does not retry on 404 errors', async () => {
      const error = new Error('Clan not found');
      (error as any).status = 404;
      mockedDashboardApi.getDashboardData.mockRejectedValue(error);

      renderHook(
        () => useDashboardData('#INVALID'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockedDashboardApi.getDashboardData).toHaveBeenCalledTimes(1);
      });

      // Should not retry on 404
      expect(mockedDashboardApi.getDashboardData).toHaveBeenCalledTimes(1);
    });
  });

  describe('useRefreshDashboard', () => {
    it('refreshes dashboard data', async () => {
      const queryClient = new QueryClient();
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const refetchQueriesSpy = jest.spyOn(queryClient, 'refetchQueries');

      // Mock implementation to resolve immediately
      invalidateQueriesSpy.mockResolvedValue(undefined);
      refetchQueriesSpy.mockResolvedValue(undefined as any);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useRefreshDashboard(),
        { wrapper }
      );

      await result.current.mutateAsync('#123ABC');

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['dashboard', 'dashboard', '#123ABC'],
      });

      expect(refetchQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['dashboard', 'dashboard', '#123ABC'],
      });
    });
  });

  describe('query key generators', () => {
    it('generates correct query keys', () => {

      expect(dashboardKeys.all).toEqual(['dashboard']);
      expect(dashboardKeys.clan('#123ABC')).toEqual(['dashboard', 'clan', '#123ABC']);
      expect(dashboardKeys.members('#123ABC')).toEqual(['dashboard', 'members', '#123ABC']);
      expect(dashboardKeys.risk('#123ABC')).toEqual(['dashboard', 'risk', '#123ABC']);
      expect(dashboardKeys.loyalty('#123ABC')).toEqual(['dashboard', 'loyalty', '#123ABC']);
      expect(dashboardKeys.dashboard('#123ABC')).toEqual(['dashboard', 'dashboard', '#123ABC']);
    });
  });
});