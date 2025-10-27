import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getEventsWithCache } from '@/lib/hybrid-cache';
import { transformSDKEvents } from '@/lib/transformers/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { applySingleLeagueLimit } from '@/lib/devDataLimit';

export const revalidate = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Map internal/URL league IDs to SportsGameOdds SDK league IDs
 * Allows lowercase URLs (nba, nfl, nhl) to map to SDK format (NBA, NFL, NHL)
 */
const LEAGUE_ID_TO_API: Record<string, string> = {
  'nba': 'NBA',
  'nfl': 'NFL',
  'nhl': 'NHL',
  'NBA': 'NBA', // Also accept uppercase
  'NFL': 'NFL',
  'NHL': 'NHL',
};

export async function GET(
  request: Request,
  context: { params: Promise<{ leagueId: string }> }
) {
  return withErrorHandling(async () => {
    const { leagueId } = await context.params;

    try {
      logger.info(`Fetching games for league ${leagueId} using hybrid cache`);
      
      // Map league ID to SDK format (NBA, NFL, NHL)
      const apiLeagueId = LEAGUE_ID_TO_API[leagueId] || leagueId.toUpperCase();
      
      // Define time range
      const now = new Date();
      const startsAfter = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago
      const startsBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      // Use hybrid cache (Prisma + SDK)
      // CRITICAL: Must include oddID parameter to get betting lines!
      const response = await getEventsWithCache({
        leagueID: apiLeagueId,
        startsAfter: startsAfter.toISOString(),
        startsBefore: startsBefore.toISOString(),
        oddsAvailable: true,
        oddID: 'ml,sp,ou', // Abbreviated format: moneyline, spread, over/under
        limit: 100,
      });
      
      const events = response.data;
      logger.info(`Fetched ${events.length} events for league ${leagueId} (source: ${response.source})`);
      
      // Transform and apply development limit (Protocol I-IV)
      let transformedGames = transformSDKEvents(events);
      transformedGames = applySingleLeagueLimit(transformedGames);
      
      const parsed = z.array(GameSchema).parse(transformedGames);
      
      logger.info(`Returning ${parsed.length} games for league ${leagueId}`);
      return successResponse(parsed, 200, { source: response.source });
    } catch (error) {
      logger.error(`Error fetching games for league ${leagueId}`, error);
      
      return ApiErrors.serviceUnavailable(
        'Unable to fetch league data at this time. Please try again later.'
      );
    }
  });
}
