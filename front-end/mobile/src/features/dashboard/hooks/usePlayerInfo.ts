import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@services/apiClient';

export type PlayerInfo = {
  tag: string;
  name: string;
  clanTag?: string;
  townHallLevel: number;
  trophies: number;
  role?: string;
};

export function usePlayerInfo(playerTag: string | null | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['player', playerTag],
    queryFn: () => apiFetch<PlayerInfo>(`/api/v1/player/${playerTag}`, { auth: true }),
    enabled: enabled && !!playerTag,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: (failureCount, error: any) => {
      if (error.status === 404) return false;
      return failureCount < 2;
    },
  });
}