/**
 * Account Usage API Route
 * 
 * Fetches API usage statistics from SportsGameOdds account
 * Per official docs: https://sportsgameodds.com/docs/setup/rate-limiting
 * 
 * Provides real-time monitoring of:
 * - Requests made (current period)
 * - Rate limit status
 * - Usage trends
 * - Optimization effectiveness
 */

import { NextRequest } from 'next/server';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';

export const revalidate = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await auth();
    
    if (!session || !session.user) {
      logger.warn('[API /account/usage] Unauthorized access attempt');
      throw ApiErrors.unauthorized('You must be logged in to view account usage');
    }

    try {
      const rateLimiterStatus = rateLimiter.getStatus();
      const currentHour = new Date().getHours();
      
      const response = {
        local: {
          requestsThisMinute: rateLimiterStatus.tokens < rateLimiterStatus.config.requestsPerMinute 
            ? rateLimiterStatus.config.requestsPerMinute - rateLimiterStatus.tokens
            : 0,
          requestsThisHour: rateLimiterStatus.hourlyCount,
          limits: {
            perMinute: rateLimiterStatus.config.requestsPerMinute,
            perHour: rateLimiterStatus.config.requestsPerHour,
          },
          utilization: {
            minute: Math.round((rateLimiterStatus.tokens / rateLimiterStatus.config.requestsPerMinute) * 100),
            hour: Math.round((rateLimiterStatus.hourlyCount / rateLimiterStatus.config.requestsPerHour) * 100),
          },
          tokensAvailable: rateLimiterStatus.tokens,
          queueLength: rateLimiterStatus.queueLength,
          inFlightRequests: rateLimiterStatus.inFlightRequests,
        },
        optimization: {
          totalRequests: rateLimiterStatus.metrics.totalRequests,
          deduplicated: rateLimiterStatus.metrics.deduplicated,
          coalesced: rateLimiterStatus.metrics.coalesced,
          rateLimited: rateLimiterStatus.metrics.rateLimited,
          errors: rateLimiterStatus.metrics.errors,
          efficiency: rateLimiterStatus.metrics.efficiency,
          savedRequests: rateLimiterStatus.metrics.deduplicated + rateLimiterStatus.metrics.coalesced,
        },
        proPlan: {
          requestsPerMinute: 1000,
          objectsPerMonth: 'unlimited',
          requestsPerHour: 50000,
          objectsPerDay: 7000000,
        },
        status: {
          healthy: rateLimiterStatus.hourlyCount < rateLimiterStatus.config.requestsPerHour * 0.8,
          minuteUsagePercent: Math.round((rateLimiterStatus.tokens / rateLimiterStatus.config.requestsPerMinute) * 100),
          hourUsagePercent: Math.round((rateLimiterStatus.hourlyCount / rateLimiterStatus.config.requestsPerHour) * 100),
          currentHour,
          timestamp: new Date().toISOString(),
        },
        recommendations: generateRecommendations(rateLimiterStatus),
      };
      
      return successResponse(response, 200, { cached: false, source: 'local-metrics' });
    } catch (error) {
      logger.error('[API /account/usage] Error', error);
      throw ApiErrors.serviceUnavailable('Unable to fetch account usage');
    }
  });
}

function generateRecommendations(status: ReturnType<typeof rateLimiter.getStatus>): string[] {
  const recommendations: string[] = [];
  const hourUsage = (status.hourlyCount / status.config.requestsPerHour) * 100;
  const efficiency = status.metrics.efficiency;
  
  if (hourUsage > 80) {
    recommendations.push('⚠️ High API usage (>80%). Consider increasing cache TTL.');
  } else if (hourUsage > 60) {
    recommendations.push('⚡ Moderate-high API usage (>60%). Monitor during peak hours.');
  }
  
  if (efficiency < 30) {
    recommendations.push('💡 Low deduplication (<30%). Review for unnecessary requests.');
  } else if (efficiency > 50) {
    recommendations.push('✅ Excellent deduplication (>50%). Optimization working well!');
  }
  
  if (status.queueLength > 10) {
    recommendations.push('⏳ Request queue building. Consider rate limit adjustments.');
  }
  
  const errorRate = status.metrics.totalRequests > 0 
    ? (status.metrics.errors / status.metrics.totalRequests) * 100 : 0;
  if (errorRate > 5) {
    recommendations.push('❌ High error rate (>5%). Check API connectivity.');
  }
  
  if (status.metrics.rateLimited > 0) {
    recommendations.push(`⛔ ${status.metrics.rateLimited} requests rate-limited.`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ API usage healthy. All systems normal.');
  }
  
  return recommendations;
}
