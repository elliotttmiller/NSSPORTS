/**
 * Centralized Live Data Store
 * 
 * Single Source of Truth for all live sports data
 * Implements The Ubiquitous Data Doctrine:
 * - Protocol I: Single source of truth via Zustand
 * - Protocol II: Efficient state hydration
 * - Protocol III: Granular state consumption via selectors
 * - Protocol IV: Universal UI state handling
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Game } from '@/types';

/**
 * Store state shape
 */
interface LiveDataState {
  // Data
  matches: Game[];
  
  // Status tracking
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  
  // Last fetch timestamp for cache invalidation
  lastFetch: number | null;
  
  // Actions
  fetchMatches: (sportKey?: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  matches: [],
  status: 'idle' as const,
  error: null,
  lastFetch: null,
};

/**
 * Create the store with proper SSR support
 */
const createLiveDataStore = () => create<LiveDataState>()(
  persist(
    (set, get) => ({
      ...initialState,
  
  /**
   * Fetch matches from the internal BFF API
   * @param sportKey - Optional sport key (defaults to 'basketball_nba')
   */
  fetchMatches: async (sportKey = 'basketball_nba') => {
    // Prevent duplicate fetches if already loading
    if (get().status === 'loading') {
      return;
    }
    
    set({ status: 'loading', error: null });
    
    try {
      // Map sport keys to API endpoints
      const sportKeyMap: Record<string, string> = {
        'basketball_nba': 'basketball_nba',
        'americanfootball_nfl': 'americanfootball_nfl',
        'icehockey_nhl': 'icehockey_nhl',
      };
      
      const mappedSportKey = sportKeyMap[sportKey] || 'basketball_nba';
      
      // ⭐ OPTIMIZATION: Use lines=main for 60-80% smaller payload
      // Only fetches moneyline, spread, total (not props)
      // Props are fetched on-demand when user expands game card
      const response = await fetch(`/api/matches?sport=${mappedSportKey}&lines=main`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch matches: ${response.statusText}`);
      }
      
      const json = await response.json();
      
      // Handle both direct array and envelope response formats
      const matches = Array.isArray(json) ? json : (json.data || []);
      
      set({
        matches,
        status: 'success',
        error: null,
        lastFetch: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      set({
        status: 'error',
        error: errorMessage,
      });
      console.error('Error fetching matches:', error);
    }
  },
  
  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },
  
  /**
   * Reset store to initial state
   */
  reset: () => {
    set(initialState);
  },
}),
{
  name: 'live-data-store',
  storage: createJSONStorage(() => 
    typeof window !== 'undefined' ? localStorage : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  ),
  partialize: (state) => ({ 
    matches: state.matches,
    lastFetch: state.lastFetch 
  }),
}
));

/**
 * Store instance - created once and reused
 */
let store: ReturnType<typeof createLiveDataStore> | undefined;

/**
 * Get or create the store instance
 */
export const useLiveDataStore = (() => {
  if (!store) {
    store = createLiveDataStore();
  }
  return store;
})();

/**
 * Selectors for granular state consumption
 * Components should use these to subscribe only to the data they need
 * These are stable references to prevent infinite loops
 */

/**
 * Select a specific match by ID
 */
export const selectMatchById = (id: string) => (state: LiveDataState) => {
  return state.matches.find((match) => match.id === id);
};

/**
 * Select all matches
 */
export const selectAllMatches = (state: LiveDataState) => state.matches;

/**
 * Select loading state
 */
export const selectIsLoading = (state: LiveDataState) => state.status === 'loading';

/**
 * Select error state
 */
export const selectError = (state: LiveDataState) => state.error;

/**
 * Select success state
 */
export const selectIsSuccess = (state: LiveDataState) => state.status === 'success';

/**
 * Select whether store has been initialized
 */
export const selectIsInitialized = (state: LiveDataState) => 
  state.status !== 'idle' && state.lastFetch !== null;

/**
 * Select matches by status
 */
export const selectMatchesByStatus = (status: 'live' | 'upcoming' | 'finished') => 
  (state: LiveDataState) => {
    return state.matches.filter((match) => match.status === status);
  };

/**
 * Select live matches
 */
export const selectLiveMatches = (state: LiveDataState) => 
  state.matches.filter((match) => match.status === 'live');

/**
 * Select upcoming matches
 */
export const selectUpcomingMatches = (state: LiveDataState) => 
  state.matches.filter((match) => match.status === 'upcoming');

/**
 * Select fetchMatches function
 */
export const selectFetchMatches = (state: LiveDataState) => state.fetchMatches;

/**
 * Select all matches (alias for selectAllMatches)
 */
export const selectMatches = (state: LiveDataState) => state.matches;
