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
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}
