#!/usr/bin/env tsx
/**
 * Start Settlement System
 * ────────────────────────────────────────────────────────────────
 * All-in-one script to start the complete automated bet settlement system
 * 
 * This script:
 * 1. Initializes the settlement queue and schedules recurring jobs
 * 2. Starts the BullMQ worker to process settlement jobs
 * 3. Keeps the process running and handles graceful shutdown
 * 
 * Usage:
 *   npm run settlement:start
 *   # Or directly:
 *   tsx scripts/start-settlement-system.ts
 * 
 * Environment Variables:
 *   SETTLEMENT_WORKER_CONCURRENCY - Number of concurrent jobs (default: 1)
 *   NODE_ENV - Environment (development/production)
 */

import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../src/lib/redis';
import { logger } from '../src/lib/logger';
import {
  scheduleSettlementJobs,
  getQueueStats,
  SettlementJobType,
  type SettlementJobData,
  type SettleBetsJobData,
  type SettleSingleBetJobData,
} from '../src/lib/queues/settlement';
import { syncFinishedGames } from '../src/scripts/sync-game-status';
import { settleAllFinishedGames, settleBet } from '../src/services/bet-settlement';

// Worker configuration
const WORKER_CONCURRENCY = parseInt(process.env.SETTLEMENT_WORKER_CONCURRENCY || '1');
const WORKER_ID = `settlement-system-${process.pid}`;

/**
 * Process settlement jobs
 */
async function processSettlementJob(job: Job<SettlementJobData>) {
  logger.info(`[${WORKER_ID}] Processing job`, {
    jobId: job.id,
    type: job.data.type,
    attempt: job.attemptsMade + 1,
  });

  try {
    switch (job.data.type) {
      case SettlementJobType.SYNC_GAMES: {
        logger.info(`[${WORKER_ID}] Syncing finished games...`);
        
        const syncResult = await syncFinishedGames();
        
        logger.info(`[${WORKER_ID}] ✅ Synced ${syncResult.gamesUpdated} games`);
        return syncResult;
      }

      case SettlementJobType.SETTLE_BETS: {
        const _data = job.data as SettleBetsJobData;
        logger.info(`[${WORKER_ID}] Settling bets...`);
        
        // First sync games to ensure we have latest scores
        const syncResult = await syncFinishedGames();
        logger.info(`[${WORKER_ID}] Synced ${syncResult.gamesUpdated} games`);
        
        // Then settle all finished bets
        const result = await settleAllFinishedGames();
        
        logger.info(`[${WORKER_ID}] ✅ Settled ${result.betsSettled} bets`);
        return { syncResult, settledCount: result.betsSettled };
      }

      case SettlementJobType.SETTLE_SINGLE_BET: {
        const data = job.data as SettleSingleBetJobData;
        logger.info(`[${WORKER_ID}] Settling single bet: ${data.betId}`);
        
        const result = await settleBet(data.betId);
        
        if (result) {
          logger.info(`[${WORKER_ID}] ✅ Settled bet ${data.betId}`, { 
            status: result.status 
          });
          return { betId: data.betId, status: result.status };
        } else {
          logger.warn(`[${WORKER_ID}] ⏭️  Skipped bet ${data.betId} (not ready)`);
          return { betId: data.betId, skipped: true };
        }
      }

      default:
        throw new Error(`Unknown job type: ${(job.data as { type: string }).type}`);
    }
  } catch (error) {
    logger.error(`[${WORKER_ID}] ❌ Job failed`, {
      jobId: job.id,
      error: error instanceof Error ? error.message : error,
    });
    throw error; // Re-throw to trigger retry
  }
}

/**
 * Initialize and start the settlement system
 */
async function startSettlementSystem() {
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('  NSSPORTS Automated Bet Settlement System');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('');

  // STEP 1: Initialize queue and schedule recurring jobs
  logger.info('⏰ Step 1: Scheduling recurring settlement jobs...');
  try {
    await scheduleSettlementJobs();
    logger.info('✅ Settlement jobs scheduled (every 5 minutes)');
  } catch (error) {
    logger.error('❌ Failed to schedule settlement jobs:', error);
    process.exit(1);
  }

  // Show queue stats
  logger.info('');
  logger.info('📊 Queue Statistics:');
  const stats = await getQueueStats();
  if (stats) {
    logger.info(`  • Waiting: ${stats.waiting}`);
    logger.info(`  • Active: ${stats.active}`);
    logger.info(`  • Completed: ${stats.completed}`);
    logger.info(`  • Failed: ${stats.failed}`);
    logger.info(`  • Delayed: ${stats.delayed}`);
  }

  // STEP 2: Start the worker
  logger.info('');
  logger.info(`🔄 Step 2: Starting settlement worker...`);
  logger.info(`   Worker ID: ${WORKER_ID}`);
  logger.info(`   Concurrency: ${WORKER_CONCURRENCY}`);
  logger.info(`   PID: ${process.pid}`);

  const connection = createRedisConnection();

  const worker = new Worker('settlement', processSettlementJob, {
    connection,
    concurrency: WORKER_CONCURRENCY,
    
    // Rate limiting
    limiter: {
      max: 10,        // Max 10 jobs per interval
      duration: 1000, // 1 second interval
    },
    
    autorun: true,
  });

  // Event handlers
  worker.on('ready', () => {
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('✅ Settlement system started successfully!');
    logger.info('');
    logger.info('📡 Status:');
    logger.info('  • Queue: Scheduled (every 5 minutes)');
    logger.info('  • Worker: Active and processing jobs');
    logger.info('  • System: Ready for automated bet settlement');
    logger.info('');
    logger.info('Press Ctrl+C to stop gracefully');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });

  worker.on('active', (job) => {
    logger.info(`[${WORKER_ID}] 🔄 Processing job ${job.id}`, {
      type: job.data.type,
    });
  });

  worker.on('completed', (job, result) => {
    logger.info(`[${WORKER_ID}] ✅ Job completed: ${job.id}`, {
      type: job.data.type,
      result,
      duration: Date.now() - job.timestamp,
    });
  });

  worker.on('failed', (job, error) => {
    logger.error(`[${WORKER_ID}] ❌ Job failed: ${job?.id}`, {
      type: job?.data.type,
      error: error.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (error) => {
    logger.error(`[${WORKER_ID}] Worker error:`, error);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info('');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`Received ${signal}, shutting down gracefully...`);
    
    try {
      logger.info('⏸️  Closing worker...');
      await worker.close();
      
      logger.info('🔌 Closing Redis connection...');
      await connection.quit();
      
      logger.info('✅ Settlement system shut down successfully');
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Keep process alive
  logger.info('🚀 Settlement system is now running...');
}

// Start the system
startSettlementSystem().catch((error) => {
  logger.error('Failed to start settlement system:', error);
  process.exit(1);
});
