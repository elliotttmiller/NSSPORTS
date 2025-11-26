/**
 * Game Status Synchronization Script
 * 
 * Monitors SDK for finished games and updates database accordingly.
 * This is the CRITICAL missing piece for automated bet settlement.
 * 
 * How it works:
 * 1. Fetches recent games from SDK (last 12 hours)
 * 2. Checks which games are marked as completed in SDK
 * 3. Updates database game status to 'finished' with final scores
 * 4. Immediately triggers bet settlement for newly finished games
 * 
 * Usage:
 * - Called by cron job (/api/cron/settle-bets) every 5 minutes
 * - Can be called manually for testing: `npx tsx src/scripts/sync-game-status.ts`
 */

import { getEvents } from '@/lib/sportsgameodds-sdk';
import { prisma } from '@/lib/prisma';
import { settleGameBets } from '@/services/bet-settlement';
import { logger } from '@/lib/logger';
const log = logger.createScopedLogger('SyncGameStatus');

export interface SyncResult {
  gamesChecked: number;
  gamesUpdated: number;
  stuckGamesFixed: number;
  betsSettled: number;
  errors: string[];
}

/**
 * Cleanup "stuck" live games that should be marked as finished
 * 
 * This handles games that:
 * - Are marked as "live" in database
 * - Started more than 4 hours ago
 * - Should be finished but weren't caught by SDK sync
 * 
 * This is a fallback mechanism to prevent games from staying "live" indefinitely
 */
