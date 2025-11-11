import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getEventsWithCache } from '@/lib/hybrid-cache';
import { transformSDKEvents } from '@/lib/transformers/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { applyStratifiedSampling } from '@/lib/devDataLimit';
import type { ExtendedSDKEvent } from '@/lib/transformers/sportsgameodds-sdk';

export const revalidate = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withErrorHandling(async () => {
    try {
      logger.info('Fetching upcoming games using hybrid cache');
      
      // Define time range for upcoming games
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Development-friendly limits: fetch only what we need (3-5 games per league)
      const isDevelopment = process.env.NODE_ENV === 'development';
      const fetchLimit = isDevelopment ? 5 : 50; // Only fetch 5 games per league in dev mode
      
      // ⭐ OFFICIAL SDK METHOD: Use `live: false` and `finalized: false` for upcoming games
      // Per official docs: https://sportsgameodds.com/docs/sdk#filtering-and-query-parameters
      // - live: false → Only return games that haven't started yet
      // - finalized: false → Exclude games that have finished
      // - oddsAvailable: true → Only games with betting odds
      // - startsAfter/startsBefore → Time window for upcoming games
      const [nbaResult, ncaabResult, nflResult, ncaafResult, nhlResult] = await Promise.allSettled([
        getEventsWithCache({ 
          leagueID: 'NBA',
          live: false,                     // ✅ OFFICIAL: Only non-live (upcoming) games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          oddsAvailable: true,             // ✅ OFFICIAL: Only games with odds
          startsAfter: now.toISOString(),
          startsBefore: sevenDaysFromNow.toISOString(),
          oddIDs: 'game-ml,game-ats,game-ou', // Main lines: moneyline, spread, total
          includeOpposingOddIDs: true, // Get both sides of each market
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NCAAB',
          live: false,                     // ✅ OFFICIAL: Only non-live (upcoming) games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          oddsAvailable: true,             // ✅ OFFICIAL: Only games with odds
          startsAfter: now.toISOString(),
          startsBefore: sevenDaysFromNow.toISOString(),
          oddIDs: 'game-ml,game-ats,game-ou', // Main lines: moneyline, spread, total
          includeOpposingOddIDs: true, // Get both sides of each market
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NFL',
          live: false,                     // ✅ OFFICIAL: Only non-live (upcoming) games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          oddsAvailable: true,             // ✅ OFFICIAL: Only games with odds
          startsAfter: now.toISOString(),
          startsBefore: sevenDaysFromNow.toISOString(),
          oddIDs: 'game-ml,game-ats,game-ou', // Main lines: moneyline, spread, total
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NCAAF',
          live: false,                     // ✅ OFFICIAL: Only non-live (upcoming) games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          oddsAvailable: true,             // ✅ OFFICIAL: Only games with odds
          startsAfter: now.toISOString(),
          startsBefore: sevenDaysFromNow.toISOString(),
          oddIDs: 'game-ml,game-ats,game-ou', // Main lines: moneyline, spread, total
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NHL',
          live: false,                     // ✅ OFFICIAL: Only non-live (upcoming) games
          finalized: false,                // ✅ OFFICIAL: Exclude finished games
          oddsAvailable: true,             // ✅ OFFICIAL: Only games with odds
          startsAfter: now.toISOString(),
          startsBefore: sevenDaysFromNow.toISOString(),
          oddIDs: 'game-ml,game-ats,game-ou', // Main lines: moneyline, spread, total
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
      ]);
      
      const upcomingEvents = [
        ...(nbaResult.status === 'fulfilled' ? nbaResult.value.data : []),
        ...(ncaabResult.status === 'fulfilled' ? ncaabResult.value.data : []),
        ...(nflResult.status === 'fulfilled' ? nflResult.value.data : []),
        ...(ncaafResult.status === 'fulfilled' ? ncaafResult.value.data : []),
        ...(nhlResult.status === 'fulfilled' ? nhlResult.value.data : []),
      ];
      
      logger.info(`[/api/games/upcoming] ✅ SDK returned ${upcomingEvents.length} UPCOMING events using official filters`, {
        filters: { live: false, finalized: false, oddsAvailable: true }
      });
      
      // Transform SDK events to internal format
      // Events from cache/SDK match ExtendedSDKEvent structure
      let games = await transformSDKEvents(upcomingEvents as ExtendedSDKEvent[]);
      
      // Sort by start time
      games.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      
      // Limit to 20 games
      games = games.slice(0, 20);
      
      logger.info(`Found ${games.length} upcoming games`);
      
      // Apply stratified sampling in development (Protocol I-IV)
      games = applyStratifiedSampling(games, 'leagueId');
      
      const parsed = z.array(GameSchema).parse(games);
      
      logger.info(`Returning ${parsed.length} upcoming games`);
      return successResponse(parsed);
    } catch (error) {
      logger.error('Error fetching upcoming games', error);
      
      return ApiErrors.serviceUnavailable(
        'Unable to fetch upcoming games at this time. Please try again later.'
      );
    }
  });
}
