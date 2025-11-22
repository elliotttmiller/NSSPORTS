/**
 * Batch Games Hook
 * 
 * ⭐ PHASE 3: Batch Request Optimization
 * 
 * Fetches multiple games in a single API call using official eventIDs parameter.
 * Reduces API requests by 50-80% for multi-game views.
 * 
 * Use Cases:
 * - League overview pages (fetch all games at once)
 * - Multi-game parlays (fetch all parlay legs at once)
 * - Live dashboards (batch refresh multiple games)
 * 
 * Example:
 * ```typescript
 * const { data: games, isLoading } = useBatchGames(['game1', 'game2', 'game3']);
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { Game } from '@/types';

interface BatchGamesResponse {
  success: boolean;
  data: Game[];
  meta: {
    requestedCount: number;
    returnedCount: number;
    optimization: string;
    individualCallsSaved: number;
    lines: string;
    source: string;
  };
}

export function useBatchGames(
  eventIds: string[] | undefined,
  options: {
    lines?: 'main' | 'all';
    enabled?: boolean;
  } = {}
) {
  const { lines = 'main', enabled = true } = options;
  
  return useQuery<Game[], Error>({
    queryKey: ['batch-games', eventIds, lines],
    queryFn: async () => {
      if (!eventIds || eventIds.length === 0) {
        return [];
      }
      
      // Join event IDs into comma-separated string (official format)
      const eventIdsParam = eventIds.join(',');
      
      const response = await fetch(
        `/api/matches/batch?eventIds=${encodeURIComponent(eventIdsParam)}&lines=${lines}`,
        {
          credentials: 'include',
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch batch games: ${response.statusText}`);
      }
      
      const json: BatchGamesResponse = await response.json();
      
      return json.data;
    },
    enabled: enabled && !!eventIds && eventIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: (enabled && eventIds && eventIds.length > 0) ? 30 * 1000 : false,
    refetchIntervalInBackground: true, // Continue in background
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

/**
 * Batch Games Hook with Auto-Splitting
 * 
 * Automatically splits large batches into multiple API calls
 * to respect the 20-game batch size limit.
 */
export function useBatchGamesWithSplitting(
  eventIds: string[] | undefined,
  options: {
    lines?: 'main' | 'all';
    enabled?: boolean;
    batchSize?: number;
  } = {}
) {
  const { lines = 'main', enabled = true, batchSize = 20 } = options;
  
  return useQuery<Game[], Error>({
    queryKey: ['batch-games-split', eventIds, lines, batchSize],
    queryFn: async () => {
      if (!eventIds || eventIds.length === 0) {
        return [];
      }
      
      // Split into batches
      const batches: string[][] = [];
      for (let i = 0; i < eventIds.length; i += batchSize) {
        batches.push(eventIds.slice(i, i + batchSize));
      }
      
      // Fetch all batches in parallel
      const batchPromises = batches.map(async (batch) => {
        const eventIdsParam = batch.join(',');
        const response = await fetch(
          `/api/matches/batch?eventIds=${encodeURIComponent(eventIdsParam)}&lines=${lines}`,
          {
            credentials: 'include',
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch batch: ${response.statusText}`);
        }
        
        const json: BatchGamesResponse = await response.json();
        return json.data;
      });
      
      const results = await Promise.all(batchPromises);
      const allGames = results.flat();
      
      return allGames;
    },
    enabled: enabled && !!eventIds && eventIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: (enabled && eventIds && eventIds.length > 0) ? 30 * 1000 : false,
    refetchIntervalInBackground: true, // Continue in background
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
