import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePropsStream } from '@/context/StreamingContext';

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
 * SMART CACHE STRATEGY INTEGRATION:
 * - Inherits smart TTL from hybrid-cache (30s/60s/120s based on game start time)
 * - Uses React Query staleTime that aligns with backend cache strategy
 * - 2-minute base stale time matches STANDARD window (games 24+ hours away)
 * - 10-minute garbage collection keeps data in memory
 * 
 * REAL-TIME STREAMING (NEW):
 * - Subscribes to WebSocket props updates when streaming enabled
 * - Automatically invalidates cache when props change via streaming
 * - <1s latency for props updates across all sports (NFL, NHL, NBA, MLB)
 * - Works globally with liveDataStore streaming architecture
 * 
 * OPTIMIZATION STRATEGY:
 * - Only enabled when explicitly requested (lazy loading)
 * - No refetch on window focus (prevent spam)
 * - No refetch on reconnect (props rarely change)
 * - Streaming invalidation ensures data stays fresh without polling
 */
export function usePlayerProps(gameId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  
  // Subscribe to real-time props streaming updates
  // Automatically invalidates cache when props change via WebSocket
  usePropsStream(gameId, () => {
    // Invalidate player props cache for this game
    // React Query will refetch on next access
    queryClient.invalidateQueries({ queryKey: ['playerProps', gameId] });
  });
  
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
    staleTime: 2 * 60 * 1000,     // 2 minutes (aligns with STANDARD cache window)
    gcTime: 10 * 60 * 1000,       // 10 minutes (keep in memory longer)
    refetchOnWindowFocus: false,  // Prevent spam on tab switching
    refetchOnReconnect: false,    // Props rarely change, streaming handles updates
  });
}
