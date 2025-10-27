import { NextRequest } from 'next/server';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getGamePropsWithCache } from '@/lib/hybrid-cache';
import { logger } from '@/lib/logger';

export const revalidate = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
      logger.info(`Fetching game props for event ${eventId} using hybrid cache`);
      
      // Use hybrid cache (Prisma + SDK) directly
      const response = await getGamePropsWithCache(eventId);
      const gameProps = response.data;
      
      logger.info(`Fetched ${gameProps.length} game prop markets for event ${eventId} (source: ${response.source})`);

      // Group by propType for easier display - ensuring real-time SDK data
      // The new extractGameProps returns markets with outcomes already structured
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grouped = gameProps.reduce((acc: Record<string, any[]>, market: any) => {
        const propType = market.propType || market.marketType;
        if (!acc[propType]) {
          acc[propType] = [];
        }
        
        // Add the entire market with its outcomes
        acc[propType].push({
          id: market.id || market.marketID,
          marketID: market.marketID,
          marketCategory: market.marketCategory,
          propType: market.propType,
          outcomes: market.outcomes,
        });
        
        return acc;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, {} as Record<string, any[]>);

      return successResponse(grouped, 200, { source: response.source });
    } catch (error) {
      logger.error('Error fetching event game props', error);
      
      return ApiErrors.serviceUnavailable(
        'Unable to fetch game props at this time. Please try again later.'
      );
    }
  });
}
