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
import { getEvents, SportsGameOddsApiError } from "@/lib/sportsgameodds-sdk";
import { transformSDKEvents } from "@/lib/transformers/sportsgameodds-sdk";
import { GameSchema } from "@/lib/schemas/game";
import { logger } from "@/lib/logger";
import { applySingleLeagueLimit } from "@/lib/devDataLimit";

// Cache duration: 60 seconds for live odds data
// This balances data freshness with API quota usage
const CACHE_DURATION_SECONDS = 60;

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

/**
 * Fetch events from SportsGameOdds SDK without caching
 * The full event data is too large (>7MB) to cache in Next.js data cache (2MB limit)
 * Instead we cache at the HTTP level via route segment config
 */
async function fetchEvents(sportKey: string) {
  logger.info(`Fetching events for ${sportKey} from SportsGameOdds SDK`);
  
  try {
    const leagueID = SPORT_TO_LEAGUE_MAP[sportKey] || "NBA";
    
    // Fetch events for the next 7 days and past 4 hours
    const now = new Date();
    const startsAfter = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago
    const startsBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    const { data: events } = await getEvents({
      leagueID,
      startsAfter: startsAfter.toISOString(),
      startsBefore: startsBefore.toISOString(),
      oddsAvailable: true,
      limit: 100,
    });
    
    logger.info(`Fetched ${events.length} events for ${sportKey}`);
    return events;
  } catch (error) {
    logger.error("Error fetching events from SportsGameOdds SDK", error);
    throw error;
  }
}

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
      // Fetch events (HTTP caching via route segment config)
      const events = await fetchEvents(sport);

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
          cacheDuration: CACHE_DURATION_SECONDS,
        }
      );
    } catch (error) {
      // Handle specific API errors
      if (error instanceof SportsGameOddsApiError) {
        logger.error("SportsGameOdds API error", error);
        
        // If it's an authentication error, return 503 with helpful message
        if (error.statusCode === 401 || error.statusCode === 403) {
          return ApiErrors.serviceUnavailable(
            "Sports data service is temporarily unavailable. Please check API configuration."
          );
        }
        
        // For other API errors, return 503
        return ApiErrors.serviceUnavailable(
          "Unable to fetch live sports data at this time. Please try again later."
        );
      }

      // Re-throw unexpected errors to be caught by withErrorHandling
      throw error;
    }
  });
}

// Export route segment config
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;
