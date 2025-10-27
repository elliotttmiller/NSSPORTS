import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getEvents, SportsGameOddsApiError } from '@/lib/sportsgameodds-sdk';
import { transformSportsGameOddsEvents } from '@/lib/transformers/sportsgameodds-api';
import { logger } from '@/lib/logger';
import { unstable_cache } from 'next/cache';
import { applyStratifiedSampling } from '@/lib/devDataLimit';

export const revalidate = 30; // Increased from 15 to reduce API calls
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cached function to fetch live games from SportsGameOdds SDK
 */
const getCachedLiveGames = unstable_cache(
  async () => {
    logger.info('Fetching live games from SportsGameOdds SDK');
    
    // Define time range for live games
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Fetch from multiple leagues in parallel
    const [nbaResult, nflResult, nhlResult] = await Promise.allSettled([
      getEvents({ 
        leagueID: 'NBA',
        startsAfter: fourHoursAgo.toISOString(),
        startsBefore: oneHourFromNow.toISOString(),
        live: true,
        limit: 50,
      }),
      getEvents({ 
        leagueID: 'NFL',
        startsAfter: fourHoursAgo.toISOString(),
        startsBefore: oneHourFromNow.toISOString(),
        live: true,
        limit: 50,
      }),
      getEvents({ 
        leagueID: 'NHL',
        startsAfter: fourHoursAgo.toISOString(),
        startsBefore: oneHourFromNow.toISOString(),
        live: true,
        limit: 50,
      }),
    ]);
    
    const allEvents = [
      ...(nbaResult.status === 'fulfilled' ? nbaResult.value.data : []),
      ...(nflResult.status === 'fulfilled' ? nflResult.value.data : []),
      ...(nhlResult.status === 'fulfilled' ? nhlResult.value.data : []),
    ];
    
    // Filter to only games that are live (started but not finished)
    const liveEvents = allEvents.filter(event => {
      const startTime = new Date(event.startTime);
      return startTime >= fourHoursAgo && startTime <= now;
    });
    
    logger.info(`Found ${liveEvents.length} live events out of ${allEvents.length} total`);
    return liveEvents;
  },
  ['sportsgameodds-sdk-live-games'],
  {
    revalidate: 30,
    tags: ['live-games'],
  }
);

export async function GET() {
  return withErrorHandling(async () => {
    try {
      const events = await getCachedLiveGames();
      let games = transformSportsGameOddsEvents(events);
      
      // Apply stratified sampling in development (Protocol I-IV)
      games = applyStratifiedSampling(games, 'leagueId');
      
      const parsed = z.array(GameSchema).parse(games);
      
      logger.info(`Returning ${parsed.length} live games`);
      return successResponse(parsed);
    } catch (error) {
      if (error instanceof SportsGameOddsApiError) {
        logger.error('SportsGameOdds API error in live games', error);
        
        if (error.statusCode === 401 || error.statusCode === 403) {
          return ApiErrors.serviceUnavailable(
            'Sports data service is temporarily unavailable. Please check API configuration.'
          );
        }
        
        return ApiErrors.serviceUnavailable(
          'Unable to fetch live sports data at this time. Please try again later.'
        );
      }
      
      throw error;
    }
  });
}
