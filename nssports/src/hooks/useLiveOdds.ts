import { useQuery } from '@tanstack/react-query';
import type { Game } from '@/types';
import { getGame } from '@/services/api';

/**
 * Fetches a single game for odds updates.
 * Does not attempt to display or rely on score/time; callers can ignore those fields.
 * 
 * Optimized polling strategy:
 * - Refetches on window focus when data is stale (30s)
 * - No automatic polling - only manual refresh or navigation triggers updates
 * - Refetches on reconnect (network recovery)
 */
export function useLiveOdds(gameId: string | undefined) {
  return useQuery<{ game: Game | undefined }>({
    queryKey: ['live-odds', gameId],
    enabled: Boolean(gameId),
    queryFn: async () => ({ game: await getGame(gameId as string) }),
    staleTime: 30_000,            // 30 seconds
    refetchOnWindowFocus: true,   // Refetch when user returns to tab (if stale)
    refetchOnReconnect: true,     // Refetch on network recovery
    // No automatic polling - only refetch on mount, manual refresh, or window focus
  });
}
