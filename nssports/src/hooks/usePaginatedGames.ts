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

// ✅ OPTIMIZATION: Stable query key factory for better caching
// Prevents unnecessary cache invalidations from dynamic timestamp
const getQueryKey = (params: UsePaginatedGamesParams) => {
  const { leagueId, status, page = 1, limit = 10, bypassCache = false } = params;
  
  // Only include timestamp in key when explicitly bypassing cache
  // Otherwise use a stable key for better cache hit rates
  return [
    'games',
    leagueId ?? 'all',
    status ?? 'all',
    page,
    limit,
    bypassCache ? 'bypass' : 'cached',
  ] as const;
};

export function usePaginatedGames({ leagueId, status, page = 1, limit = 10, bypassCache = false }: UsePaginatedGamesParams) {
  return useQuery<PaginatedResponse<Game>>({
    // ✅ OPTIMIZATION: Use stable query key factory
    queryKey: getQueryKey({ leagueId, status, page, limit, bypassCache }),
    queryFn: () => getGamesPaginated(leagueId, page, limit, bypassCache),
    
    // Environment-aware caching strategy
    staleTime: bypassCache ? 0 : (isDevelopment ? 60 * 1000 : 30 * 1000),
    
    // Only enable polling in production or when explicitly bypassing cache
    refetchInterval: bypassCache ? false : (isDevelopment ? false : 60 * 1000),
    refetchIntervalInBackground: false, // Never poll in background
    refetchOnWindowFocus: !isDevelopment, // Only refetch on focus in production
    
    // ✅ OPTIMIZATION: Keep previous data while loading to prevent UI flickering
    // Type-safe with explicit any to satisfy TypeScript
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    placeholderData: (previousData: any) => previousData,
  });
}
