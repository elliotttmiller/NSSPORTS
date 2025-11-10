import { useQuery } from '@tanstack/react-query';
import type { PaginatedResponse, Game } from '@/types';
import { getGamesPaginated } from '@/services/api';

export interface UsePaginatedGamesParams {
  leagueId?: string;
  status?: string;
  page?: number;
  limit?: number;
  bypassCache?: boolean; // Force fresh data from SDK
}

export function usePaginatedGames({ leagueId, status, page = 1, limit = 10, bypassCache = false }: UsePaginatedGamesParams) {
  return useQuery<PaginatedResponse<Game>>({
    queryKey: ['games', leagueId, status, page, limit, bypassCache ? Date.now() : 'cached'],
    queryFn: () => getGamesPaginated(leagueId, page, limit, bypassCache),
    staleTime: bypassCache ? 0 : 30 * 1000, // 30 seconds - Pro plan sub-minute updates
    refetchInterval: bypassCache ? false : 30 * 1000, // Active polling every 30s for Pro plan
    refetchIntervalInBackground: !bypassCache, // Continue polling in background
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    placeholderData: (previousData) => previousData,
  });
}
