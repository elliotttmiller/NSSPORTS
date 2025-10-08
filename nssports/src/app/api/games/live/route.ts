import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getOdds, OddsApiError } from '@/lib/the-odds-api';
import { transformOddsApiEvents } from '@/lib/transformers/odds-api';
import { logger } from '@/lib/logger';
import { unstable_cache } from 'next/cache';

export const revalidate = 30; // Increased from 15 to reduce API calls
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cached function to fetch live games from The Odds API
 */
const getCachedLiveGames = unstable_cache(
  async () => {
    logger.info('Fetching live games from The Odds API');
    
    // Fetch from multiple sports in parallel
    const [nbaEvents, nflEvents, nhlEvents] = await Promise.allSettled([
      getOdds('basketball_nba', { regions: 'us', markets: 'h2h,spreads,totals', oddsFormat: 'american' }),
      getOdds('americanfootball_nfl', { regions: 'us', markets: 'h2h,spreads,totals', oddsFormat: 'american' }),
      getOdds('icehockey_nhl', { regions: 'us', markets: 'h2h,spreads,totals', oddsFormat: 'american' }),
    ]);
    
    const allEvents = [
      ...(nbaEvents.status === 'fulfilled' ? nbaEvents.value : []),
      ...(nflEvents.status === 'fulfilled' ? nflEvents.value : []),
      ...(nhlEvents.status === 'fulfilled' ? nhlEvents.value : []),
    ];
    
    // Filter to only games that are live (started but not finished)
    const now = new Date();
    const liveEvents = allEvents.filter(event => {
      const commenceTime = new Date(event.commence_time);
      // Consider a game "live" if it started within the last 4 hours
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      return commenceTime >= fourHoursAgo && commenceTime <= now;
    });
    
    logger.info(`Found ${liveEvents.length} live events out of ${allEvents.length} total`);
    return liveEvents;
  },
  ['odds-api-live-games'],
  {
    revalidate: 30,
    tags: ['live-games'],
  }
);

export async function GET() {
  return withErrorHandling(async () => {
    try {
      const events = await getCachedLiveGames();
      const games = transformOddsApiEvents(events);
      const parsed = z.array(GameSchema).parse(games);
      
      logger.info(`Returning ${parsed.length} live games`);
      return successResponse(parsed);
    } catch (error) {
      if (error instanceof OddsApiError) {
        logger.error('The Odds API error in live games', error);
        
        if (error.statusCode === 429) {
          return ApiErrors.serviceUnavailable(
            'The Odds API usage quota has been exceeded. Please contact support or try again later.'
          );
        }
        
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
