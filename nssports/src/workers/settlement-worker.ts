#!/usr/bin/env tsx
/**
 * Settlement Worker Process
 * ────────────────────────────────────────────────────────────────
 * Standalone BullMQ worker for bet settlement
 * 
 * This worker can be run independently from the main app
 * Ideal for distributed setups or when you want to scale workers independently
 * 
 * Usage:
 *   npm run settlement:worker
 *   
 * Environment Variables:
 *   SETTLEMENT_WORKER_CONCURRENCY - Number of concurrent jobs (default: 1)
 *   WORKER_ID - Unique worker identifier
 */

import { startSettlementWorker } from '../services/settlement-queue.service';
import { logger } from '../lib/logger';

const WORKER_CONCURRENCY = parseInt(process.env.SETTLEMENT_WORKER_CONCURRENCY || '1');
const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;

async function main() {
  logger.info(`[${WORKER_ID}] Starting settlement worker...`, {
    concurrency: WORKER_CONCURRENCY,
    pid: process.pid,
  });

  try {
    await startSettlementWorker(WORKER_CONCURRENCY);
    logger.info(`[${WORKER_ID}] ✅ Worker started and processing jobs`);

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`[${WORKER_ID}] Received ${signal}, shutting down...`);
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error(`[${WORKER_ID}] Failed to start worker`, error);
    process.exit(1);
  }
}

main();
