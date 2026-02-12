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
 * Phase 4 Enhancement: Real-Time Updates via REST Polling (Pro Plan)
 * - Uses smart cache system with dynamic TTL (15s for live games)
 * - React Query refetchInterval for active polling (sub-minute updates)
 * - Fallback to REST polling for non-live games
 * - Automatic status transition detection (upcoming → live → finished)
 * 
 * WebSocket Streaming (All-Star Plan Only):
 * - Available with All-Star plan subscription for <1s updates
 * - Pro plan ($299/mo) uses REST polling (15s updates for live games)
 * - Both approaches provide excellent real-time experience
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Game } from '@/types';
import { StreamingService } from '@/lib/streaming-service';
import { logger } from '@/lib/logger';
import { getGamesPaginated } from '@/services/api';
import { useDebugStore } from '@/store/debugStore';

// Module-scoped logger for this store
const log = logger.createScopedLogger('LiveDataStore');

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
  // If `force` is true the fetch will bypass caches (used for manual pull-to-refresh)
  fetchAllMatches: (force?: boolean) => Promise<void>;
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
   * Fetch matches from ALL leagues (NBA, NFL, NHL) in parallel
   * Used for home/live/games pages to show all available games
   */
  fetchAllMatches: async (force = false) => {
    // Prevent duplicate fetches if already loading
    if (get().status === 'loading') {
      log.debug('Already loading, skipping duplicate fetch');
      return;
    }
    
    set({ status: 'loading', error: null });
    log.debug('Starting fetchAllMatches...');
    
    // Add debug log
    if (typeof window !== 'undefined') {
      useDebugStore.getState().addLog({
        type: 'info',
        category: 'LiveDataStore',
        message: 'Starting fetchAllMatches',
        details: { force },
      });
    }
    
    try {
      // Iterate paginated /api/games until all pages are fetched
      // Stream pages into state as they arrive to improve perceived performance
      const pageLimit = 500; // Use up to 500 per page (API allows <=500)
      let page = 1;
      let allMatches: Game[] = [];

      while (true) {
  // Request full results from the server (bypass dev sampling) so the /games listing
  // receives the complete set. In production this parameter is ignored.
  const pageResult = await getGamesPaginated(undefined, page, pageLimit, force /* bypassCache */, true /* skipDevLimit */);
        const pageMatches = Array.isArray(pageResult.data) ? pageResult.data : [];

        // Append and stream partial results
        allMatches = [...allMatches, ...pageMatches];
        set({ matches: allMatches, status: 'loading', error: null, lastFetch: Date.now() });

        log.info(`Fetched page ${page} with ${pageMatches.length} games (cumulative: ${allMatches.length})`);

        if (!pageResult.pagination.hasNextPage) break;
        page += 1;
        // Safety cap to avoid accidental infinite loops
        if (page > 50) break;
      }

      set({ matches: allMatches, status: 'success', error: null, lastFetch: Date.now() });

      const liveGamesCount = allMatches.filter((g: Game) => g.status === 'live').length;
      if (liveGamesCount > 0) {
        log.info(`Found ${liveGamesCount} live games, will enable streaming`);
      }
      
      // Add success debug log
      if (typeof window !== 'undefined') {
        useDebugStore.getState().addLog({
          type: 'info',
          category: 'LiveDataStore',
          message: `Successfully fetched ${allMatches.length} games (${liveGamesCount} live)`,
          details: { totalGames: allMatches.length, liveGames: liveGamesCount },
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      log.error('❌ Error fetching matches:', error);
      set({ matches: [], status: 'error', error: errorMessage, lastFetch: Date.now() });
      
      // Add error debug log
      if (typeof window !== 'undefined') {
        useDebugStore.getState().addLog({
          type: 'error',
          category: 'LiveDataStore',
          message: `Error fetching matches: ${errorMessage}`,
          details: { error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error },
        });
      }
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
      log.info('Streaming already enabled');
      return;
    }
    
    // ✅ OPTIMIZATION: Only connect if there are games to stream
    if (!Array.isArray(state.matches) || state.matches.length === 0) {
      log.info('No games available - skipping streaming connection');
      return;
    }
    
    // Check if streaming is available (requires AllStar plan)
    if (!process.env.NEXT_PUBLIC_STREAMING_ENABLED) {
      log.warn('Streaming not available - requires AllStar plan');
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
            log.info('Status transition detected', {
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
          log.debug(`Updated game ${evt.eventID} via streaming`);
        }
      });
      
      // Connect to official streaming API
      // CRITICAL INSIGHT: 'events:live' feed streams ALL live/in-progress games across all sports
      // For upcoming games odds (line movements before kickoff), use 'events:upcoming' per league
      // The official API provides real-time WebSocket updates for BOTH live AND upcoming game odds
      // Live games: <1s latency for in-game odds changes
      // Upcoming games: Real-time line movements, odds adjustments as betting markets move
      await streaming.connect('events:live', { enablePropsStreaming: true });
      
      set({
        streamingEnabled: true,
        streamingStatus: 'connected',
      });
      
      log.info('Streaming enabled for live games (real-time odds + props, <1s latency)');
      log.info('Note: For upcoming games odds streaming, use events:upcoming per league');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to enable streaming:', error);
      
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
    
    log.info('Streaming disabled');
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
 * Select fetchAllMatches function
 */
export const selectFetchAllMatches = (state: LiveDataState) => state.fetchAllMatches;

/**
 * Select all matches (alias for selectAllMatches)
 */
export const selectMatches = (state: LiveDataState) => state.matches;
