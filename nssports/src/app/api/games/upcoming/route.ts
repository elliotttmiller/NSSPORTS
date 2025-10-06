import { NextResponse } from 'next/server';
import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getOdds, OddsApiError } from '@/lib/the-odds-api';
import { transformOddsApiEvents } from '@/lib/transformers/odds-api';
import { logger } from '@/lib/logger';
import { unstable_cache } from 'next/cache';

export const revalidate = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cached function to fetch upcoming games from The Odds API
 */
const getCachedUpcomingGames = unstable_cache(
  async () => {
    logger.info('Fetching upcoming games from The Odds API');
    
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
    
    // Filter to only upcoming games (not yet started)
    const now = new Date();
    const upcomingEvents = allEvents.filter(event => {
      const commenceTime = new Date(event.commence_time);
      return commenceTime > now;
    });
    
    // Sort by start time and limit to 20
    upcomingEvents.sort((a, b) => 
      new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
    );
    
    logger.info(`Found ${upcomingEvents.length} upcoming events out of ${allEvents.length} total`);
    return upcomingEvents.slice(0, 20);
  },
  ['odds-api-upcoming-games'],
  {
    revalidate: 60,
    tags: ['upcoming-games'],
  }
);

export async function GET() {
  return withErrorHandling(async () => {
    try {
      const events = await getCachedUpcomingGames();
      const games = transformOddsApiEvents(events);
      const parsed = z.array(GameSchema).parse(games);
      
      logger.info(`Returning ${parsed.length} upcoming games`);
      return successResponse(parsed);
    } catch (error) {
      if (error instanceof OddsApiError) {
        logger.error('The Odds API error in upcoming games', error);
        
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
