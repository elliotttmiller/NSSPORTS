import { useQuery } from '@tanstack/react-query';

export interface GameProp {
  id: string;
  propType: string;
  description: string;
  selection: string | null;
  odds: number;
  line: number | null;
}

export type GamePropsMap = Record<string, GameProp[]>;

/**
 * Fetch game props for a specific game
 * 
 * Optimized caching strategy:
 * - 2-minute stale time (game props don't change frequently)
 * - 10-minute garbage collection (keep in memory longer)
 * - No refetch on window focus (prevent unnecessary requests)
 * - Only enabled when explicitly requested (lazy loading)
 */
export function useGameProps(gameId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['gameProps', gameId],
    queryFn: async () => {
      const response = await fetch(`/api/matches/${gameId}/game-props`);
      if (!response.ok) {
        throw new Error('Failed to fetch game props');
      }
      const data = await response.json();
      return data.data as GamePropsMap;
    },
    enabled,
    staleTime: 2 * 60 * 1000,     // 2 minutes (increased from 1 min)
    gcTime: 10 * 60 * 1000,       // 10 minutes (increased from 5 min)
    refetchOnWindowFocus: false,  // Prevent spam on tab switching
    refetchOnReconnect: false,    // Props rarely change, no need to refetch
  });
}
