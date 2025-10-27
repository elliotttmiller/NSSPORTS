/**
 * Rate Limiter Status Endpoint
 * 
 * Development/monitoring endpoint to check SDK rate limiter status
 * Shows current tokens, queue, and hourly usage
 */

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    logger.info('Fetching rate limiter status');
    
    const status = rateLimiter.getStatus();
    
    return NextResponse.json({
      success: true,
      status,
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
