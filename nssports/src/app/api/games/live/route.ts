import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getEventsWithCache } from '@/lib/hybrid-cache';
import { transformSDKEvents } from '@/lib/transformers/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { applyStratifiedSampling } from '@/lib/devDataLimit';
import { MAIN_LINE_ODDIDS } from '@/lib/sportsgameodds-sdk';
import type { ExtendedSDKEvent } from '@/lib/transformers/sportsgameodds-sdk';

// Smart cache strategy: Let hybrid-cache.ts handle TTL (15s for live, 30-60s for upcoming)
// Route revalidation should be shorter than cache TTL to ensure fresh data
export const revalidate = 10; // Revalidate every 10 seconds (cache handles the rest)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Always run fresh, no static generation

export async function GET() {
  return withErrorHandling(async () => {
    try {
      // Silent operation - reduce log spam with 5s polling
      
      // Development-friendly limits
      const isDevelopment = process.env.NODE_ENV === 'development';
      const fetchLimit = isDevelopment ? 50 : 100;
      
      // ⭐ Force fetch only TODAY's games to avoid stale cache
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      
      // ⭐ Add timeout protection for the entire operation
      // If SDK calls take too long, we'll return cached data or partial results
      const OPERATION_TIMEOUT = 25000; // 25 seconds (less than frontend's 30s timeout)
      
      const operationPromise = Promise.allSettled([
        getEventsWithCache({ 
          leagueID: 'NBA',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          startsAfter: startOfToday.toISOString(), // ✅ Force today's games only
          startsBefore: endOfToday.toISOString(),  // ✅ Force today's games only
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only (ML, spread, total)
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NCAAB',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          startsAfter: startOfToday.toISOString(), // ✅ Force today's games only
          startsBefore: endOfToday.toISOString(),  // ✅ Force today's games only
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only (ML, spread, total)
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NFL',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          startsAfter: startOfToday.toISOString(), // ✅ Force today's games only
          startsBefore: endOfToday.toISOString(),  // ✅ Force today's games only
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NCAAF',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          startsAfter: startOfToday.toISOString(), // ✅ Force today's games only
          startsBefore: endOfToday.toISOString(),  // ✅ Force today's games only
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NHL',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          startsAfter: startOfToday.toISOString(), // ✅ Force today's games only
          startsBefore: endOfToday.toISOString(),  // ✅ Force today's games only
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'MLB',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          startsAfter: startOfToday.toISOString(), // ✅ Force today's games only
          startsBefore: endOfToday.toISOString(),  // ✅ Force today's games only
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'ATP',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          startsAfter: startOfToday.toISOString(), // ✅ Force today's games only
          startsBefore: endOfToday.toISOString(),  // ✅ Force today's games only
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only (moneyline for tennis)
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'WTA',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          startsAfter: startOfToday.toISOString(), // ✅ Force today's games only
          startsBefore: endOfToday.toISOString(),  // ✅ Force today's games only
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only (moneyline for tennis)
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'ITF',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          startsAfter: startOfToday.toISOString(), // ✅ Force today's games only
          startsBefore: endOfToday.toISOString(),  // ✅ Force today's games only
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only (moneyline for tennis)
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
      ]);
      
      // Race between operation and timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT)
      );
      
      let results;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results = await Promise.race([operationPromise, timeoutPromise]) as PromiseSettledResult<any>[];
      } catch (timeoutError) {
        // If we hit timeout, log it but try to return whatever we have
        logger.warn('[/api/games/live] Operation timeout, may return partial results');
        // Return empty results if we timeout before any complete
        results = [
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
        ];
      }
      
      const [nbaResult, ncaabResult, nflResult, ncaafResult, nhlResult, mlbResult, atpResult, wtaResult, itfResult] = results;
      
      const liveEvents = [
        ...(nbaResult.status === 'fulfilled' ? nbaResult.value.data : []),
        ...(ncaabResult.status === 'fulfilled' ? ncaabResult.value.data : []),
        ...(nflResult.status === 'fulfilled' ? nflResult.value.data : []),
        ...(ncaafResult.status === 'fulfilled' ? ncaafResult.value.data : []),
        ...(nhlResult.status === 'fulfilled' ? nhlResult.value.data : []),
        ...(mlbResult.status === 'fulfilled' ? mlbResult.value.data : []),
        ...(atpResult.status === 'fulfilled' ? atpResult.value.data : []),
        ...(wtaResult.status === 'fulfilled' ? wtaResult.value.data : []),
        ...(itfResult.status === 'fulfilled' ? itfResult.value.data : []),
      ];
      
      // Silent operation - only log errors, not every successful fetch
      
      // Transform SDK events to internal format
      // The transformer will use official Event.status fields to map status
      // Events from cache/SDK match ExtendedSDKEvent structure
      let games = await transformSDKEvents(liveEvents as ExtendedSDKEvent[]);
      
      // ⭐ CRITICAL: Time-based filter to ensure ONLY recent games
      // Live games MUST have started within the last 4 hours
      // This catches any SDK errors or historical data leakage
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const nowForFilter = new Date();
      
      games = games.filter(game => {
        const gameTime = new Date(game.startTime);
        
        // Game must have started (not upcoming)
        if (gameTime > nowForFilter) {
          return false;
        }
        
        // Game must have started within last 4 hours (not historical)
        if (gameTime <= fourHoursAgo) {
          return false;
        }
        
        // Game must be marked as live (not finished)
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
