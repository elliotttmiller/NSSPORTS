import { NextRequest } from 'next/server';
import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { paginatedResponseSchema } from '@/lib/schemas/pagination';
import { withErrorHandling, ApiErrors, successResponse } from '@/lib/apiResponse';
import { getEventsWithCache } from '@/lib/hybrid-cache';
import { transformSDKEvents } from '@/lib/transformers/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { applyStratifiedSampling } from '@/lib/devDataLimit';
import { MAIN_LINE_ODDIDS } from '@/lib/sportsgameodds-sdk';
import type { ExtendedSDKEvent } from '@/lib/transformers/sportsgameodds-sdk';

export const revalidate = 120; // 2 minutes - matches hybrid cache TTL
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Fetch all games using hybrid SDK + Prisma cache (no unstable_cache wrapper needed)
 * The getEventsWithCache function already handles Prisma-level caching with TTL
 */
async function getCachedAllGames() {
  logger.info('[/api/games] Fetching all games (live + upcoming) from hybrid cache');
  
  // Define time range - look back 6 hours to catch live games that started earlier today
  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000); // Look back 6 hours
  const startsAfter = sixHoursAgo; // Include games that started up to 6 hours ago (live games)
  const startsBefore = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days ahead (2 weeks)
  
  // API limit: Maximum 100 games per request (enforced by SportsGameOdds API)
  const fetchLimit = 100; // Maximum allowed by API
  
  logger.info(`Searching for games from ${startsAfter.toISOString()} to ${startsBefore.toISOString()}`);
  
  // ⭐ OFFICIAL SDK METHOD: Use `finalized: false` to get both live AND upcoming games
  // Per official docs: https://sportsgameodds.com/docs/sdk#filtering-and-query-parameters
  // - finalized: false → Exclude finished games (includes both live and upcoming)
  // - oddIDs: Official market IDs (reduces payload 50-90%)
  // - includeOpposingOddIDs: true → Get both sides automatically (home/away, over/under)
  // - includeConsensus: true → CRITICAL: Get bookOdds (real market consensus)
  // Note: NOT using `live` parameter here - we want both live AND upcoming
  const [nbaResult, ncaabResult, nflResult, ncaafResult, nhlResult] = await Promise.allSettled([
    getEventsWithCache({ 
      leagueID: 'NBA',
      finalized: false,                // ✅ OFFICIAL: Exclude finished (includes live + upcoming)
      startsAfter: startsAfter.toISOString(),
      startsBefore: startsBefore.toISOString(),
      oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only (ML, spread, total)
      includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
      includeConsensus: true,          // ✅ CRITICAL: Request bookOdds calculations
      limit: fetchLimit,
    }),
    getEventsWithCache({ 
      leagueID: 'NCAAB',
      finalized: false,                // ✅ OFFICIAL: Exclude finished (includes live + upcoming)
      startsAfter: startsAfter.toISOString(),
      startsBefore: startsBefore.toISOString(),
      oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only (ML, spread, total)
      includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
      includeConsensus: true,          // ✅ CRITICAL: Request bookOdds calculations
      limit: fetchLimit,
    }),
    getEventsWithCache({ 
      leagueID: 'NFL',
      finalized: false,                // ✅ OFFICIAL: Exclude finished (includes live + upcoming)
      startsAfter: startsAfter.toISOString(),
      startsBefore: startsBefore.toISOString(),
      oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only
      includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
      includeConsensus: true,          // ✅ CRITICAL: Request bookOdds calculations
      limit: fetchLimit,
    }),
    getEventsWithCache({ 
      leagueID: 'NCAAF',
      finalized: false,                // ✅ OFFICIAL: Exclude finished (includes live + upcoming)
      startsAfter: startsAfter.toISOString(),
      startsBefore: startsBefore.toISOString(),
      oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only
      includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
      includeConsensus: true,          // ✅ CRITICAL: Request bookOdds calculations
      limit: fetchLimit,
    }),
    getEventsWithCache({ 
      leagueID: 'NHL',
      finalized: false,                // ✅ OFFICIAL: Exclude finished (includes live + upcoming)
      startsAfter: startsAfter.toISOString(),
      startsBefore: startsBefore.toISOString(),
      oddIDs: MAIN_LINE_ODDIDS,        // ✅ OFFICIAL: Main lines only
      includeOpposingOddIDs: true,     // ✅ OFFICIAL: Auto-include opposing sides
      includeConsensus: true,          // ✅ CRITICAL: Request bookOdds calculations
      limit: fetchLimit,
    }),
  ]);
  
  const nbaEvents = nbaResult.status === 'fulfilled' ? nbaResult.value.data : [];
  const ncaabEvents = ncaabResult.status === 'fulfilled' ? ncaabResult.value.data : [];
  const nflEvents = nflResult.status === 'fulfilled' ? nflResult.value.data : [];
  const ncaafEvents = ncaafResult.status === 'fulfilled' ? ncaafResult.value.data : [];
  const nhlEvents = nhlResult.status === 'fulfilled' ? nhlResult.value.data : [];
  
  const allEvents = [...nbaEvents, ...ncaabEvents, ...nflEvents, ...ncaafEvents, ...nhlEvents];
  
  logger.info(`Fetched ${allEvents.length} total events from hybrid cache`);
  logger.info(`Events by league - NBA: ${nbaEvents.length}, NCAAB: ${ncaabEvents.length}, NFL: ${nflEvents.length}, NCAAF: ${ncaafEvents.length}, NHL: ${nhlEvents.length}`);
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
      // Events from cache/SDK match ExtendedSDKEvent structure
      let games = events.length > 0 ? await transformSDKEvents(events as ExtendedSDKEvent[]) : [];
      
      logger.info(`Transformed games: ${games.length}`);
      
      // ⭐ CRITICAL: Filter out finished games UNLESS explicitly requested
      // Finished games should never be sent to frontend for display
      // They're only used internally to update game lists when games end
      if (status !== 'finished') {
        const beforeFilter = games.length;
        games = games.filter(game => game.status !== 'finished');
        logger.info(`Filtered out ${beforeFilter - games.length} finished games (only show upcoming + live)`);
      }
      
      // ⭐ CRITICAL: Additional time-based filter to catch historical data
      // This prevents games older than 12 hours from being displayed
      // Allows for status sync lag while filtering truly historical data
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const beforeHistoricalFilter = games.length;
      games = games.filter(game => {
        const gameTime = new Date(game.startTime);
        
        // ✅ Keep all upcoming games (even if start time passed - status sync may be delayed)
        if (game.status === 'upcoming') return true;
        
        // ✅ Keep live games if they started within last 12 hours (allows for long games)
        if (game.status === 'live' && gameTime > twelveHoursAgo) return true;
        
        // ❌ Filter out games that started more than 12 hours ago (historical data)
        // This catches games with stale status that should have finished by now
        return gameTime > twelveHoursAgo;
      });
      if (beforeHistoricalFilter > games.length) {
        logger.warn(`Filtered out ${beforeHistoricalFilter - games.length} historical games (older than 12 hours)`, {
          beforeFilter: beforeHistoricalFilter,
          afterFilter: games.length
        });
      }
      
      // Filter by leagueId FIRST if specified (case-insensitive)
      // This ensures sampling doesn't exclude the requested league
      if (leagueId) {
        const normalizedLeagueId = leagueId.toUpperCase();
        games = games.filter(game => game.leagueId?.toUpperCase() === normalizedLeagueId);
        logger.info(`Filtered to ${games.length} games for league: ${leagueId}`);
      }
      
      // Apply stratified sampling in development (Protocol I-IV)
      // Only applies to multi-league requests (no leagueId filter)
      games = applyStratifiedSampling(games, 'leagueId');
      
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
