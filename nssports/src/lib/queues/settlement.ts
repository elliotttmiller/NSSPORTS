/**
 * BullMQ Settlement Queue Configuration
 * ────────────────────────────────────────────────────────────────
 * Production-grade job queue for bet settlement processing
 * 
 * Features:
 * - Scheduled jobs (replaces PM2 cron)
 * - Distributed locking (prevents duplicate settlements)
 * - Job retries with exponential backoff
 * - Priority queues (settle high-value bets first)
 * - Job monitoring and metrics
 * - Horizontal scaling (multiple workers)
 */

import { Queue, QueueOptions, JobsOptions } from 'bullmq';
import { createRedisConnection } from '../redis';
import { logger } from '../logger';

// Redis connection for BullMQ
const connection = createRedisConnection();

/**
 * Queue configuration
 */
const queueConfig: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,                    // Retry up to 3 times on failure
    backoff: {
      type: 'exponential',           // Exponential backoff (1s, 2s, 4s)
      delay: 1000,
    },
    removeOnComplete: {
      age: 86400,                    // Keep completed jobs for 24 hours
      count: 1000,                   // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 604800,                   // Keep failed jobs for 7 days
      count: 500,                    // Keep last 500 failed jobs
    },
  },
};

/**
 * Settlement Queue
 * Handles bet settlement processing
 */
export const settlementQueue = new Queue('settlement', queueConfig);

/**
 * Job Types
 */
export enum SettlementJobType {
  SYNC_GAMES = 'sync-games',           // Sync finished game scores
  SETTLE_BETS = 'settle-bets',         // Settle all finished bets
  SETTLE_SINGLE_BET = 'settle-single-bet', // Settle a specific bet
}

/**
 * Job Data Interfaces
 */
export interface SyncGamesJobData {
  type: SettlementJobType.SYNC_GAMES;
  dryRun?: boolean;
}

export interface SettleBetsJobData {
  type: SettlementJobType.SETTLE_BETS;
  dryRun?: boolean;
}

export interface SettleSingleBetJobData {
  type: SettlementJobType.SETTLE_SINGLE_BET;
  betId: string;
  priority?: number;
}

export type SettlementJobData = 
  | SyncGamesJobData 
  | SettleBetsJobData 
  | SettleSingleBetJobData;

/**
 * Add sync games job to queue
 */
export async function addSyncGamesJob(
  data: Omit<SyncGamesJobData, 'type'> = {},
  options?: JobsOptions
) {
  const job = await settlementQueue.add(
    SettlementJobType.SYNC_GAMES,
    { type: SettlementJobType.SYNC_GAMES, ...data },
    {
      ...options,
      priority: 1, // High priority
    }
  );
  
  logger.info('[Queue] Added sync games job', { jobId: job.id });
  return job;
}

/**
 * Add settle bets job to queue
 */
export async function addSettleBetsJob(
  data: Omit<SettleBetsJobData, 'type'> = {},
  options?: JobsOptions
) {
  const job = await settlementQueue.add(
    SettlementJobType.SETTLE_BETS,
    { type: SettlementJobType.SETTLE_BETS, ...data },
    {
      ...options,
      priority: 2, // Medium priority
    }
  );
  
  logger.info('[Queue] Added settle bets job', { jobId: job.id });
  return job;
}

/**
 * Add single bet settlement job (priority settlement)
 */
export async function addSettleSingleBetJob(
  data: Omit<SettleSingleBetJobData, 'type'>,
  options?: JobsOptions
) {
  const job = await settlementQueue.add(
    SettlementJobType.SETTLE_SINGLE_BET,
    { type: SettlementJobType.SETTLE_SINGLE_BET, ...data },
    {
      ...options,
      priority: data.priority || 5, // Default to low priority unless specified
    }
  );
  
  logger.info('[Queue] Added single bet settlement job', { 
    jobId: job.id, 
    betId: data.betId,
    priority: data.priority 
  });
  return job;
}

/**
 * Schedule recurring settlement job
 * Runs every 5 minutes (replaces PM2 cron)
 */
export async function scheduleSettlementJobs() {
  try {
    // Remove any existing repeatable jobs
    const repeatableJobs = await settlementQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await settlementQueue.removeRepeatableByKey(job.key);
    }
    
    // Schedule sync + settle every 5 minutes
    await settlementQueue.add(
      'scheduled-settlement',
      { 
        type: SettlementJobType.SETTLE_BETS,
        scheduled: true,
      },
      {
        repeat: {
          pattern: '*/5 * * * *', // Every 5 minutes (cron expression)
        },
        jobId: 'recurring-settlement', // Unique ID prevents duplicates
      }
    );
    
    logger.info('[Queue] ✅ Scheduled recurring settlement jobs (every 5 minutes)');
  } catch (error) {
    logger.error('[Queue] Failed to schedule settlement jobs', error);
    throw error;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      settlementQueue.getWaitingCount(),
      settlementQueue.getActiveCount(),
      settlementQueue.getCompletedCount(),
      settlementQueue.getFailedCount(),
      settlementQueue.getDelayedCount(),
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error) {
    logger.error('[Queue] Failed to get queue stats', error);
    return null;
  }
}

/**
 * Pause queue (stop processing jobs)
 */
export async function pauseQueue() {
  await settlementQueue.pause();
  logger.info('[Queue] ⏸️  Queue paused');
}

/**
 * Resume queue (continue processing jobs)
 */
export async function resumeQueue() {
  await settlementQueue.resume();
  logger.info('[Queue] ▶️  Queue resumed');
}

/**
 * Drain queue (wait for all active jobs to complete)
 */
export async function drainQueue() {
  await settlementQueue.drain();
  logger.info('[Queue] 🚰 Queue drained');
}

/**
 * Clean old jobs
 */
export async function cleanQueue() {
  const completedRemoved = await settlementQueue.clean(86400000, 1000, 'completed'); // 24h old, keep 1000
  const failedRemoved = await settlementQueue.clean(604800000, 500, 'failed'); // 7 days old, keep 500
  
  logger.info('[Queue] 🧹 Cleaned old jobs', { 
    completedRemoved: completedRemoved.length, 
    failedRemoved: failedRemoved.length 
  });
}

/**
 * Graceful shutdown
 */
export async function closeQueue() {
  await settlementQueue.close();
  await connection.quit();
  logger.info('[Queue] ✅ Queue closed gracefully');
}
