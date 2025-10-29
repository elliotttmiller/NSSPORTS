/**
 * Centralized Live Data Store
 * 
 * Single Source of Truth for all live sports data
 * Implements The Ubiquitous Data Doctrine:
 * - Protocol I: Single source of truth via Zustand
 * - Protocol II: Efficient state hydration
 * - Protocol III: Granular state consumption via selectors
 * - Protocol IV: Universal UI state handling
 * 
 * Phase 4 Enhancement: WebSocket Streaming Integration
 * - Uses official SportsGameOdds streaming API for live games
 * - Real-time updates via Pusher WebSocket (80% fewer polling requests)
 * - Fallback to REST polling for non-live games
 * - Automatic connection management and reconnection
 * - Status transition detection (upcoming → live → finished)
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Game } from '@/types';
import { StreamingService } from '@/lib/streaming-service';
import { logger } from '@/lib/logger';

// Singleton streaming service instance
let streamingService: StreamingService | null = null;

/**
 * Get or create streaming service instance
 */
function getStreamingService(): StreamingService {
  if (!streamingService) {
    streamingService = new StreamingService();
  }
  return streamingService;
}

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
  
  // Streaming state
  streamingEnabled: boolean;
  streamingStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  
  // Actions
  fetchMatches: (sportKey?: string) => Promise<void>;
  enableStreaming: () => Promise<void>;
  disableStreaming: () => void;
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
  streamingEnabled: false,
  streamingStatus: 'disconnected' as const,
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
   * Enable WebSocket streaming for live games
   * 
   * ⭐ PHASE 4: Real-Time Updates
   * - Connects to official SportsGameOdds streaming API
   * - Uses Pusher WebSocket for real-time odds updates
   * - 80% reduction in polling requests
   * - Automatic reconnection on connection loss
   * - GLOBAL: Works across all sports (NBA, NFL, NHL, etc.)
   * 
   * Official Implementation per:
   * https://sportsgameodds.com/docs/guides/realtime-streaming-api
   */
  enableStreaming: async () => {
    const state = get();
    
    if (state.streamingEnabled) {
      logger.info('[LiveDataStore] Streaming already enabled');
      return;
    }
    
    // Check if streaming is available (requires AllStar plan)
    if (!process.env.NEXT_PUBLIC_STREAMING_ENABLED) {
      logger.warn('[LiveDataStore] Streaming not available - requires AllStar plan');
      return;
    }
    
    set({ streamingStatus: 'connecting' });
    
    try {
      const streaming = getStreamingService();
      
      // Setup event listener for updates
      streaming.on('event:updated', (updatedEvent: unknown) => {
        // Update individual game in store when streaming pushes updates
        const evt = updatedEvent as { eventID?: string; odds?: unknown; status?: Game['status'] };
        if (!evt.eventID) return;
        
        const state = get();
        const matchIndex = state.matches.findIndex(game => game.id === evt.eventID);
        
        if (matchIndex >= 0) {
          const updatedMatches = [...state.matches];
          const currentGame = updatedMatches[matchIndex];
          const oldStatus = currentGame.status;
          const newStatus = evt.status || currentGame.status;
          
          // Update game with new data from streaming
          const updates: Partial<Game> = {};
          if (evt.odds) {
            updates.odds = {
              ...currentGame.odds,
              ...(evt.odds as Partial<Game['odds']>),
            };
          }
          if (evt.status) {
            updates.status = evt.status;
          }
          
          updatedMatches[matchIndex] = {
            ...currentGame,
            ...updates,
          };
          
          // Detect status transitions
          if (oldStatus !== newStatus) {
            logger.info(`[LiveDataStore] Status transition detected`, {
              gameId: evt.eventID,
              from: oldStatus,
              to: newStatus,
            });
            
            // Import transition store dynamically to avoid circular dependencies
            import('@/store/gameTransitionStore').then(({ useGameTransitionStore }) => {
              const { recordTransition } = useGameTransitionStore.getState();
              recordTransition(evt.eventID!, oldStatus, newStatus);
            });
          }
          
          set({ matches: updatedMatches, lastFetch: Date.now() });
          logger.debug(`[LiveDataStore] Updated game ${evt.eventID} via streaming`);
        }
      });
      
      // Connect to official streaming API
      // GLOBAL: 'events:live' stream includes ALL live games across all sports
      // The official API automatically filters to games with active odds
      // NEW: Enable props streaming for real-time player and game props updates
      await streaming.connect('events:live', { enablePropsStreaming: true });
      
      set({
        streamingEnabled: true,
        streamingStatus: 'connected',
      });
      
      logger.info('[LiveDataStore] Streaming enabled successfully for ALL live games (including props)');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[LiveDataStore] Failed to enable streaming:', error);
      
      set({
        streamingEnabled: false,
        streamingStatus: 'error',
        error: errorMessage,
      });
    }
  },
  
  /**
   * Disable WebSocket streaming
   * Falls back to REST API polling
   */
  disableStreaming: () => {
    const streaming = getStreamingService();
    streaming.disconnect();
    
    set({
      streamingEnabled: false,
      streamingStatus: 'disconnected',
    });
    
    logger.info('[LiveDataStore] Streaming disabled');
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
