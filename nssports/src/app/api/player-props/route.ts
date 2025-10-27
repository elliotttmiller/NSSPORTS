import { NextRequest } from 'next/server';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getPlayerPropsWithCache } from '@/lib/hybrid-cache';
import { logger } from '@/lib/logger';

export const revalidate = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return ApiErrors.badRequest('gameId query parameter is required');
    }

    try {
      logger.info(`Fetching player props for event ${gameId} using hybrid cache`);
      
      // Use hybrid cache (Prisma + SDK)
      const response = await getPlayerPropsWithCache(gameId);
      const playerProps = response.data;
      
      logger.info(`Fetched ${playerProps.length} player props for event ${gameId} (source: ${response.source})`);

      // Transform to frontend format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformed = playerProps.map((prop: any) => ({
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

      return successResponse(transformed, 200, { source: response.source });
    } catch (error) {
      logger.error('Error fetching player props', error);
      
      return ApiErrors.serviceUnavailable(
        'Unable to fetch player props at this time. Please try again later.'
      );
    }
  });
}
