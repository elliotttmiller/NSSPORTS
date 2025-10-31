import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePropsStream } from '@/context/StreamingContext';

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
 * SMART CACHE STRATEGY - SYNCHRONIZED FRONTEND + BACKEND (Pro Plan):
 * 
 * The real-time update system works via REST API polling synchronized with 
 * backend smart cache TTL. React Query refetchInterval matches cache refresh rate.
 * 
 * SMART TTL STRATEGY (Dynamic based on game timing - Pro Plan):
 * - Live games: 15s (React Query + backend cache) - Sub-minute updates
 * - Critical (<1hr): 30s (synchronized frontend + backend)
 * - Active (1-24hr): 45s (Pro plan optimization)
 * - Standard (24hr+): 60s (Pro plan optimization)
 * 
 * Pro Plan: REST API polling only (no WebSocket streaming)
 * - 300 requests/minute rate limit
 * - Sub-minute update frequency via smart polling
 */
export function useGameProps(
  gameId: string, 
  enabled: boolean = true,
  isLiveGame?: boolean,  // Live status from component
  gameStartTime?: string | Date  // Game start time for smart TTL calculation
) {
  const queryClient = useQueryClient();
  
  // WebSocket streaming for instant invalidation (enhances smart TTL system)
  usePropsStream(gameId, () => {
    queryClient.invalidateQueries({ queryKey: ['gameProps', gameId] });
  });
  
  // ⭐ CALCULATE SMART STALE TIME - Must match backend cache TTL!
  const calculateSmartStaleTime = (): number => {
    // Live games: 15s (Pro plan sub-minute updates)
    if (isLiveGame) {
      return 15 * 1000;
    }
    
    // For upcoming games: Calculate based on time until start
    if (gameStartTime) {
      const now = new Date();
      const startTime = new Date(gameStartTime);
      const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilStart < 1) {
        return 30 * 1000;  // Critical: <1hr to start
      } else if (hoursUntilStart < 24) {
        return 45 * 1000;  // Active: 1-24hr to start (Pro plan)
      } else {
        return 60 * 1000; // Standard: 24hr+ to start (Pro plan)
      }
    }
    
    // Fallback: Use standard TTL if timing unknown
    return 60 * 1000;
  };
  
  const staleTime = calculateSmartStaleTime();
  
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
    staleTime,                    // Dynamic: 15s for live, 60s for upcoming (Pro plan)
    refetchInterval: staleTime,   // Active polling matches staleTime (Pro plan REST polling)
    refetchIntervalInBackground: true, // Continue polling in background
    gcTime: 10 * 60 * 1000,       // 10 minutes (keep in memory longer)
    refetchOnWindowFocus: false,  // Prevent spam on tab switching
    refetchOnReconnect: false,    // REST polling handles updates
  });
}
