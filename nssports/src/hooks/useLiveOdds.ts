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
    staleTime: 15_000,           // 15 seconds for live games
    refetchInterval: Boolean(gameId) ? 15_000 : false, // Poll every 15s when enabled
    refetchIntervalInBackground: true, // Continue in background
    refetchOnWindowFocus: false, // Prevent spam on tab switching
    refetchOnReconnect: false,   // Polling handles updates
  });
}
