/**
 * Real-Time Game Status Update API
 * ────────────────────────────────────────────────────────────────
 * Webhook endpoint that triggers immediate settlement when games finish
 * 
 * This endpoint should be called:
 * 1. By live odds polling (when game status changes to finished)
 * 2. By frontend when users view finished games
 * 3. By scheduled job every 5 minutes as backup
 * 
 * Usage:
 *   POST /api/sync-games
 *   GET  /api/sync-games (also works)
 */

import { NextRequest, NextResponse } from 'next/server';
import { addSyncGamesJob, addSettleBetsJob } from '@/lib/queues/settlement';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  try {
    logger.info('[API] Received real-time game sync request');

    // Add sync job to queue (worker will process immediately)
    const syncJob = await addSyncGamesJob();
    
    // Also add settlement job to ensure everything is processed
    const settleJob = await addSettleBetsJob();

    logger.info('[API] ✅ Queued real-time sync and settlement', {
      syncJobId: syncJob.id,
      settleJobId: settleJob.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Real-time settlement triggered',
      jobs: {
        sync: syncJob.id,
        settle: settleJob.id,
      },
    });

  } catch (error) {
    logger.error('[API] Failed to trigger real-time settlement:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Allow GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}
