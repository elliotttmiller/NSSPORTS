/**
 * Matches API Route Handler
 * 
 * Backend for Frontend (BFF) Proxy Pattern:
 * - Fetches live data from The Odds API
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
import { unstable_cache } from "next/cache";
import {
  withErrorHandling,
  ApiErrors,
  successResponse,
} from "@/lib/apiResponse";
import { getOdds, OddsApiError } from "@/lib/the-odds-api";
import { transformOddsApiEvents } from "@/lib/transformers/odds-api";
import { GameSchema } from "@/lib/schemas/game";
import { logger } from "@/lib/logger";

// Cache duration: 60 seconds for live odds data
// This balances data freshness with API quota usage
const CACHE_DURATION_SECONDS = 60;

// Query parameters schema
const QuerySchema = z.object({
  sport: z
    .enum(["basketball_nba", "americanfootball_nfl", "icehockey_nhl"])
    .default("basketball_nba"),
});

/**
 * Cached function to fetch odds from The Odds API
 * Uses Next.js unstable_cache for server-side caching
 */
const getCachedOdds = unstable_cache(
  async (sportKey: string) => {
    logger.info(`Fetching live odds for ${sportKey}`);
    
    try {
      const events = await getOdds(sportKey, {
        regions: "us",
        markets: "h2h,spreads,totals",
        oddsFormat: "american",
      });
      
      logger.info(`Fetched ${events.length} events for ${sportKey}`);
      return events;
    } catch (error) {
      logger.error("Error fetching odds from The Odds API", error);
      throw error;
    }
  },
  ["odds-api-matches"],
  {
    revalidate: CACHE_DURATION_SECONDS,
    tags: ["matches"],
  }
);

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
      // Fetch odds with caching
      const events = await getCachedOdds(sport);

      // Transform to our internal format
      const games = transformOddsApiEvents(events);

      // Validate transformed data
      const validatedGames = games.map((game) => GameSchema.parse(game));

      logger.info(`Returning ${validatedGames.length} matches for ${sport}`);

      return successResponse(
        validatedGames,
        200,
        {
          sport,
          count: validatedGames.length,
          cached: true,
          cacheDuration: CACHE_DURATION_SECONDS,
        }
      );
    } catch (error) {
      // Handle specific API errors
      if (error instanceof OddsApiError) {
        logger.error("The Odds API error", error);
        
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
