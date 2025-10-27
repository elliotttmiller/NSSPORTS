import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getEvents, SportsGameOddsApiError } from '@/lib/sportsgameodds-api';
import { transformSportsGameOddsEvents } from '@/lib/transformers/sportsgameodds-api';
import { logger } from '@/lib/logger';
import { unstable_cache } from 'next/cache';
import { applyStratifiedSampling } from '@/lib/devDataLimit';

export const revalidate = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cached function to fetch upcoming games from SportsGameOdds API
 */
const getCachedUpcomingGames = unstable_cache(
  async () => {
    logger.info('Fetching upcoming games from SportsGameOdds API');
    
    // Define time range for upcoming games
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Fetch from multiple leagues in parallel
    const [nbaResult, nflResult, nhlResult] = await Promise.allSettled([
      getEvents('NBA', { 
        startsAfter: now.toISOString(),
        startsBefore: sevenDaysFromNow.toISOString(),
        limit: 50,
      }),
      getEvents('NFL', { 
        startsAfter: now.toISOString(),
        startsBefore: sevenDaysFromNow.toISOString(),
        limit: 50,
      }),
      getEvents('NHL', { 
        startsAfter: now.toISOString(),
        startsBefore: sevenDaysFromNow.toISOString(),
        limit: 50,
      }),
    ]);
    
    const allEvents = [
      ...(nbaResult.status === 'fulfilled' ? nbaResult.value.data : []),
      ...(nflResult.status === 'fulfilled' ? nflResult.value.data : []),
      ...(nhlResult.status === 'fulfilled' ? nhlResult.value.data : []),
    ];
    
    // Filter to only upcoming games (not yet started)
    const upcomingEvents = allEvents.filter(event => {
      const startTime = new Date(event.startTime);
      return startTime > now;
    });
    
    // Sort by start time and limit to 20
    upcomingEvents.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    
    logger.info(`Found ${upcomingEvents.length} upcoming events out of ${allEvents.length} total`);
    return upcomingEvents.slice(0, 20);
  },
  ['sportsgameodds-upcoming-games'],
  {
    revalidate: 60,
    tags: ['upcoming-games'],
  }
);

export async function GET() {
  return withErrorHandling(async () => {
    try {
      const events = await getCachedUpcomingGames();
      let games = transformSportsGameOddsEvents(events);
      
      // Apply stratified sampling in development (Protocol I-IV)
      games = applyStratifiedSampling(games, 'leagueId');
      
      const parsed = z.array(GameSchema).parse(games);
      
      logger.info(`Returning ${parsed.length} upcoming games`);
      return successResponse(parsed);
    } catch (error) {
      if (error instanceof SportsGameOddsApiError) {
        logger.error('SportsGameOdds API error in upcoming games', error);
        
        if (error.statusCode === 401 || error.statusCode === 403) {
          return ApiErrors.serviceUnavailable(
            'Sports data service is temporarily unavailable. Please check API configuration.'
          );
        }
        
        return ApiErrors.serviceUnavailable(
          'Unable to fetch upcoming sports data at this time. Please try again later.'
        );
      }
      
      throw error;
    }
  });
}
