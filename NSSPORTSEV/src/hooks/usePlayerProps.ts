import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePropsStream } from '@/context/StreamingContext';
import { getPlayerProps } from '@/services/api';

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
 * SMART CACHE STRATEGY - SYNCHRONIZED FRONTEND + BACKEND (Pro Plan):
 * 
 * The real-time update system works via REST API polling synchronized with 
 * backend smart cache TTL. React Query refetchInterval matches cache refresh rate.
 * 
 * FLOW (Pro Plan REST Polling):
 * 1. React Query checks: "Is my data stale?" (based on staleTime)
 * 2. If stale → Fetch from API endpoint
 * 3. API → hybrid-cache checks: "Is Prisma cache stale?" (based on TTL)
 * 4. If stale → Fetch fresh data from SDK (within 300 req/min limit)
 * 5. Return real-time data to frontend
 * 
 * SMART TTL STRATEGY (Dynamic based on game timing - Pro Plan):
 * - Live games: 15s (React Query + backend cache) - Sub-minute updates
 * - Critical (<1hr): 30s (synchronized frontend + backend)
 * - Active (1-24hr): 45s (Pro plan optimization)
 * - Standard (24hr+): 60s (Pro plan optimization)
 * 
 * RESULT: Seamless real-time updates via REST polling
 * - Live games: New odds every 15 seconds automatically (sub-minute)
 * - Critical games: New odds every 30 seconds automatically
 * - Active games: New odds every 60 seconds automatically
 * - Standard games: New odds every 120 seconds automatically
 * 
 * WebSocket Streaming (Enhancement):
 * - Triggers immediate invalidation for <1s updates (bypasses wait time)
 * - Not required - smart TTL system works perfectly standalone
 */
export function usePlayerProps(
  gameId: string, 
  enabled: boolean = true,
  isLiveGame?: boolean,  // Live status from component
  gameStartTime?: string | Date  // Game start time for smart TTL calculation
) {
  const queryClient = useQueryClient();
  
  // WebSocket streaming for instant invalidation (enhances smart TTL system)
  usePropsStream(gameId, () => {
    queryClient.invalidateQueries({ queryKey: ['playerProps', gameId] });
  });
  
  // ⭐ CALCULATE SMART STALE TIME - Must match backend cache TTL!
  // This synchronizes frontend refetch rate with backend cache refresh rate
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
    queryKey: ['playerProps', gameId],
    queryFn: async () => {
      const data = await getPlayerProps(gameId);
      return data as PlayerProp[];
    },
    enabled,
    staleTime,                    // Dynamic: 15s for live, 120s for upcoming
    refetchInterval: enabled ? staleTime : false, // Smart polling when enabled
    refetchIntervalInBackground: true, // Continue in background
    gcTime: 10 * 60 * 1000,       // 10 minutes (keep in memory longer)
    refetchOnWindowFocus: false,  // Prevent spam on tab switching
    refetchOnReconnect: false,    // Polling handles updates
  });
}
