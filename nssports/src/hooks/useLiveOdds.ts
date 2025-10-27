import { useQuery } from '@tanstack/react-query';
import type { Game } from '@/types';
import { getGame } from '@/services/api';

/**
 * Polls a single game for odds updates while game is live.
 * Does not attempt to display or rely on score/time; callers can ignore those fields.
 * 
 * Optimized polling strategy:
 * - 15-second intervals (reduced from 5s to minimize API load)
 * - No refetch on window focus (prevents spam on tab switching)
 * - Only refetches on reconnect (network recovery)
 */
export function useLiveOdds(gameId: string | undefined) {
  return useQuery<{ game: Game | undefined }>({
    queryKey: ['live-odds', gameId],
    enabled: Boolean(gameId),
    queryFn: async () => ({ game: await getGame(gameId as string) }),
    staleTime: 15_000,            // 15 seconds (reduced from 5s)
    refetchInterval: 15_000,      // Poll every 15 seconds
    refetchOnWindowFocus: false,  // Don't spam on tab switch
    refetchOnReconnect: true,     // Refetch on network recovery
  });
}
