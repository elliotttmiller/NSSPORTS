import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getEvents, SportsGameOddsApiError } from '@/lib/sportsgameodds-api';
import { transformSportsGameOddsEvents } from '@/lib/transformers/sportsgameodds-api';
import { logger } from '@/lib/logger';
import { unstable_cache } from 'next/cache';
import { applySingleLeagueLimit } from '@/lib/devDataLimit';

export const revalidate = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Map internal league IDs to SportsGameOdds league IDs
 */
const LEAGUE_ID_TO_API: Record<string, string> = {
  'nba': 'NBA',
  'nfl': 'NFL',
  'nhl': 'NHL',
};

/**
 * Cached function to fetch games for a specific league
 */
const getCachedLeagueGames = unstable_cache(
  async (leagueId: string) => {
    logger.info(`Fetching games for league ${leagueId} from SportsGameOdds API`);
    
    const apiLeagueId = LEAGUE_ID_TO_API[leagueId.toLowerCase()] || leagueId.toUpperCase();
    
    // Define time range
    const now = new Date();
    const startsAfter = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago
    const startsBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    try {
      const { data: events } = await getEvents(apiLeagueId, {
        startsAfter: startsAfter.toISOString(),
        startsBefore: startsBefore.toISOString(),
        limit: 100,
      });
      
      logger.info(`Fetched ${events.length} events for league ${leagueId}`);
      return events;
    } catch (error) {
      logger.error(`Error fetching games for league ${leagueId}`, error);
      throw error;
    }
  },
  ['sportsgameodds-league-games'],
  {
    revalidate: 30,
    tags: ['league-games'],
  }
);

export async function GET(
  request: Request,
  context: { params: Promise<{ leagueId: string }> }
) {
  return withErrorHandling(async () => {
    const { leagueId } = await context.params;

    try {
      const events = await getCachedLeagueGames(leagueId);
      
      // Transform and apply development limit (Protocol I-IV)
      let transformedGames = transformSportsGameOddsEvents(events);
      transformedGames = applySingleLeagueLimit(transformedGames);
      
      const parsed = z.array(GameSchema).parse(transformedGames);
      
      logger.info(`Returning ${parsed.length} games for league ${leagueId}`);
      return successResponse(parsed);
    } catch (error) {
      if (error instanceof SportsGameOddsApiError) {
        logger.error(`SportsGameOdds API error for league ${leagueId}`, error);
        
        if (error.statusCode === 401 || error.statusCode === 403) {
          return ApiErrors.serviceUnavailable(
            'Sports data service is temporarily unavailable. Please check API configuration.'
          );
        }
        
        return ApiErrors.serviceUnavailable(
          'Unable to fetch league data at this time. Please try again later.'
        );
      }
      
      throw error;
    }
  });
}
