import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getEventsWithCache } from '@/lib/hybrid-cache';
import { transformSDKEvents } from '@/lib/transformers/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { applyStratifiedSampling } from '@/lib/devDataLimit';

export const revalidate = 30; // Increased from 15 to reduce API calls
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withErrorHandling(async () => {
    try {
      logger.info('Fetching live games using hybrid cache');
      
      // Define time range for live games
      const now = new Date();
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      // Development-friendly limits: fetch only what we need (3-5 games per league)
      const isDevelopment = process.env.NODE_ENV === 'development';
      const fetchLimit = isDevelopment ? 5 : 50; // Only fetch 5 games per league in dev mode
      
      // Fetch from multiple leagues in parallel using hybrid cache
      // CRITICAL: Must include oddID parameter to get betting lines!
      const [nbaResult, nflResult, nhlResult] = await Promise.allSettled([
        getEventsWithCache({ 
          leagueID: 'NBA',
          startsAfter: fourHoursAgo.toISOString(),
          startsBefore: oneHourFromNow.toISOString(),
          live: true,
          oddID: 'moneyline,spread,total', // Fetch main betting lines
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NFL',
          startsAfter: fourHoursAgo.toISOString(),
          startsBefore: oneHourFromNow.toISOString(),
          live: true,
          oddID: 'moneyline,spread,total', // Fetch main betting lines
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NHL',
          startsAfter: fourHoursAgo.toISOString(),
          startsBefore: oneHourFromNow.toISOString(),
          live: true,
          oddID: 'moneyline,spread,total', // Fetch main betting lines
          limit: fetchLimit,
        }),
      ]);
      
      const allEvents = [
        ...(nbaResult.status === 'fulfilled' ? nbaResult.value.data : []),
        ...(nflResult.status === 'fulfilled' ? nflResult.value.data : []),
        ...(nhlResult.status === 'fulfilled' ? nhlResult.value.data : []),
      ];
      
      // Filter to only games that are live (started but not finished)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveEvents = allEvents.filter((event: any) => {
        const startTime = new Date(event.status?.startsAt || event.commence || event.startTime);
        return startTime >= fourHoursAgo && startTime <= now;
      });
      
      logger.info(`Found ${liveEvents.length} live events out of ${allEvents.length} total`);
      
      let games = transformSDKEvents(liveEvents);
      
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
