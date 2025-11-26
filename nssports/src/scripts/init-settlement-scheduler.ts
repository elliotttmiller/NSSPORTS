#!/usr/bin/env tsx
/**
 * Initialize Settlement Scheduler
 * ────────────────────────────────────────────────────────────────
 * Sets up recurring settlement jobs in Redis Queue
 * Run this once to schedule automated settlement
 * 
 * Usage:
 *   npm run settlement:init
 */

import { initializeSettlementQueue, getSettlementQueue } from '../services/settlement-queue.service';
import { logger } from '../lib/logger';
const log = logger.createScopedLogger('InitSettlementScheduler');

async function main() {
  try {
  log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log.info('  NSSPORTS Settlement Scheduler Initialization');
  log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log.info('');

    // Initialize queue
  log.info('⏰ Initializing settlement queue...');
    await initializeSettlementQueue();
    
    // Get queue statistics
  log.info('');
  log.info('📊 Queue Statistics:');
    const queue = getSettlementQueue();
    const stats = await queue.getStats();
    const repeatableJobs = await queue.getRepeatableJobs();
    
  log.info(`  • Waiting: ${stats.waiting}`);
  log.info(`  • Active: ${stats.active}`);
  log.info(`  • Completed: ${stats.completed}`);
  log.info(`  • Failed: ${stats.failed}`);
  log.info(`  • Delayed: ${stats.delayed}`);
  log.info(`  • Total: ${stats.total}`);
  log.info('');
  log.info(`  • Recurring Jobs: ${repeatableJobs.length}`);
    
    if (repeatableJobs.length > 0) {
      log.info('');
      log.info('⏰ Scheduled Jobs:');
      repeatableJobs.forEach(job => {
        // Detailed schedule lines can be noisy in automated runs; keep as debug
        log.debug(`  • ${job.name}: ${job.pattern}`);
        if (job.next) {
          log.debug(`    Next run: ${new Date(job.next).toISOString()}`);
        }
      });
    }
    
    logger.info('');
  log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log.info('✅ Settlement scheduler initialized successfully!');
  log.info('');
  log.info('Next steps:');
  log.info('  1. Start worker: npm run settlement:worker');
  log.info('  2. Or use all-in-one: npm run settlement:start');
  log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await queue.close();
    process.exit(0);
  } catch (error) {
  log.error('Failed to initialize settlement scheduler:', error);
    process.exit(1);
  }
}

main();
