#!/usr/bin/env tsx
/**
 * Initialize Settlement Scheduler
 * ────────────────────────────────────────────────────────────────
 * Sets up recurring settlement jobs in Redis Queue
 * Run this once to schedule automated settlement (every 5 minutes)
 * 
 * Usage:
 *   tsx src/scripts/init-settlement-scheduler.ts
 */

import { scheduleSettlementJobs, getQueueStats, closeQueue } from '../lib/queues/settlement';
import { logger } from '../lib/logger';

async function main() {
  try {
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('  NSSPORTS Settlement Scheduler Initialization');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('');

    // Schedule recurring jobs
    logger.info('⏰ Scheduling recurring settlement jobs...');
    await scheduleSettlementJobs();
    
    // Get queue statistics
    logger.info('');
    logger.info('📊 Queue Statistics:');
    const stats = await getQueueStats();
    if (stats) {
      logger.info(`  • Waiting: ${stats.waiting}`);
      logger.info(`  • Active: ${stats.active}`);
      logger.info(`  • Completed: ${stats.completed}`);
      logger.info(`  • Failed: ${stats.failed}`);
      logger.info(`  • Delayed: ${stats.delayed}`);
      logger.info(`  • Total: ${stats.total}`);
    }
    
    logger.info('');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('✅ Settlement scheduler initialized successfully!');
    logger.info('');
    logger.info('Next steps:');
    logger.info('  1. Start worker: tsx src/workers/settlement-worker.ts');
    logger.info('  2. Or use start.py which starts worker automatically');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await closeQueue();
    process.exit(0);
  } catch (error) {
    logger.error('Failed to initialize settlement scheduler:', error);
    process.exit(1);
  }
}

main();
