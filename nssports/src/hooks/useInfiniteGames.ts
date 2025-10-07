import { useInfiniteQuery } from '@tanstack/react-query';
import type { PaginatedResponse, Game } from '@/types';
import { getGamesPaginated } from '@/services/api';

export interface UseInfiniteGamesParams {
  leagueId?: string;
  status?: string; // reserved for future filtering if API supports it
  limit?: number;
}

export function useInfiniteGames({ leagueId, status, limit = 10 }: UseInfiniteGamesParams) {
  // Note: status is included in the key for future extensibility
  return useInfiniteQuery<PaginatedResponse<Game>>({
    queryKey: ['games', 'infinite', leagueId, status, limit],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getGamesPaginated(leagueId, pageParam as number, limit),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination) return undefined;
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined;
    },
  staleTime: 30 * 1000,
  // Auto-refresh upcoming lists to detect status changes (move to live)
  refetchInterval: status === 'upcoming' ? 30_000 : undefined,
  refetchOnWindowFocus: true,
  });
}
