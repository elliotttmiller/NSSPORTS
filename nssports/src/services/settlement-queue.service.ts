// Settlement queue service disabled for static export
export const SettlementQueueService = null;
export async function startSettlementWorker(_concurrency?: number): Promise<void> {}
