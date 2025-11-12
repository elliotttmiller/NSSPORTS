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

export interface SyncResult {
  gamesChecked: number;
  gamesUpdated: number;
  betsSettled: number;
  errors: string[];
}

/**
 * Sync finished games from SDK to database and trigger bet settlement
 */
export async function syncFinishedGames(): Promise<SyncResult> {
  const result: SyncResult = {
    gamesChecked: 0,
    gamesUpdated: 0,
    betsSettled: 0,
    errors: []
  };

  try {
    logger.info('[syncFinishedGames] Starting game status sync...');

    // Fetch games from last 12 hours (catches games that just finished)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const now = new Date();

    logger.info('[syncFinishedGames] Fetching games from SDK', {
      startsAfter: twelveHoursAgo.toISOString(),
      startsBefore: now.toISOString()
    });

    // Fetch from SDK - get ALL games (finalized and not finalized) to check status
    const response = await getEvents({
      startsAfter: twelveHoursAgo.toISOString(),
      startsBefore: now.toISOString(),
      limit: 200 // Check up to 200 recent games
    });

    logger.info(`[syncFinishedGames] Received ${response.data.length} games from SDK`);
    result.gamesChecked = response.data.length;

    for (const event of response.data) {
      try {
        // Check if game is finished in SDK
        if (!event.status?.completed) {
          continue; // Skip games that aren't finished yet
        }

        // Check if we have this game in database (match by game.id = event.eventID)
        const dbGame = await prisma.game.findUnique({
          where: { 
            id: event.eventID 
          }
        });

        if (!dbGame) {
          logger.warn(`[syncFinishedGames] Game ${event.eventID} not found in database - skipping`);
          continue;
        }

        // If game is already marked as finished in DB, skip it
        if (dbGame.status === 'finished') {
          continue;
        }

        // Extract final scores
        const homeScore = event.teams?.home?.score;
        const awayScore = event.teams?.away?.score;

        if (homeScore === undefined || awayScore === undefined) {
          logger.warn(`[syncFinishedGames] Game ${event.eventID} missing final scores`, {
            homeScore,
            awayScore
          });
          result.errors.push(`Game ${event.eventID}: Missing scores`);
          continue;
        }

        // Update game status in database
        logger.info(`[syncFinishedGames] Marking game ${dbGame.id} (${event.eventID}) as finished`, {
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
        logger.info(`[syncFinishedGames] Settling bets for game ${dbGame.id}`);
        const settlementResults = await settleGameBets(dbGame.id);
        result.betsSettled += settlementResults.length;

        logger.info(`[syncFinishedGames] Settled ${settlementResults.length} bets for game ${dbGame.id}`, {
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

    logger.info('[syncFinishedGames] Sync complete', {
      checked: result.gamesChecked,
      updated: result.gamesUpdated,
      betsSettled: result.betsSettled,
      errors: result.errors.length
    });

    return result;

  } catch (error) {
    logger.error('[syncFinishedGames] Fatal error during sync:', error);
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

// Allow running as standalone script for testing
if (require.main === module || import.meta.url === `file://${process.argv[1]}`) {
  syncFinishedGames()
    .then((result) => {
      console.log('\n✅ Sync completed successfully!');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Sync failed:', error);
      process.exit(1);
    });
}
