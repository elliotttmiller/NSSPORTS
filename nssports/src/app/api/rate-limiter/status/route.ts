/**
 * Rate Limiter Status Endpoint
 * 
 * Development/monitoring endpoint to check SDK rate limiter status
 * Shows current tokens, queue, hourly usage, and efficiency metrics
 * 
 * Example response:
 * {
 *   tokens: 5,
 *   queueLength: 0,
 *   hourlyCount: 123,
 *   hourlyLimit: 800,
 *   inFlightRequests: 2,
 *   config: { requestsPerMinute: 30, ... },
 *   metrics: {
 *     totalRequests: 150,
 *     deduplicated: 20,
 *     coalesced: 5,
 *     rateLimited: 0,
 *     errors: 2,
 *     efficiency: 17 // percentage of requests avoided
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const status = rateLimiter.getStatus();
    
    // Calculate additional insights
    const utilizationPercent = Math.round((status.hourlyCount / status.hourlyLimit) * 100);
    const tokenUtilization = Math.round(((status.config.burstSize - status.tokens) / status.config.burstSize) * 100);
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        insights: {
          hourlyUtilization: `${utilizationPercent}%`,
          tokenUtilization: `${tokenUtilization}%`,
          isThrottled: status.tokens === 0,
          hasQueue: status.queueLength > 0,
          environment: process.env.NODE_ENV,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching rate limiter status', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
