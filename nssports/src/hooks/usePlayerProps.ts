import { useQuery } from '@tanstack/react-query';

export interface PlayerProp {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  team: "home" | "away";
  statType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  category: string;
}

/**
 * Fetch player props for a specific game
 * 
 * Optimized caching strategy:
 * - 2-minute stale time (props don't change frequently)
 * - 10-minute garbage collection (keep in memory longer)
 * - No refetch on window focus (prevent unnecessary requests)
 * - Only enabled when explicitly requested (lazy loading)
 */
export function usePlayerProps(gameId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['playerProps', gameId],
    queryFn: async () => {
      const response = await fetch(`/api/matches/${gameId}/player-props`);
      if (!response.ok) {
        throw new Error('Failed to fetch player props');
      }
      const data = await response.json();
      return data.data as PlayerProp[];
    },
    enabled,
    staleTime: 2 * 60 * 1000,     // 2 minutes (increased from 1 min)
    gcTime: 10 * 60 * 1000,       // 10 minutes (increased from 5 min)
    refetchOnWindowFocus: false,  // Prevent spam on tab switching
    refetchOnReconnect: false,    // Props rarely change, no need to refetch
  });
}
