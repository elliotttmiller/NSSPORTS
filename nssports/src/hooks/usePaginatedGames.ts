import { useQuery } from '@tanstack/react-query';
import type { PaginatedResponse, Game } from '@/types';
import { getGamesPaginated } from '@/services/api';

export interface UsePaginatedGamesParams {
  leagueId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function usePaginatedGames({ leagueId, status, page = 1, limit = 10 }: UsePaginatedGamesParams) {
  return useQuery<PaginatedResponse<Game>>({
    queryKey: ['games', leagueId, status, page, limit],
    queryFn: () => getGamesPaginated(leagueId, page, limit),
    staleTime: 30 * 1000, // 30 seconds - Pro plan sub-minute updates
    refetchInterval: 30 * 1000, // Active polling every 30s for Pro plan
    refetchIntervalInBackground: true, // Continue polling in background
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    placeholderData: (previousData) => previousData,
  });
}
