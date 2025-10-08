import { NextRequest } from 'next/server';
import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { paginatedResponseSchema } from '@/lib/schemas/pagination';
import { withErrorHandling, ApiErrors, successResponse } from '@/lib/apiResponse';
import { getOdds, OddsApiError } from '@/lib/the-odds-api';
import { transformOddsApiEvents } from '@/lib/transformers/odds-api';
import { logger } from '@/lib/logger';
import { unstable_cache } from 'next/cache';

export const revalidate = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Map league IDs to sport keys
 */
const LEAGUE_ID_TO_SPORT_KEY: Record<string, string> = {
  nba: 'basketball_nba',
  nfl: 'americanfootball_nfl',
  nhl: 'icehockey_nhl',
};

/**
 * Cached function to fetch all games from The Odds API
 */
const getCachedAllGames = unstable_cache(
  async () => {
    logger.info('Fetching all games from The Odds API');
    
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
    
    logger.info(`Fetched ${allEvents.length} total events from The Odds API`);
    return allEvents;
  },
  ['odds-api-all-games'],
  {
    revalidate: 30,
    tags: ['all-games'],
  }
);

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const searchParams = request.nextUrl.searchParams;
    const QuerySchema = z.object({
      leagueId: z.string().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(10),
      status: z.enum(["upcoming", "live", "finished"]).optional(),
    });
    let leagueId: string | undefined;
    let page: number = 1;
    let limit: number = 10;
    let status: 'upcoming' | 'live' | 'finished' | undefined;
    try {
      ({ leagueId, page, limit, status } = QuerySchema.parse({
        leagueId: searchParams.get('leagueId') ?? undefined,
        page: searchParams.get('page') ?? undefined,
        limit: searchParams.get('limit') ?? undefined,
        status: searchParams.get('status') ?? undefined,
      }));
    } catch (e) {
      if (e instanceof z.ZodError) {
        return ApiErrors.unprocessable('Invalid query parameters', e.errors);
      }
      throw e;
    }

    try {
      // Fetch all games from cache
      const events = await getCachedAllGames();
      
      // Transform to internal format
      let games = transformOddsApiEvents(events);
      
      // Filter by leagueId if specified
      if (leagueId) {
        games = games.filter(game => game.leagueId === leagueId);
      }
      
      // Filter by status if specified
      if (status) {
        const now = new Date();
        games = games.filter(game => {
          if (status === 'upcoming') {
            return new Date(game.startTime) > now;
          } else if (status === 'live') {
            const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
            const startTime = new Date(game.startTime);
            return startTime >= fourHoursAgo && startTime <= now;
          } else if (status === 'finished') {
            // The Odds API doesn't provide finished games, return empty
            return false;
          }
          return true;
        });
      }
      
      // Sort by start time
      games.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      
      // Paginate
      const total = games.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedGames = games.slice(startIndex, startIndex + limit);

      // Validate transformed data
      const validatedGames = paginatedGames.map((game) => GameSchema.parse(game));

      const payload = {
        data: validatedGames,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };

      // Validate with Zod before returning
      const Schema = paginatedResponseSchema(GameSchema);
      const parsed = Schema.parse(payload);
      
      logger.info(`Returning page ${page} with ${validatedGames.length} games (total: ${total})`);
      return successResponse(parsed, 200, undefined);
    } catch (error) {
      if (error instanceof OddsApiError) {
        logger.error('The Odds API error in games', error);
        
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
          'Unable to fetch sports data at this time. Please try again later.'
        );
      }
      
      throw error;
    }
  });
}
