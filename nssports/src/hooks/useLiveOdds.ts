import { useQuery } from '@tanstack/react-query';
import type { Game } from '@/types';
import { getGame } from '@/services/api';

/**
 * Polls a single game for odds updates while game is live.
 * Does not attempt to display or rely on score/time; callers can ignore those fields.
 */
export function useLiveOdds(gameId: string | undefined) {
  return useQuery<{ game: Game | undefined }>({
    queryKey: ['live-odds', gameId],
    enabled: Boolean(gameId),
    queryFn: async () => ({ game: await getGame(gameId as string) }),
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });
}
