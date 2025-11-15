#!/usr/bin/env tsx
/**
 * Settlement Worker Process
 * ────────────────────────────────────────────────────────────────
 * BullMQ worker that processes settlement jobs from the queue
 * Replaces PM2 settlement scheduler
 * 
 * Features:
 * - Processes jobs from Redis queue
 * - Can run multiple instances (horizontal scaling)
 * - Automatic retries on failure
 * - Distributed locking (no duplicate settlements)
 * - Graceful shutdown
 * 
 * Usage:
 *   node --import tsx/esm src/workers/settlement-worker.ts
 *   
 * Or with multiple workers:
 *   node --import tsx/esm src/workers/settlement-worker.ts &
 *   node --import tsx/esm src/workers/settlement-worker.ts &
 *   node --import tsx/esm src/workers/settlement-worker.ts &
 */

import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../lib/redis';
import { logger } from '../lib/logger';
import {
  SettlementJobType,
  type SettlementJobData,
  type SettleBetsJobData,
  type SettleSingleBetJobData,
} from '../lib/queues/settlement';
import { syncFinishedGames } from '../scripts/sync-game-status';
import { settleAllFinishedGames, settleBet } from '../services/bet-settlement';

// Worker configuration
const WORKER_CONCURRENCY = parseInt(process.env.SETTLEMENT_WORKER_CONCURRENCY || '1');
const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;

/**
 * Process settlement jobs
 */
async function processSettlementJob(job: Job<SettlementJobData>) {
  logger.info(`[Worker ${WORKER_ID}] Processing job`, {
    jobId: job.id,
    type: job.data.type,
    attempt: job.attemptsMade + 1,
  });

  try {
    switch (job.data.type) {
      case SettlementJobType.SYNC_GAMES: {
        logger.info(`[Worker ${WORKER_ID}] Syncing finished games...`);
        
        const syncedCount = await syncFinishedGames();
        
        logger.info(`[Worker ${WORKER_ID}] ✅ Synced ${syncedCount} games`);
        return { syncedCount };
      }

      case SettlementJobType.SETTLE_BETS: {
        const _data = job.data as SettleBetsJobData;
        logger.info(`[Worker ${WORKER_ID}] Settling bets...`);
        
        // First sync games to ensure we have latest scores
        // (only syncs games that aren't already marked as finished)
        const syncedCount = await syncFinishedGames();
        logger.info(`[Worker ${WORKER_ID}] Synced ${syncedCount} games`);
        
        // Then settle all finished bets
        const result = await settleAllFinishedGames();
        
        logger.info(`[Worker ${WORKER_ID}] ✅ Settled ${result.betsSettled} bets`);
        return { syncedCount, settledCount: result.betsSettled };
      }

      case SettlementJobType.SETTLE_SINGLE_BET: {
        const data = job.data as SettleSingleBetJobData;
        logger.info(`[Worker ${WORKER_ID}] Settling single bet: ${data.betId}`);
        
        const result = await settleBet(data.betId);
        
        if (result) {
          logger.info(`[Worker ${WORKER_ID}] ✅ Settled bet ${data.betId}`, { 
            status: result.status 
          });
          return { betId: data.betId, status: result.status };
        } else {
          logger.warn(`[Worker ${WORKER_ID}] ⏭️  Skipped bet ${data.betId} (not ready)`);
          return { betId: data.betId, skipped: true };
        }
      }

      default:
        throw new Error(`Unknown job type: ${(job.data as { type: string }).type}`);
    }
  } catch (error) {
    logger.error(`[Worker ${WORKER_ID}] ❌ Job failed`, {
      jobId: job.id,
      error: error instanceof Error ? error.message : error,
    });
    throw error; // Re-throw to trigger retry
  }
}

/**
 * Start settlement worker
 */
async function startWorker() {
  logger.info(`[Worker ${WORKER_ID}] Starting settlement worker...`, {
    concurrency: WORKER_CONCURRENCY,
    pid: process.pid,
  });

  const connection = createRedisConnection();

  const worker = new Worker('settlement', processSettlementJob, {
    connection,
    concurrency: WORKER_CONCURRENCY,
    
    // Worker options
    limiter: {
      max: 10,        // Max 10 jobs per interval
      duration: 1000, // 1 second interval
    },
    
    // Auto-run jobs that have been waiting
    autorun: true,
  });

  // Event handlers
  worker.on('ready', () => {
    logger.info(`[Worker ${WORKER_ID}] ✅ Worker ready and waiting for jobs`);
  });

  worker.on('active', (job) => {
    logger.info(`[Worker ${WORKER_ID}] 🔄 Processing job ${job.id}`, {
      type: job.data.type,
    });
  });

  worker.on('completed', (job, result) => {
    logger.info(`[Worker ${WORKER_ID}] ✅ Job completed: ${job.id}`, {
      type: job.data.type,
      result,
      duration: Date.now() - job.timestamp,
    });
  });

  worker.on('failed', (job, error) => {
    logger.error(`[Worker ${WORKER_ID}] ❌ Job failed: ${job?.id}`, {
      type: job?.data.type,
      error: error.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (error) => {
    logger.error(`[Worker ${WORKER_ID}] Worker error:`, error);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`[Worker ${WORKER_ID}] Received ${signal}, shutting down gracefully...`);
    
    await worker.close();
    await connection.quit();
    
    logger.info(`[Worker ${WORKER_ID}] ✅ Worker shut down gracefully`);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Keep process alive
  logger.info(`[Worker ${WORKER_ID}] 🚀 Settlement worker running`);
}

// Start the worker
startWorker().catch((error) => {
  logger.error('Failed to start settlement worker:', error);
  process.exit(1);
});
