import { NextRequest } from 'next/server';
import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { paginatedResponseSchema } from '@/lib/schemas/pagination';
import { withErrorHandling, ApiErrors, successResponse } from '@/lib/apiResponse';
import { getEventsWithCache } from '@/lib/hybrid-cache';
import { transformSDKEvents } from '@/lib/transformers/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { applyStratifiedSampling } from '@/lib/devDataLimit';

export const revalidate = 120; // 2 minutes - matches hybrid cache TTL
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Fetch all games using hybrid SDK + Prisma cache (no unstable_cache wrapper needed)
 * The getEventsWithCache function already handles Prisma-level caching with TTL
 */
async function getCachedAllGames() {
  logger.info('Fetching all games from hybrid cache');
  
  // Define time range - FORWARD-LOOKING with wider window to find available games
  const now = new Date();
  const startsAfter = now; // Start from current time
  const startsBefore = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days ahead (2 weeks)
  
  // Development-friendly limits: fetch only what we need (3-5 games per league)
  const isDevelopment = process.env.NODE_ENV === 'development';
  const fetchLimit = isDevelopment ? 10 : 100; // Fetch more games in dev to find any available
  
  logger.info(`Searching for games from ${startsAfter.toISOString()} to ${startsBefore.toISOString()}`);
  
  // Fetch from multiple leagues in parallel
  // ⭐ SIMPLIFIED: Fetch ALL scheduled games, let streaming handle odds updates
  // Don't filter by oddsAvailable - games may not have odds yet but will stream when available
  const [nbaResult, nflResult, nhlResult] = await Promise.allSettled([
    getEventsWithCache({ 
      leagueID: 'NBA',
      startsAfter: startsAfter.toISOString(),
      startsBefore: startsBefore.toISOString(),
      limit: fetchLimit,
    }),
    getEventsWithCache({ 
      leagueID: 'NFL',
      startsAfter: startsAfter.toISOString(),
      startsBefore: startsBefore.toISOString(),
      limit: fetchLimit,
    }),
    getEventsWithCache({ 
      leagueID: 'NHL',
      startsAfter: startsAfter.toISOString(),
      startsBefore: startsBefore.toISOString(),
      limit: fetchLimit,
    }),
  ]);
  
  const allEvents = [
    ...(nbaResult.status === 'fulfilled' ? nbaResult.value.data : []),
    ...(nflResult.status === 'fulfilled' ? nflResult.value.data : []),
    ...(nhlResult.status === 'fulfilled' ? nhlResult.value.data : []),
  ];
  
  logger.info(`Fetched ${allEvents.length} total events from hybrid cache`);
  return allEvents;
}

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
      
      logger.info(`Raw events fetched: ${events.length}`);
      
      // Transform to internal format - handle empty array gracefully
      let games = events.length > 0 ? transformSDKEvents(events) : [];
      
      logger.info(`Transformed games: ${games.length}`);
      
      // Apply stratified sampling in development (Protocol I-IV)
      games = applyStratifiedSampling(games, 'leagueId');
      
      // Filter by leagueId if specified (case-insensitive)
      if (leagueId) {
        const normalizedLeagueId = leagueId.toUpperCase();
        games = games.filter(game => game.leagueId?.toUpperCase() === normalizedLeagueId);
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
            // Filter for finished games
            return game.status === 'finished';
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
      logger.error('Error in games route', error);
      
      // Return empty result instead of error to prevent UI blocking
      logger.warn('Returning empty game list due to error');
      const emptyPayload = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      
      return successResponse(emptyPayload, 200, undefined);
    }
  });
}
