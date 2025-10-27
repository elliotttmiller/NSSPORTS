import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getEventsWithCache } from '@/lib/hybrid-cache';
import { transformSDKEvents } from '@/lib/transformers/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { applyStratifiedSampling } from '@/lib/devDataLimit';

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
      
      // Fetch from multiple leagues in parallel using hybrid cache
      // CRITICAL: Must include oddID parameter to get betting lines!
      const [nbaResult, nflResult, nhlResult] = await Promise.allSettled([
        getEventsWithCache({ 
          leagueID: 'NBA',
          startsAfter: now.toISOString(),
          startsBefore: sevenDaysFromNow.toISOString(),
          oddsAvailable: true,
          oddID: 'ml,sp,ou', // Abbreviated format: moneyline, spread, over/under
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NFL',
          startsAfter: now.toISOString(),
          startsBefore: sevenDaysFromNow.toISOString(),
          oddsAvailable: true,
          oddID: 'ml,sp,ou', // Abbreviated format: moneyline, spread, over/under
          limit: fetchLimit,
        }),
        getEventsWithCache({ 
          leagueID: 'NHL',
          startsAfter: now.toISOString(),
          startsBefore: sevenDaysFromNow.toISOString(),
          oddsAvailable: true,
          oddID: 'ml,sp,ou', // Abbreviated format: moneyline, spread, over/under
          limit: fetchLimit,
        }),
      ]);
      
      const allEvents = [
        ...(nbaResult.status === 'fulfilled' ? nbaResult.value.data : []),
        ...(nflResult.status === 'fulfilled' ? nflResult.value.data : []),
        ...(nhlResult.status === 'fulfilled' ? nhlResult.value.data : []),
      ];
      
      // Filter to only upcoming games (not yet started)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const upcomingEvents = allEvents.filter((event: any) => {
        const startTime = new Date(event.status?.startsAt || event.commence || event.startTime);
        return startTime > now;
      });
      
      // Sort by start time and limit to 20
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      upcomingEvents.sort((a: any, b: any) => {
        const aTime = new Date(a.status?.startsAt || a.commence || a.startTime).getTime();
        const bTime = new Date(b.status?.startsAt || b.commence || b.startTime).getTime();
        return aTime - bTime;
      });
      
      logger.info(`Found ${upcomingEvents.length} upcoming events out of ${allEvents.length} total`);
      
      const limitedEvents = upcomingEvents.slice(0, 20);
      let games = transformSDKEvents(limitedEvents);
      
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
