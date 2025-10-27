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
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    placeholderData: (previousData) => previousData,
    // No automatic polling - only refetch on mount, manual refresh, or window focus
  });
}
