/**
 * Settlement System Health Check API
 * ────────────────────────────────────────────────────────────────
 * Monitoring endpoint for settlement system status
 * 
 * GET /api/settlement/health
 * 
 * Returns:
 * - Queue statistics
 * - Worker status
 * - Recurring jobs info
 * - Recent job history
 * - System health indicators
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSettlementQueue } from '@/services/settlement-queue.service';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const queue = getSettlementQueue();

    // Get queue statistics
    const stats = await queue.getStats();
    
    // Get recurring jobs
    const repeatableJobs = await queue.getRepeatableJobs();

    // Calculate health score
    const healthScore = calculateHealthScore(stats);

    const response = {
      status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'unhealthy',
      healthScore,
      timestamp: new Date().toISOString(),
      queue: {
        waiting: stats.waiting,
        active: stats.active,
        completed: stats.completed,
        failed: stats.failed,
        delayed: stats.delayed,
        paused: stats.paused,
        total: stats.total,
      },
      recurring: repeatableJobs.map(job => ({
        name: job.name,
        pattern: job.pattern,
        nextRun: job.next ? new Date(job.next).toISOString() : null,
      })),
      indicators: {
        queueNotPaused: !stats.paused,
        hasRecurringJobs: repeatableJobs.length > 0,
        lowFailureRate: stats.failed < (stats.total * 0.1), // Less than 10% failure rate
        hasActiveJobs: stats.active > 0 || stats.waiting > 0,
      },
    };

    logger.info('[Settlement Health] Health check performed', response);

    return NextResponse.json(response, {
      status: healthScore >= 50 ? 200 : 503,
    });

  } catch (error) {
    logger.error('[Settlement Health] Health check failed', error);
    
    return NextResponse.json(
      {
        status: 'error',
        healthScore: 0,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

/**
 * Calculate health score (0-100)
 */
function calculateHealthScore(stats: {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  total: number;
}): number {
  let score = 100;

  // Deduct points for paused queue
  if (stats.paused) score -= 50;

  // Deduct points for high failure rate
  if (stats.total > 0) {
    const failureRate = stats.failed / stats.total;
    if (failureRate > 0.5) score -= 40; // Over 50% failures
    else if (failureRate > 0.3) score -= 30; // Over 30% failures
    else if (failureRate > 0.1) score -= 20; // Over 10% failures
    else if (failureRate > 0.05) score -= 10; // Over 5% failures
  }

  // Deduct points for excessive waiting jobs (backlog)
  if (stats.waiting > 100) score -= 20;
  else if (stats.waiting > 50) score -= 10;
  else if (stats.waiting > 20) score -= 5;

  // Deduct points for excessive delayed jobs
  if (stats.delayed > 50) score -= 15;
  else if (stats.delayed > 20) score -= 10;
  else if (stats.delayed > 10) score -= 5;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}
