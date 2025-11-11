/**
 * Matches API Route Handler
 * 
 * Backend for Frontend (BFF) Proxy Pattern:
 * - Fetches live data from SportsGameOdds SDK
 * - Server-side caching to minimize API calls
 * - Data transformation to internal format
 * - Comprehensive error handling
 * - **REQUIRES AUTHENTICATION** - Only authenticated users can access
 * 
 * Protocol I: Secure Abstraction - API key never exposed to client
 * Protocol III: Performance & Cost Consciousness - Aggressive caching
 * Protocol IV: Resilient Error Handling - Graceful degradation
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  withErrorHandling,
  ApiErrors,
  successResponse,
} from "@/lib/apiResponse";
import { getEventsWithCache } from "@/lib/hybrid-cache";
import { transformSDKEvents } from "@/lib/transformers/sportsgameodds-sdk";
import { GameSchema } from "@/lib/schemas/game";
import { logger } from "@/lib/logger";
import { applySingleLeagueLimit } from "@/lib/devDataLimit";
import type { ExtendedSDKEvent } from "@/lib/transformers/sportsgameodds-sdk";

// Map sport keys to league IDs
const SPORT_TO_LEAGUE_MAP: Record<string, string> = {
  "basketball_nba": "NBA",
  "basketball_ncaab": "NCAAB",
  "americanfootball_nfl": "NFL",
  "americanfootball_ncaaf": "NCAAF",
  "icehockey_nhl": "NHL",
};

// Query parameters schema
const QuerySchema = z.object({
  sport: z
    .enum(["basketball_nba", "basketball_ncaab", "americanfootball_nfl", "americanfootball_ncaaf", "icehockey_nhl"])
    .default("basketball_nba"),
  lines: z
    .enum(["main", "all"])
    .default("main")
    .describe("main = moneyline/spread/total only (60-80% smaller), all = include props"),
});

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    // ⚠️ CRITICAL: Authenticate user BEFORE fetching expensive data
    const session = await auth();
    
    if (!session || !session.user) {
      logger.warn('[API /matches] Unauthorized access attempt - no session');
      throw ApiErrors.unauthorized('You must be logged in to access game data');
    }

    logger.info(`[API /matches] Authenticated user ${session.user.email} requesting matches`);
    
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query parameters
    let sport: string;
    let lines: "main" | "all";
    try {
      const query = QuerySchema.parse({
        sport: searchParams.get("sport") ?? undefined,
        lines: searchParams.get("lines") ?? undefined,
      });
      sport = query.sport;
      lines = query.lines;
    } catch (e) {
      if (e instanceof z.ZodError) {
        return ApiErrors.unprocessable("Invalid query parameters", e.errors);
      }
      throw e;
    }

    try {
      const leagueID = SPORT_TO_LEAGUE_MAP[sport] || "NBA";
      
      // ⭐ CRITICAL OPTIMIZATION: Separate LIVE vs UPCOMING games
      // Official SDK Method: Use live=true for in-progress games, finalized=false for not finished
      // FORWARD-LOOKING: Wider window to find available games (14 days)
      const now = new Date();
      const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days ahead
      
      logger.info(`Fetching events for ${sport} (lines=${lines}) using hybrid cache with live/upcoming separation`);
      
      // Query 1: LIVE GAMES (in-progress, need real-time updates via WebSocket)
      // Official SDK Parameter: live=true returns only games that have started but not finished
      const liveGamesResponse = await getEventsWithCache({
        leagueID,
        live: true,                     // ✅ OFFICIAL: Only in-progress games
        finalized: false,               // ✅ OFFICIAL: Exclude finished games
        includeConsensus: true,         // ✅ CRITICAL: Request bookOdds calculations
        limit: 50,
      });
      
      // Query 2: UPCOMING GAMES (not started yet, can use longer cache TTL)
      // Official SDK Pattern: Not live, not finalized, future start times only
      // FORWARD-LOOKING: From now to 14 days ahead (wider window to find games)
      const upcomingGamesResponse = await getEventsWithCache({
        leagueID,
        finalized: false,                          // ✅ OFFICIAL: Not finished
        startsAfter: now.toISOString(),           // ✅ From current time forward
        startsBefore: fourteenDaysFromNow.toISOString(), // ✅ Max 14 days ahead
        includeConsensus: true,                   // ✅ CRITICAL: Request bookOdds calculations
        limit: 100,
      });
      
      // Combine results, with live games first (priority for UI)
      const liveEvents = liveGamesResponse.data;
      const upcomingEvents = upcomingGamesResponse.data;
      const events = [...liveEvents, ...upcomingEvents];
      
      logger.info(`Fetched ${liveEvents.length} LIVE and ${upcomingEvents.length} UPCOMING events for ${sport}`, {
        liveSource: liveGamesResponse.source,
        upcomingSource: upcomingGamesResponse.source,
      });

      // Transform to our internal format
      // Events from cache/SDK match ExtendedSDKEvent structure
      let games = await transformSDKEvents(events as ExtendedSDKEvent[]);
      
      // Apply single league limit in development (Protocol I-IV)
      games = applySingleLeagueLimit(games);

      // Validate transformed data
      const validatedGames = games.map((game) => GameSchema.parse(game));

      // Separate for metadata
      const liveGamesCount = validatedGames.filter(g => g.status === 'live').length;
      const upcomingGamesCount = validatedGames.filter(g => g.status === 'upcoming').length;

      logger.info(`Returning ${validatedGames.length} matches: ${liveGamesCount} live, ${upcomingGamesCount} upcoming (lines=${lines})`);

      return successResponse(
        validatedGames,
        200,
        {
          sport,
          lines,
          count: validatedGames.length,
          liveGames: liveGamesCount,
          upcomingGames: upcomingGamesCount,
          optimization: lines === 'main' ? 'Payload reduced by ~60-80%' : 'Full odds data',
          liveSource: liveGamesResponse.source,
          upcomingSource: upcomingGamesResponse.source,
        }
      );
    } catch (error) {
      logger.error("Error fetching matches", error);
      
      // Return 503 for any service errors
      return ApiErrors.serviceUnavailable(
        "Unable to fetch live sports data at this time. Please try again later."
      );
    }
  });
}

// Export route segment config
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 30;
