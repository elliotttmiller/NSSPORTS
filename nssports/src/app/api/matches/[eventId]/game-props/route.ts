import { NextRequest } from 'next/server';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getGameProps, SportsGameOddsApiError } from '@/lib/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { unstable_cache } from 'next/cache';

export const revalidate = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cached function to fetch game props for a specific event from SDK
 */
const getCachedGameProps = unstable_cache(
  async (eventId: string) => {
    logger.info(`Fetching game props for event ${eventId} from SDK`);
    
    try {
      const props = await getGameProps(eventId);
      logger.info(`Fetched ${props.length} game props for event ${eventId}`);
      return props;
    } catch (error) {
      logger.error(`Error fetching game props for event ${eventId}`, error);
      throw error;
    }
  },
  ['sportsgameodds-sdk-event-game-props'],
  {
    revalidate: 30,
    tags: ['event-game-props'],
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withErrorHandling(async () => {
    const { eventId } = await params;

    if (!eventId) {
      return ApiErrors.badRequest('eventId parameter is required');
    }

    try {
      const gameProps = await getCachedGameProps(eventId);

      // Group by propType for easier display - ensuring real-time SDK data
      const grouped = gameProps.reduce((acc: Record<string, any[]>, market) => {
        const propType = market.marketType;
        if (!acc[propType]) {
          acc[propType] = [];
        }
        
        // Add each outcome as a separate prop
        market.outcomes.forEach((outcome: any) => {
          acc[propType].push({
            id: market.marketID,
            propType: market.marketType,
            description: outcome.name,
            selection: outcome.name,
            odds: outcome.price,
            line: outcome.point,
            bookmaker: market.bookmakerName,
          });
        });
        
        return acc;
      }, {} as Record<string, any[]>);

      return successResponse(grouped);
    } catch (error) {
      if (error instanceof SportsGameOddsApiError) {
        logger.error('SportsGameOdds API error in event game props', error);
        
        if (error.statusCode === 401 || error.statusCode === 403) {
          return ApiErrors.serviceUnavailable(
            'Sports data service is temporarily unavailable. Please check API configuration.'
          );
        }
        
        return ApiErrors.serviceUnavailable(
          'Unable to fetch game props at this time. Please try again later.'
          );
      }
      
      throw error;
    }
  });
}
