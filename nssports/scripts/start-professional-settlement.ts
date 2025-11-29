#!/usr/bin/env tsx
/**
 * Professional BullMQ Settlement System - Startup Script
 * ────────────────────────────────────────────────────────────────
 * Production-ready automated bet settlement system
 * 
 * This script starts the complete settlement system:
 * 1. Initializes the BullMQ queue with recurring jobs
 * 2. Starts worker process(es) to handle settlement jobs
 * 3. Provides graceful shutdown handling
 * 4. Includes health monitoring and metrics
 * 
 * Usage:
 *   npm run settlement:start
 *   
 * Environment Variables:
 *   SETTLEMENT_WORKER_CONCURRENCY - Number of concurrent jobs (default: 1)
 *   NODE_ENV - Environment (development/production)
 *   REDIS_HOST, REDIS_PORT, REDIS_PASSWORD - Redis connection
 */

// Load environment variables from .env.local (takes precedence) and .env
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env first
config({ path: resolve(process.cwd(), '.env') });
// Then load .env.local (overrides .env)
config({ path: resolve(process.cwd(), '.env.local') });

// Log loaded Redis config to verify
logger.info('[ENV] Redis Configuration Loaded', {
  REDIS_HOST: process.env.REDIS_HOST || 'NOT SET',
  REDIS_PORT: process.env.REDIS_PORT || 'NOT SET',
  REDIS_TLS: process.env.REDIS_TLS || 'NOT SET',
});
logger.info('');

import { getSettlementQueue, initializeSettlementQueue, startSettlementWorker } from '../src/services/settlement-queue.service';
import { logger } from '../src/lib/logger';
import { healthCheck } from '../src/lib/redis';

const WORKER_CONCURRENCY = parseInt(process.env.SETTLEMENT_WORKER_CONCURRENCY || '1');
const STATS_INTERVAL = 60000; // Print stats every 60 seconds

/**
 * Print system banner
 */
function printBanner() {
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('  ⚡ NSSPORTS Professional Settlement System');
  logger.info('  Powered by BullMQ + Redis');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('');
}

/**
 * Print queue statistics
 */
async function printStats() {
  try {
    const queue = getSettlementQueue();
    const stats = await queue.getStats();
    const repeatableJobs = await queue.getRepeatableJobs();

    logger.info('📊 Queue Statistics', {
      waiting: stats.waiting,
      active: stats.active,
      completed: stats.completed,
      failed: stats.failed,
      delayed: stats.delayed,
      paused: stats.paused,
      recurring: repeatableJobs.length,
    });

    // Print recurring jobs
    if (repeatableJobs.length > 0) {
      logger.info('⏰ Recurring Jobs', {
        jobs: repeatableJobs.map(j => ({
          name: j.name,
          pattern: j.pattern,
          next: j.next ? new Date(j.next).toISOString() : null,
        })),
      });
    }

    // Alert if there are failed jobs
    if (stats.failed > 10) {
      logger.warn('⚠️  High number of failed jobs detected', {
        failed: stats.failed,
      });
    }
  } catch (error) {
    logger.error('Failed to fetch queue stats', error);
  }
}

/**
 * Main startup function
 */
async function main() {
  printBanner();

  logger.info('🚀 Starting settlement system...');
  logger.info('Configuration', {
    workerConcurrency: WORKER_CONCURRENCY,
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid,
  });

  try {
    // Pre-check: verify Redis connectivity before initializing queues
    logger.info('');
    logger.info('🔎 Verifying Redis connectivity...');
    try {
      const redisHealthy = await healthCheck();
      if (!redisHealthy) {
        logger.error('❌ Redis health check failed. Aborting settlement startup. Check REDIS_HOST/PORT/PASSWORD/TLS and network connectivity.');
        process.exit(1);
      }
      logger.info('✅ Redis health check passed');
    } catch (err) {
      logger.error('❌ Error while performing Redis health check. Aborting.', err);
      process.exit(1);
    }

    // Step 1: Initialize queue and schedule recurring jobs
    logger.info('');
    logger.info('📦 Step 1: Initializing settlement queue...');
    await initializeSettlementQueue();
    logger.info('✅ Queue initialized successfully');

      // Step 1b: Immediately run syncFinishedGames for real-time startup sync
      logger.info('⚡ Running immediate sync of finished games at startup...');
      try {
        const { syncFinishedGames } = await import('../src/scripts/sync-game-status');
        const syncResult = await syncFinishedGames();
    logger.info('[Startup Sync] Finished games sync result', { syncResult });
      } catch (err) {
        logger.error('[Startup Sync] Error running immediate syncFinishedGames:', err);
      }

    // Step 2: Start worker process
    logger.info('');
    logger.info('⚙️  Step 2: Starting settlement worker...');
    logger.info(`   Concurrency: ${WORKER_CONCURRENCY} jobs`);
    await startSettlementWorker(WORKER_CONCURRENCY);
    logger.info('✅ Worker started successfully');

    // Step 3: Print initial statistics
    logger.info('');
    await printStats();

    // Step 4: Set up periodic stats logging
    const statsInterval = setInterval(() => {
      printStats();
    }, STATS_INTERVAL);

  // Success!
  logger.info('');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('✅ Settlement System Ready');
  logger.info('');
  logger.info('📡 Status:');
  logger.info('   • Queue: Active and scheduled');
  logger.info('   • Worker: Processing jobs');
  logger.info('   • System: Fully operational');
  logger.info('');
  logger.info('ℹ️  Jobs run automatically every 5 minutes');
  logger.info('💡 Press Ctrl+C for graceful shutdown');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('');

    // Set up graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info('');
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info(`Received ${signal}, shutting down gracefully...`);

      // Clear stats interval
      clearInterval(statsInterval);

      try {
        // Stop worker and close queue
        logger.info('⏸️  Stopping worker...');
        const queue = getSettlementQueue();
        await queue.stopWorker();

        logger.info('🔌 Closing queue connections...');
        await queue.close();

  logger.info('✅ Settlement system shut down successfully');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown', error);
        process.exit(1);
      }
  };

    // Handle termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught exception', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled rejection', { reason, promise });
      shutdown('unhandledRejection');
    });

  } catch (error) {
    logger.info('');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.error('❌ Failed to start settlement system', error);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }
}

// Start the system
main();
