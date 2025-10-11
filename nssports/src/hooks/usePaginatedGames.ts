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
    staleTime: 1000 * 60,
    placeholderData: (previousData) => previousData,
  });
}