async function cleanupStuckLiveGames(): Promise<{ updated: number; errors: string[] }> {
  const result = { updated: 0, errors: [] as string[] };
  
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    
    // Find games that are still "live" but started more than 4 hours ago
    const stuckGames = await prisma.game.findMany({
      where: {
        status: 'live',
        startTime: {
          lt: fourHoursAgo
        }
      }
    });
    
  log.info(`[cleanupStuckLiveGames] Found ${stuckGames.length} stuck live games`);
    
    for (const game of stuckGames) {
      try {
        // Only mark as finished if we have scores
        // If no scores, we'll try to get them from SDK next time
        if (game.homeScore !== null && game.awayScore !== null) {
          log.debug(`[cleanupStuckLiveGames] Marking stuck game ${game.id} as finished`, {
            gameId: game.id,
            startTime: game.startTime,
            homeScore: game.homeScore,
            awayScore: game.awayScore
          });
          
          await prisma.game.update({
            where: { id: game.id },
            data: {
              status: 'finished',
              finishedAt: new Date()
            }
          });
          
          result.updated++;
          
          // Settle bets for this game
          const settlementResults = await settleGameBets(game.id);
          log.debug(`[cleanupStuckLiveGames] Settled ${settlementResults.length} bets for game ${game.id}`);
        } else {
          log.warn(`[cleanupStuckLiveGames] Stuck game ${game.id} has no scores, skipping`, {
            gameId: game.id,
            startTime: game.startTime
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
  log.error(`[cleanupStuckLiveGames] Error processing game ${game.id}:`, error);
        result.errors.push(`Game ${game.id}: ${errorMsg}`);
      }
    }
    
    log.info(`[cleanupStuckLiveGames] Cleanup complete`, {
      updated: result.updated,
      errors: result.errors.length
    });
    
  } catch (error) {
  log.error('[cleanupStuckLiveGames] Fatal error:', error);
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return result;
}

/**
 * Sync finished games from SDK to database and trigger bet settlement
 */
export async function syncFinishedGames(): Promise<SyncResult> {
  const result: SyncResult = {
    gamesChecked: 0,
    gamesUpdated: 0,
    stuckGamesFixed: 0,
    betsSettled: 0,
    errors: []
  };

  try {
  log.info('[syncFinishedGames] Starting game status sync...');

    // Fetch games from last 12 hours (catches games that just finished)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const now = new Date();

    log.debug('[syncFinishedGames] Fetching games from SDK', {
      startsAfter: twelveHoursAgo.toISOString(),
      startsBefore: now.toISOString()
    });

    // Fetch from SDK - get ALL games (finalized and not finalized) to check status
    const response = await getEvents({
      startsAfter: twelveHoursAgo.toISOString(),
      startsBefore: now.toISOString(),
      limit: 200 // Check up to 200 recent games
    });

  log.debug(`[syncFinishedGames] Received ${response.data.length} games from SDK`);
    result.gamesChecked = response.data.length;

    for (const event of response.data) {
      try {
        // Check if game is finished in SDK
        // The SDK has multiple completion flags: completed, finalized, ended
        // We check for any of these to ensure we catch finished games
        const isFinished = event.status?.completed === true || 
                          event.status?.finalized === true ||
                          event.status?.ended === true;
        
        if (!isFinished) {
          continue; // Skip games that aren't finished yet
        }

        // Check if we have this game in database (match by game.id = event.eventID)
        const dbGame = await prisma.game.findUnique({
          where: { 
            id: event.eventID 
          }
        });

        if (!dbGame) {
          log.warn(`[syncFinishedGames] Game ${event.eventID} not found in database - skipping`);
          continue;
        }

        // If game is already marked as finished with scores, skip it
        // But if scores are missing (null), we need to update them
        if (dbGame.status === 'finished' && dbGame.homeScore != null && dbGame.awayScore != null) {
          continue;
        }

        // Extract final scores - use results.game (same structure as transformer)
        const homeScore = event.results?.game?.home?.points;
        const awayScore = event.results?.game?.away?.points;

        // Note: Allow 0 scores, but skip if scores are null/undefined
        if (homeScore == null || awayScore == null) {
          log.warn(`[syncFinishedGames] Game ${event.eventID} missing final scores`, {
            homeScore,
            awayScore,
            hasResults: !!event.results,
            hasGame: !!event.results?.game
          });
          result.errors.push(`Game ${event.eventID}: Missing scores`);
          continue;
        }

        // Update game status in database
        log.debug(`[syncFinishedGames] Marking game ${dbGame.id} (${event.eventID}) as finished`, {
          homeScore,
          awayScore
        });

        await prisma.game.update({
          where: { id: dbGame.id },
          data: {
            status: 'finished',
            homeScore,
            awayScore
          }
        });

        result.gamesUpdated++;

        // Immediately settle all bets for this game
  log.debug(`[syncFinishedGames] Settling bets for game ${dbGame.id}`);
        const settlementResults = await settleGameBets(dbGame.id);
        result.betsSettled += settlementResults.length;

        log.debug(`[syncFinishedGames] Settled ${settlementResults.length} bets for game ${dbGame.id}`, {
          gameId: dbGame.id,
          eventID: event.eventID,
          settled: settlementResults.length
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`[syncFinishedGames] Error processing game ${event.eventID}:`, error);
        result.errors.push(`Game ${event.eventID}: ${errorMsg}`);
      }
    }

    log.info('[syncFinishedGames] Sync complete', {
      checked: result.gamesChecked,
      updated: result.gamesUpdated,
      betsSettled: result.betsSettled,
      errors: result.errors.length
    });

    // STEP 2: Cleanup "stuck" live games (fallback mechanism)
  log.debug('[syncFinishedGames] Checking for stuck live games...');
    const cleanupResult = await cleanupStuckLiveGames();
    result.stuckGamesFixed = cleanupResult.updated;
    result.errors.push(...cleanupResult.errors);
    
    log.info('[syncFinishedGames] All sync operations complete', {
      sdkGamesChecked: result.gamesChecked,
      sdkGamesUpdated: result.gamesUpdated,
      stuckGamesFixed: result.stuckGamesFixed,
      totalBetsSettled: result.betsSettled,
      totalErrors: result.errors.length
    });

    return result;

  } catch (error) {
  log.error('[syncFinishedGames] Fatal error during sync:', error);
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

// Allow running as standalone script for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  syncFinishedGames()
    .then((result) => {
      log.info('✅ Sync completed successfully!');
      log.debug(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      log.error('❌ Sync failed:', error);
      process.exit(1);
    });
}
