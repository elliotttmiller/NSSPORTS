// BullMQ queues disabled for static export
export const SettlementQueueService = null;
export const JobType = {};
export const getSettlementQueue = () => null;
export const initializeSettlementQueue = async () => {};
export const startSettlementWorker = async () => {};
export type SettlementJobData = Record<string, unknown>;
export type SyncAndSettleJobData = Record<string, unknown>;
export type SettleSingleBetJobData = Record<string, unknown>;
export type SettleBetJobData = Record<string, unknown>;
export type SettleBetsJobData = Record<string, unknown>;
