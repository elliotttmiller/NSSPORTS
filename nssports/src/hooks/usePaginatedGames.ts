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

const isDevelopment = process.env.NODE_ENV === 'development';

export function usePaginatedGames({ leagueId, status, page = 1, limit = 10, bypassCache = false }: UsePaginatedGamesParams) {
  return useQuery<PaginatedResponse<Game>>({
    queryKey: ['games', leagueId, status, page, limit, bypassCache ? Date.now() : 'cached'],
    queryFn: () => getGamesPaginated(leagueId, page, limit, bypassCache),
    
    // Environment-aware caching strategy
    staleTime: bypassCache ? 0 : (isDevelopment ? 60 * 1000 : 30 * 1000),
    
    // Only enable polling in production or when explicitly bypassing cache
    refetchInterval: bypassCache ? false : (isDevelopment ? false : 60 * 1000),
    refetchIntervalInBackground: false, // Never poll in background
    refetchOnWindowFocus: !isDevelopment, // Only refetch on focus in production
    
    // Keep previous data while loading to prevent UI flickering
    placeholderData: (previousData) => previousData,
  });
}
