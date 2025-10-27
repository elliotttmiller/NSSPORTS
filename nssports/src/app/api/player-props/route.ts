import { NextRequest } from 'next/server';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getPlayerProps, SportsGameOddsApiError } from '@/lib/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { unstable_cache } from 'next/cache';

export const revalidate = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cached function to fetch player props for a specific event
 */
const getCachedPlayerProps = unstable_cache(
  async (eventId: string) => {
    logger.info(`Fetching player props for event ${eventId} from SDK`);
    
    try {
      const props = await getPlayerProps(eventId);
      logger.info(`Fetched ${props.length} player props for event ${eventId}`);
      return props;
    } catch (error) {
      logger.error(`Error fetching player props for event ${eventId}`, error);
      throw error;
    }
  },
  ['sportsgameodds-sdk-player-props'],
  {
    revalidate: 30,
    tags: ['player-props'],
  }
);

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return ApiErrors.badRequest('gameId query parameter is required');
    }

    try {
      const playerProps = await getCachedPlayerProps(gameId);

      // Transform to frontend format
      const transformed = playerProps.map((prop) => ({
        id: prop.propID,
        playerId: prop.player.playerID,
        playerName: prop.player.name,
        position: prop.player.position || 'N/A',
        team: prop.player.teamID || 'unknown',
        statType: prop.propType,
        line: prop.line,
        overOdds: prop.overOdds,
        underOdds: prop.underOdds,
        category: prop.propType, // Group by prop type
        bookmaker: prop.bookmakerName,
      }));

      return successResponse(transformed);
    } catch (error) {
      if (error instanceof SportsGameOddsApiError) {
        logger.error('SportsGameOdds API error in player props', error);
        
        if (error.statusCode === 401 || error.statusCode === 403) {
          return ApiErrors.serviceUnavailable(
            'Sports data service is temporarily unavailable. Please check API configuration.'
          );
        }
        
        return ApiErrors.serviceUnavailable(
          'Unable to fetch player props at this time. Please try again later.'
        );
      }
      
      throw error;
    }
  });
}
