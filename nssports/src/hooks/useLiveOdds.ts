import { useQuery } from '@tanstack/react-query';
import type { Game } from '@/types';
import { getGame } from '@/services/api';

/**
 * Fetches a single game for odds updates.
 * Does not attempt to display or rely on score/time; callers can ignore those fields.
 * 
 * Optimized polling strategy (Pro Plan):
 * - Active polling every 5s for live games (aggressive real-time updates)
 * - Refetches on window focus when data is stale
 * - Refetches on reconnect (network recovery)
 * - Background polling continues even when tab not focused
 * - Matches backend cache TTL (5s) for maximum freshness
 */
export function useLiveOdds(gameId: string | undefined) {
  return useQuery<{ game: Game | undefined }>({
    queryKey: ['live-odds', gameId],
    enabled: Boolean(gameId),
    queryFn: async () => ({ game: await getGame(gameId as string) }),
    staleTime: 5_000,            // 5 seconds - aggressive real-time updates for live betting
    refetchInterval: 5_000,      // Active polling every 5s (matches backend cache TTL)
    refetchIntervalInBackground: true, // Continue polling in background
    refetchOnWindowFocus: true,   // Refetch when user returns to tab (if stale)
    refetchOnReconnect: true,     // Refetch on network recovery
  });
}
