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
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}
