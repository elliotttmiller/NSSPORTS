/**
 * Matches API Route Handler
 * 
 * Backend for Frontend (BFF) Proxy Pattern:
 * - Fetches live data from SportsGameOdds SDK
 * - Server-side caching to minimize API calls
 * - Data transformation to internal format
 * - Comprehensive error handling
 * 
 * Protocol I: Secure Abstraction - API key never exposed to client
 * Protocol III: Performance & Cost Consciousness - Aggressive caching
 * Protocol IV: Resilient Error Handling - Graceful degradation
 */

import { NextRequest } from "next/server";
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

// Map sport keys to league IDs
const SPORT_TO_LEAGUE_MAP: Record<string, string> = {
  "basketball_nba": "NBA",
  "americanfootball_nfl": "NFL",
  "icehockey_nhl": "NHL",
};

// Query parameters schema
const QuerySchema = z.object({
  sport: z
    .enum(["basketball_nba", "americanfootball_nfl", "icehockey_nhl"])
    .default("basketball_nba"),
});

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query parameters
    let sport: string;
    try {
      const query = QuerySchema.parse({
        sport: searchParams.get("sport") ?? undefined,
      });
      sport = query.sport;
    } catch (e) {
      if (e instanceof z.ZodError) {
        return ApiErrors.unprocessable("Invalid query parameters", e.errors);
      }
      throw e;
    }

    try {
      const leagueID = SPORT_TO_LEAGUE_MAP[sport] || "NBA";
      
      // Fetch events for the next 7 days and past 4 hours using hybrid cache
      const now = new Date();
      const startsAfter = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago
      const startsBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      logger.info(`Fetching events for ${sport} using hybrid cache`);
      
      // Use hybrid cache (checks Prisma first, then SDK)
      // CRITICAL: Must include oddID parameter to get betting lines!
      const response = await getEventsWithCache({
        leagueID,
        startsAfter: startsAfter.toISOString(),
        startsBefore: startsBefore.toISOString(),
        oddsAvailable: true,
        oddID: 'ml,sp,ou', // Abbreviated format: moneyline, spread, over/under
        limit: 100,
      });
      
      const events = response.data;
      logger.info(`Fetched ${events.length} events for ${sport} (source: ${response.source})`);

      // Transform to our internal format
      let games = transformSDKEvents(events);
      
      // Apply single league limit in development (Protocol I-IV)
      games = applySingleLeagueLimit(games);

      // Validate transformed data
      const validatedGames = games.map((game) => GameSchema.parse(game));

      logger.info(`Returning ${validatedGames.length} matches for ${sport}`);

      return successResponse(
        validatedGames,
        200,
        {
          sport,
          count: validatedGames.length,
          source: response.source,
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
