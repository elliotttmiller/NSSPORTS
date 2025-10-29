/**
 * useGameTransitions Hook
 * 
 * Monitors game status changes and triggers automatic UI migrations:
 * - Upcoming → Live: Remove from /games, add to /live
 * - Live → Finished: Remove from all pages
 * 
 * Usage in components:
 * ```tsx
 * const { transitioningGames } = useGameTransitions(games);
 * 
 * // Filter out games that just transitioned to live
 * const upcomingGames = games.filter(g => !transitioningGames.has(g.id) && g.status === 'upcoming');
 * ```
 */

import { useEffect, useRef } from 'react';
import { Game } from '@/types';
import { useGameTransitionStore } from '@/store/gameTransitionStore';
import { logger } from '@/lib/logger';

interface UseGameTransitionsResult {
  // Games currently transitioning (for animations)
  transitioningGames: Set<string>;
  
  // Games that just went live (for notifications)
  justWentLive: Set<string>;
  
  // Games that just finished (for cleanup)
  justFinished: Set<string>;
  
  // Helper functions
  isTransitioning: (gameId: string) => boolean;
  shouldShowInCurrentContext: (game: Game, context: 'upcoming' | 'live') => boolean;
}

/**
 * Monitor games for status transitions
 * 
 * @param games - Array of games to monitor
 * @param context - Current page context ('upcoming' for /games pages, 'live' for /live page)
 */
export function useGameTransitions(
  games: Game[],
  context: 'upcoming' | 'live' = 'upcoming'
): UseGameTransitionsResult {
  const previousStatusRef = useRef<Map<string, Game['status']>>(new Map());
  const recordTransition = useGameTransitionStore((state) => state.recordTransition);
  const justWentLive = useGameTransitionStore((state) => state.justWentLive);
  const justFinished = useGameTransitionStore((state) => state.justFinished);

  // Monitor status changes
  useEffect(() => {
    const previousStatus = previousStatusRef.current;

    games.forEach((game) => {
      const oldStatus = previousStatus.get(game.id);
      const newStatus = game.status;

      // Detect status change
      if (oldStatus && oldStatus !== newStatus) {
        logger.info(`[useGameTransitions] Status change detected`, {
          gameId: game.id,
          gameTitle: `${game.awayTeam} @ ${game.homeTeam}`,
          from: oldStatus,
          to: newStatus,
          context,
        });

        // Record transition in store
        recordTransition(game.id, oldStatus, newStatus);

        // Log specific transition types
        if (oldStatus === 'upcoming' && newStatus === 'live') {
          logger.info(`[useGameTransitions] 🔴 GAME WENT LIVE: ${game.awayTeam} @ ${game.homeTeam}`);
        } else if (newStatus === 'finished') {
          logger.info(`[useGameTransitions] ✅ GAME FINISHED: ${game.awayTeam} @ ${game.homeTeam}`);
        }
      }

      // Update tracking
      previousStatus.set(game.id, newStatus);
    });

    // Cleanup removed games
    const currentGameIds = new Set(games.map((g) => g.id));
    Array.from(previousStatus.keys()).forEach((gameId) => {
      if (!currentGameIds.has(gameId)) {
        previousStatus.delete(gameId);
      }
    });
  }, [games, recordTransition, context]);

  // Combine transitioning games
  const transitioningGames = new Set([...justWentLive, ...justFinished]);

  return {
    transitioningGames,
    justWentLive,
    justFinished,
    
    isTransitioning: (gameId: string) => transitioningGames.has(gameId),
    
    /**
     * Should this game show in the current context?
     * 
     * Upcoming context (/games pages):
     * - Show: status === 'upcoming' AND NOT transitioning to live
     * - Hide: status === 'live' OR status === 'finished'
     * 
     * Live context (/live page):
     * - Show: status === 'live' AND NOT transitioning to finished
     * - Hide: status === 'upcoming' OR status === 'finished'
     */
    shouldShowInCurrentContext: (game: Game, contextType: 'upcoming' | 'live') => {
      if (contextType === 'upcoming') {
        // Hide if transitioning to live (will appear on /live page)
        if (justWentLive.has(game.id)) return false;
        
        // Hide if already live or finished
        if (game.status === 'live' || game.status === 'finished') return false;
        
        return game.status === 'upcoming';
      } else {
        // Hide if transitioning to finished
        if (justFinished.has(game.id)) return false;
        
        // Hide if not live
        if (game.status !== 'live') return false;
        
        return true;
      }
    },
  };
}
