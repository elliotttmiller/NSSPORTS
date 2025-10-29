/**
 * Game Transition Store
 * 
 * Handles automatic game status transitions:
 * - Upcoming → Live: Migrate to /live page and homepage "Trending Live"
 * - Live → Finished: Remove from all views (never show historical)
 * 
 * Architecture:
 * 1. Monitor game status changes via WebSocket streaming
 * 2. Detect status transition (upcoming → live)
 * 3. Emit events for UI components to react
 * 4. Automatically remove games from /games pages
 * 5. Automatically add to /live page with LiveGameRow component
 * 
 * Integration with existing stores:
 * - liveDataStore: Manages live games data + WebSocket streaming
 * - This store: Manages transitions and UI migration logic
 */

import { create } from 'zustand';
import { Game } from '@/types';
import { logger } from '@/lib/logger';

interface GameTransition {
  gameId: string;
  from: Game['status'];
  to: Game['status'];
  timestamp: number;
}

interface GameTransitionState {
  // Track recent transitions
  transitions: GameTransition[];
  
  // Games that just went live (for animation/notification)
  justWentLive: Set<string>;
  
  // Games that just finished (for cleanup)
  justFinished: Set<string>;
  
  // Actions
  recordTransition: (gameId: string, from: Game['status'], to: Game['status']) => void;
  clearJustWentLive: (gameId: string) => void;
  clearJustFinished: (gameId: string) => void;
  getRecentTransitions: (minutes?: number) => GameTransition[];
  shouldShowInUpcoming: (game: Game) => boolean;
  shouldShowInLive: (game: Game) => boolean;
  reset: () => void;
}

const initialState = {
  transitions: [] as GameTransition[],
  justWentLive: new Set<string>(),
  justFinished: new Set<string>(),
};

/**
 * Create game transition store
 */
export const useGameTransitionStore = create<GameTransitionState>((set, get) => ({
  ...initialState,

  /**
   * Record a game status transition
   * Called when WebSocket or polling detects status change
   */
  recordTransition: (gameId: string, from: Game['status'], to: Game['status']) => {
    const transition: GameTransition = {
      gameId,
      from,
      to,
      timestamp: Date.now(),
    };

    set((state) => ({
      transitions: [transition, ...state.transitions].slice(0, 100), // Keep last 100
    }));

    // Track special transitions
    if (from === 'upcoming' && to === 'live') {
      logger.info(`[GameTransition] Game ${gameId} just went LIVE!`, {
        gameId,
        from,
        to,
        timestamp: transition.timestamp,
      });
      set((state) => ({
        justWentLive: new Set([...state.justWentLive, gameId]),
      }));

      // Auto-clear after 30 seconds (animation duration)
      setTimeout(() => {
        get().clearJustWentLive(gameId);
      }, 30000);
    }

    if (to === 'finished') {
      logger.info(`[GameTransition] Game ${gameId} just FINISHED!`, {
        gameId,
        from,
        to,
        timestamp: transition.timestamp,
      });
      set((state) => ({
        justFinished: new Set([...state.justFinished, gameId]),
      }));

      // Auto-clear after 5 seconds (cleanup duration)
      setTimeout(() => {
        get().clearJustFinished(gameId);
      }, 5000);
    }
  },

  /**
   * Clear "just went live" flag for a game
   */
  clearJustWentLive: (gameId: string) => {
    set((state) => {
      const updated = new Set(state.justWentLive);
      updated.delete(gameId);
      return { justWentLive: updated };
    });
  },

  /**
   * Clear "just finished" flag for a game
   */
  clearJustFinished: (gameId: string) => {
    set((state) => {
      const updated = new Set(state.justFinished);
      updated.delete(gameId);
      return { justFinished: updated };
    });
  },

  /**
   * Get transitions from the last N minutes
   */
  getRecentTransitions: (minutes = 10) => {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return get().transitions.filter((t) => t.timestamp >= cutoff);
  },

  /**
   * Should this game show in /games (upcoming games) pages?
   * 
   * Rules:
   * - YES: status === 'upcoming'
   * - NO: status === 'live' (should be in /live instead)
   * - NO: status === 'finished' (never show historical)
   */
  shouldShowInUpcoming: (game: Game) => {
    return game.status === 'upcoming';
  },

  /**
   * Should this game show in /live page?
   * 
   * Rules:
   * - YES: status === 'live'
   * - NO: status === 'upcoming' (should be in /games instead)
   * - NO: status === 'finished' (never show historical)
   */
  shouldShowInLive: (game: Game) => {
    return game.status === 'live';
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set(initialState);
  },
}));
