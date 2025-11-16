import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getEventsWithCache } from '@/lib/hybrid-cache';
import { transformSDKEvents } from '@/lib/transformers/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { applyStratifiedSampling } from '@/lib/devDataLimit';
import { MAIN_LINE_ODDIDS } from '@/lib/sportsgameodds-sdk';
import type { ExtendedSDKEvent } from '@/lib/transformers/sportsgameodds-sdk';

// Smart cache strategy: Let hybrid-cache.ts handle TTL (5s for live, 30-60s for upcoming)
// Route revalidation should match cache TTL for optimal performance
export const revalidate = 5; // Match live game cache TTL (was 10s)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Always run fresh, no static generation

export async function GET() {
  return withErrorHandling(async () => {
    try {
      // Silent operation - reduce log spam with 5s polling
      
      // Development-friendly limits
      const isDevelopment = process.env.NODE_ENV === 'development';
      const fetchLimit = isDevelopment ? 50 : 100;
      
      // Per-commit behavior: fetch live games per-league in parallel to isolate
      // failures and reduce partial/empty response races. This prevents a single
      // slow league from causing the whole live endpoint to appear empty.
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      // Operation timeout - allow slightly longer when fetching multiple leagues
      const OPERATION_TIMEOUT = 25000; // 25 seconds

      const operationPromise = Promise.allSettled([
        getEventsWithCache({
          leagueID: 'NBA',
          live: true,
          finalized: false,
          startsAfter: startOfToday.toISOString(),
          startsBefore: endOfToday.toISOString(),
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
        getEventsWithCache({
          leagueID: 'NCAAB',
          live: true,
          finalized: false,
          startsAfter: startOfToday.toISOString(),
          startsBefore: endOfToday.toISOString(),
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
        getEventsWithCache({
          leagueID: 'NFL',
          live: true,
          finalized: false,
          startsAfter: startOfToday.toISOString(),
          startsBefore: endOfToday.toISOString(),
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
        getEventsWithCache({
          leagueID: 'NCAAF',
          live: true,
          finalized: false,
          startsAfter: startOfToday.toISOString(),
          startsBefore: endOfToday.toISOString(),
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
        getEventsWithCache({
          leagueID: 'NHL',
          live: true,
          finalized: false,
          startsAfter: startOfToday.toISOString(),
          startsBefore: endOfToday.toISOString(),
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
      ]);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT)
      );

      let results;
      try {
        // Race between operation and timeout
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results = await Promise.race([operationPromise, timeoutPromise]) as PromiseSettledResult<any>[];
      } catch (timeoutError) {
        logger.warn('[/api/games/live] Operation timeout, may return partial results');
        results = [
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
        ];
      }

      const [nbaResult, ncaabResult, nflResult, ncaafResult, nhlResult] = results;

      const liveEvents = [
        ...(nbaResult.status === 'fulfilled' ? nbaResult.value.data : []),
        ...(ncaabResult.status === 'fulfilled' ? ncaabResult.value.data : []),
        ...(nflResult.status === 'fulfilled' ? nflResult.value.data : []),
        ...(ncaafResult.status === 'fulfilled' ? ncaafResult.value.data : []),
        ...(nhlResult.status === 'fulfilled' ? nhlResult.value.data : []),
      ];
      
      // Silent operation - only log errors, not every successful fetch
      
      // Transform SDK events to internal format
      // The transformer will use official Event.status fields to map status
      // Events from cache/SDK match ExtendedSDKEvent structure
      let games = await transformSDKEvents(liveEvents as ExtendedSDKEvent[]);
      
      // ⭐ Trust the SDK's live flag and our transformer's status mapping
      // The SDK query already filtered with live: true
      // Only add sanity check: keep games marked as 'live' status
      // Remove overly aggressive time-based filtering that was causing issues
      games = games.filter(game => {
        // Game must be marked as live by the transformer
        if (game.status !== 'live') {
          return false;
        }
        
        return true;
      });
      
      // Apply stratified sampling in development (Protocol I-IV)
      games = applyStratifiedSampling(games, 'leagueId');
      
      const parsed = z.array(GameSchema).parse(games);
      
      return successResponse(parsed);
    } catch (error) {
      logger.error('Error fetching live games', error);
      
      return ApiErrors.serviceUnavailable(
        'Unable to fetch live sports data at this time. Please try again later.'
      );
    }
  });
}
