/**
 * Universal Bet Settlement Scheduler
 * 
 * Platform-agnostic background scheduler that runs settlement every 5 minutes.
 * Works with any hosting environment (local, VPS, cloud, Docker, etc.)
 * 
 * Usage:
 *   npm run settlement:scheduler        # Start the scheduler
 *   npm run settlement:scheduler:once   # Run settlement once and exit
 * 
 * This should be run as a long-running background process:
 * - Local development: npm run settlement:scheduler
 * - Production: Use PM2, systemd, Docker, or process manager
 * - Docker: Add to docker-compose.yml as separate service
 * - Cloud: Run as background worker/job
 */

import { syncFinishedGames } from './sync-game-status';
import { settleAllFinishedGames } from '@/services/bet-settlement';
import { logger } from '@/lib/logger';

const SETTLEMENT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Run a single settlement cycle
 */
async function runSettlementCycle(): Promise<void> {
  if (isRunning) {
    logger.warn('[SettlementScheduler] Previous cycle still running, skipping this iteration');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    logger.info('[SettlementScheduler] ========================================');
    logger.info('[SettlementScheduler] Starting settlement cycle');
    logger.info('[SettlementScheduler] ========================================');

    // STEP 1: Sync game status from SDK
    logger.info('[SettlementScheduler] Step 1: Syncing game status from SDK...');
    const syncResult = await syncFinishedGames();
    
    logger.info('[SettlementScheduler] Sync complete', {
      gamesChecked: syncResult.gamesChecked,
      gamesUpdated: syncResult.gamesUpdated,
      betsSettled: syncResult.betsSettled,
      errors: syncResult.errors.length
    });

    if (syncResult.errors.length > 0) {
      logger.warn('[SettlementScheduler] Sync errors encountered', {
        errorCount: syncResult.errors.length,
        errors: syncResult.errors
      });
    }

    // STEP 2: Run settlement for any remaining games (safety net)
    logger.info('[SettlementScheduler] Step 2: Running settlement for all finished games...');
    const settlementResult = await settleAllFinishedGames();
    
    logger.info('[SettlementScheduler] Settlement complete', {
      gamesProcessed: settlementResult.gamesProcessed,
      betsSettled: settlementResult.betsSettled
    });

    const duration = Date.now() - startTime;
    const totalBetsSettled = syncResult.betsSettled + settlementResult.betsSettled;

    logger.info('[SettlementScheduler] ========================================');
    logger.info('[SettlementScheduler] Cycle complete', {
      duration: `${duration}ms`,
      totalGamesUpdated: syncResult.gamesUpdated,
      totalBetsSettled,
      wonBets: settlementResult.results.filter(r => r.status === 'won').length,
      lostBets: settlementResult.results.filter(r => r.status === 'lost').length,
      pushBets: settlementResult.results.filter(r => r.status === 'push').length
    });
    logger.info('[SettlementScheduler] ========================================');

  } catch (error) {
    logger.error('[SettlementScheduler] Error during settlement cycle:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the settlement scheduler
 */
export function startScheduler(): void {
  if (intervalId) {
    logger.warn('[SettlementScheduler] Scheduler already running');
    return;
  }

  logger.info('[SettlementScheduler] Starting settlement scheduler');
  logger.info('[SettlementScheduler] Interval: 5 minutes');
  logger.info('[SettlementScheduler] ========================================');

  // Run immediately on start
  runSettlementCycle();

  // Then run every 5 minutes
  intervalId = setInterval(() => {
    runSettlementCycle();
  }, SETTLEMENT_INTERVAL_MS);

  logger.info('[SettlementScheduler] Scheduler started successfully');
}

/**
 * Stop the settlement scheduler
 */
export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('[SettlementScheduler] Scheduler stopped');
  }
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    logger.info(`[SettlementScheduler] Received ${signal}, shutting down gracefully...`);
    stopScheduler();
    
    // Wait for current cycle to finish if running
    const checkInterval = setInterval(() => {
      if (!isRunning) {
        clearInterval(checkInterval);
        logger.info('[SettlementScheduler] Shutdown complete');
        process.exit(0);
      }
    }, 100);
    
    // Force exit after 30 seconds
    setTimeout(() => {
      logger.warn('[SettlementScheduler] Force exit after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// CLI execution
if (require.main === module || import.meta.url === `file://${process.argv[1]}`) {
  const runOnce = process.argv.includes('--once');

  if (runOnce) {
    logger.info('[SettlementScheduler] Running settlement once and exiting...');
    runSettlementCycle()
      .then(() => {
        logger.info('[SettlementScheduler] Settlement complete, exiting');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('[SettlementScheduler] Settlement failed:', error);
        process.exit(1);
      });
  } else {
    setupGracefulShutdown();
    startScheduler();
  }
}
