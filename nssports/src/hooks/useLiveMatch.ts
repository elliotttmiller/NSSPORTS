/**
 * Custom hook for accessing live match data
 * 
 * This hook provides a simple interface for components to:
 * 1. Get fresh match data from the centralized store
 * 2. Subscribe to specific match updates
 * 3. Ensure Protocol III: Granular State Consumption
 */

import { useLiveDataStore, selectMatchById } from '@/store';
import { Game } from '@/types';
import { useMemo } from 'react';

/**
 * Get a specific match by ID from the live data store
 * Returns the latest match data from the centralized store
 * 
 * @param matchId - The ID of the match to retrieve
 * @returns The match or undefined if not found
 */
export function useLiveMatch(matchId: string | undefined): Game | undefined {
  return useLiveDataStore(
    useMemo(
      () => (matchId ? selectMatchById(matchId) : () => undefined),
      [matchId]
    )
  );
}

/**
 * Get all live matches from the store
 */
export function useLiveMatches(): Game[] {
  return useLiveDataStore((state) => state.matches);
}

/**
 * Check if the store is currently loading data
 */
export function useIsMatchesLoading(): boolean {
  return useLiveDataStore((state) => state.status === 'loading');
}

/**
 * Get any error from the store
 */
export function useMatchesError(): string | null {
  return useLiveDataStore((state) => state.error);
}
