/**
 * Settlement Queue - Exports for backward compatibility
 * ────────────────────────────────────────────────────────────────
 * Re-exports from the new professional settlement queue service
 * This maintains backward compatibility with existing code
 */

export {
  SettlementQueueService,
  JobType as SettlementJobType,
  getSettlementQueue,
  initializeSettlementQueue,
  startSettlementWorker,
  type SettlementJobData,
  type SyncAndSettleJobData,
  type SettleGameJobData as SettleSingleBetJobData, // Alias for compatibility
  type SettleBetJobData,
  type SettleAllJobData as SettleBetsJobData, // Alias for compatibility
} from '../../services/settlement-queue.service';

// Re-export commonly used functions with old names for compatibility
import { getSettlementQueue } from '../../services/settlement-queue.service';

export const settlementQueue = getSettlementQueue();

export async function scheduleSettlementJobs() {
  const queue = getSettlementQueue();
  await queue.initialize();
}

export async function getQueueStats() {
  const queue = getSettlementQueue();
  return queue.getStats();
}

export async function pauseQueue() {
  const queue = getSettlementQueue();
  return queue.pause();
}

export async function resumeQueue() {
  const queue = getSettlementQueue();
  return queue.resume();
}

export async function drainQueue() {
  const queue = getSettlementQueue();
  return queue.drain();
}

export async function closeQueue() {
  const queue = getSettlementQueue();
  return queue.close();
}

// Legacy job addition functions
export async function addSyncGamesJob() {
  // This is now handled by the recurring SYNC_AND_SETTLE job
  // For manual trigger, use addSettleAllJob
  const queue = getSettlementQueue();
  return queue.addSettleAllJob();
}

export async function addSettleBetsJob() {
  // This is now handled by the recurring SYNC_AND_SETTLE job
  // For manual trigger, use addSettleAllJob
  const queue = getSettlementQueue();
  return queue.addSettleAllJob();
}

export async function addSettleSingleBetJob(data: { betId: string; priority?: number }) {
  const queue = getSettlementQueue();
  return queue.addSettleBetJob(data.betId, data.priority);
}
