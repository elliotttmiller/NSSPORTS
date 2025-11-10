import { useInfiniteQuery } from '@tanstack/react-query';
import type { PaginatedResponse, Game } from '@/types';
import { getGamesPaginated } from '@/services/api';

export interface UseInfiniteGamesParams {
  leagueId?: string;
  status?: string; // reserved for future filtering if API supports it
  limit?: number;
  bypassCache?: boolean; // Force fresh data from SDK
}

export function useInfiniteGames({ leagueId, status, limit = 10, bypassCache = false }: UseInfiniteGamesParams) {
  // Note: status is included in the key for future extensibility
  return useInfiniteQuery<PaginatedResponse<Game>>({
    queryKey: ['games', 'infinite', leagueId, status, limit, bypassCache ? Date.now() : 'cached'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getGamesPaginated(leagueId, pageParam as number, limit, bypassCache),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination) return undefined;
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined;
    },
    staleTime: bypassCache ? 0 : 30 * 1000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    // No automatic polling - only refetch on mount, manual refresh, or window focus
  });
}
