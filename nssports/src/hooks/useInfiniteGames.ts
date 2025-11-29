import { useInfiniteQuery } from '@tanstack/react-query';
import type { PaginatedResponse, Game } from '@/types';
import { getGamesPaginated } from '@/services/api';

export interface UseInfiniteGamesParams {
  leagueId?: string;
  status?: string; // reserved for future filtering if API supports it
  limit?: number;
  bypassCache?: boolean; // Force fresh data from SDK
  // When true, instruct server to bypass development sampling/limits (development only)
  skipDevLimit?: boolean;
}

const isDevelopment = process.env.NODE_ENV === 'development';

export function useInfiniteGames({ leagueId, status, limit = 10, bypassCache = false, skipDevLimit = false }: UseInfiniteGamesParams) {
  // Note: status is included in the key for future extensibility
  return useInfiniteQuery<PaginatedResponse<Game>>({
    queryKey: ['games', 'infinite', leagueId, status, limit, bypassCache ? Date.now() : 'cached'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      // Safely convert pageParam to number, defaulting to 1 if invalid
      const page = typeof pageParam === 'number' && Number.isFinite(pageParam) ? pageParam : 1;
      return getGamesPaginated(leagueId, page, limit, bypassCache, skipDevLimit);
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination) return undefined;
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined;
    },
    
    // Environment-aware caching strategy
    staleTime: bypassCache ? 0 : (isDevelopment ? 90 * 1000 : 30 * 1000),
    
    // Only refetch on window focus in production
    refetchOnWindowFocus: !isDevelopment,
    
    // No automatic polling - rely on manual refresh or window focus
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });
}
