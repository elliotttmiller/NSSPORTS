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
      logger.info('Fetching live games - checking all events for live/started status');
      
      // Development-friendly limits
      const isDevelopment = process.env.NODE_ENV === 'development';
      const fetchLimit = isDevelopment ? 50 : 100;
      
      // Fetch recent games and let SDK status fields determine which are live
      // No artificial time windows - just get games and filter by official status fields
      // ⭐ OFFICIAL SDK METHOD: Use `live: true` and `finalized: false` query parameters
      // Per official docs: https://sportsgameodds.com/docs/sdk#filtering-and-query-parameters
      // - live: true → Only return games that are currently in progress
      // - finalized: false → Exclude games that have finished
      // - oddIDs: Official market IDs (reduces payload 50-90%)
      // - includeOpposingOddIDs: true → Get both sides automatically
      const [nbaResult, ncaabResult, nflResult, ncaafResult, nhlResult] = await Promise.allSettled([
        getEventsWithCache({ 
          leagueID: 'NBA',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only (ML, spread, total)
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NCAAB',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only (ML, spread, total)
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NFL',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NCAAF',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NHL',
          live: true,                      // ✅ OFFICIAL: Only live/in-progress games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only
          includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
          limit: fetchLimit,
        }),
      ]);
      
      const liveEvents = [
        ...(nbaResult.status === 'fulfilled' ? nbaResult.value.data : []),
        ...(ncaabResult.status === 'fulfilled' ? ncaabResult.value.data : []),
        ...(nflResult.status === 'fulfilled' ? nflResult.value.data : []),
        ...(ncaafResult.status === 'fulfilled' ? ncaafResult.value.data : []),
        ...(nhlResult.status === 'fulfilled' ? nhlResult.value.data : []),
      ];
      
      logger.info(`[/api/games/live] ✅ SDK returned ${liveEvents.length} LIVE events using official filters`, {
        filters: { live: true, finalized: false, oddIDs: 'MAIN_LINE_ODDIDS' }
      });
      
      // Transform SDK events to internal format
      // The transformer will use official Event.status fields to map status
      // Events from cache/SDK match ExtendedSDKEvent structure
      let games = await transformSDKEvents(liveEvents as ExtendedSDKEvent[]);
      
      // ⭐ CRITICAL: Time-based filter to ensure ONLY recent games
      // Live games MUST have started within the last 4 hours
      // This catches any SDK errors or historical data leakage
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const now = new Date();
      const beforeFilter = games.length;
      
      games = games.filter(game => {
        const gameTime = new Date(game.startTime);
        
        // Game must have started (not upcoming)
        if (gameTime > now) {
          logger.debug(`Filtered out upcoming game incorrectly marked as live`, {
            gameId: game.id,
            startTime: game.startTime,
            status: game.status
          });
          return false;
        }
        
        // Game must have started within last 4 hours (not historical)
        if (gameTime <= fourHoursAgo) {
          logger.debug(`Filtered out historical game incorrectly marked as live`, {
            gameId: game.id,
            startTime: game.startTime,
            hoursAgo: (now.getTime() - gameTime.getTime()) / (1000 * 60 * 60)
          });
          return false;
        }
        
        // Game must be marked as live (not finished)
        if (game.status !== 'live') {
          logger.debug(`Filtered out non-live game from live endpoint`, {
            gameId: game.id,
            status: game.status
          });
          return false;
        }
        
        return true;
      });
      
      if (beforeFilter > games.length) {
        logger.warn(`Filtered out ${beforeFilter - games.length} invalid games from live endpoint`, {
          beforeFilter,
          afterFilter: games.length
        });
      }
      
      // Apply stratified sampling in development (Protocol I-IV)
      games = applyStratifiedSampling(games, 'leagueId');
      
      const parsed = z.array(GameSchema).parse(games);
      
      logger.info(`Returning ${parsed.length} live games`);
      return successResponse(parsed);
    } catch (error) {
      logger.error('Error fetching live games', error);
      
      return ApiErrors.serviceUnavailable(
        'Unable to fetch live sports data at this time. Please try again later.'
      );
    }
  });
}
