import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  clan: (clanTag: string) => [...dashboardKeys.all, 'clan', clanTag] as const,
  members: (clanTag: string) => [...dashboardKeys.all, 'members', clanTag] as const,
  risk: (clanTag: string) => [...dashboardKeys.all, 'risk', clanTag] as const,
  loyalty: (clanTag: string) => [...dashboardKeys.all, 'loyalty', clanTag] as const,
  dashboard: (clanTag: string) => [...dashboardKeys.all, 'dashboard', clanTag] as const,
};

// Cache settings
const CLAN_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CLAN_CACHE_TIME = 15 * 60 * 1000; // 15 minutes

// Hook for getting complete dashboard data
export function useDashboardData(clanTag: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.dashboard(clanTag || ''),
    queryFn: () => dashboardApi.getDashboardData(clanTag!),
    enabled: enabled && !!clanTag,
    staleTime: CLAN_STALE_TIME,
    gcTime: CLAN_CACHE_TIME,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (clan not found)
      if (error.status === 404) return false;
      return failureCount < 2;
    },
  });
}

// Hook for getting clan data only
export function useClanData(clanTag: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.clan(clanTag || ''),
    queryFn: () => dashboardApi.getClan(clanTag!),
    enabled: enabled && !!clanTag,
    staleTime: CLAN_STALE_TIME,
    gcTime: CLAN_CACHE_TIME,
    retry: (failureCount, error: any) => {
      if (error.status === 404) return false;
      return failureCount < 2;
    },
  });
}

// Hook for getting at-risk members
export function useAtRiskMembers(clanTag: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.risk(clanTag || ''),
    queryFn: () => dashboardApi.getAtRiskMembers(clanTag!),
    enabled: enabled && !!clanTag,
    staleTime: CLAN_STALE_TIME,
    gcTime: CLAN_CACHE_TIME,
  });
}

// Hook for getting member loyalty data
export function useMemberLoyalty(clanTag: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardKeys.loyalty(clanTag || ''),
    queryFn: () => dashboardApi.getMemberLoyalty(clanTag!),
    enabled: enabled && !!clanTag,
    staleTime: CLAN_STALE_TIME,
    gcTime: CLAN_CACHE_TIME,
  });
}

// Hook for refreshing dashboard data
export function useRefreshDashboard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clanTag: string) => {
      // Invalidate and refetch dashboard data
      await queryClient.invalidateQueries({
        queryKey: dashboardKeys.dashboard(clanTag),
      });
      // Refetch immediately
      return queryClient.refetchQueries({
        queryKey: dashboardKeys.dashboard(clanTag),
      });
    },
  });
}

// Hook for pre-loading dashboard data (for better UX)
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();
  
  return (clanTag: string) => {
    queryClient.prefetchQuery({
      queryKey: dashboardKeys.dashboard(clanTag),
      queryFn: () => dashboardApi.getDashboardData(clanTag),
      staleTime: CLAN_STALE_TIME,
    });
  };
}

// Hook for invalidating specific clan data
export function useInvalidateClan() {
  const queryClient = useQueryClient();
  
  return (clanTag: string) => {
    queryClient.invalidateQueries({
      queryKey: dashboardKeys.clan(clanTag),
    });
    queryClient.invalidateQueries({
      queryKey: dashboardKeys.dashboard(clanTag),
    });
  };
}