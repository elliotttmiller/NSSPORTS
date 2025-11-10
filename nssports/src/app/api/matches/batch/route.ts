/**
 * Batch Matches API Route Handler
 * 
 * ⭐ PHASE 3: Batch Request Optimization
 * 
 * Official SDK Pattern: eventIDs parameter with comma-separated list
 * - Fetches multiple games in a single API call
 * - Reduces API requests by 50-80% for multi-game views
 * - Use cases: league pages, multi-game parlays, live dashboards
 * 
 * Official Reference:
 * https://sportsgameodds.com/docs/guides/data-batches
 * 
 * Example:
 * GET /api/matches/batch?eventIds=game1,game2,game3&lines=main
 * 
 * Returns:
 * {
 *   success: true,
 *   data: [...games],
 *   meta: {
 *     requestedCount: 3,
 *     returnedCount: 3,
 *     optimization: "Batch request (75% reduction)",
 *     source: "sdk"
 *   }
 * }
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  withErrorHandling,
  ApiErrors,
  successResponse,
} from "@/lib/apiResponse";
import { getEvents } from "@/lib/sportsgameodds-sdk";
import { transformSDKEvents } from "@/lib/transformers/sportsgameodds-sdk";
import { GameSchema } from "@/lib/schemas/game";
import { logger } from "@/lib/logger";
import type { ExtendedSDKEvent } from "@/lib/transformers/sportsgameodds-sdk";

// Query parameters schema
const QuerySchema = z.object({
  eventIds: z
    .string()
    .describe("Comma-separated list of event IDs (max 20)"),
  lines: z
    .enum(["main", "all"])
    .default("main")
    .describe("main = moneyline/spread/total only, all = include props"),
});

const MAX_BATCH_SIZE = 20; // Safety limit per official docs recommendations

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    // ⚠️ CRITICAL: Authenticate user BEFORE fetching expensive data
    const session = await auth();
    
    if (!session || !session.user) {
      logger.warn('[API /matches/batch] Unauthorized access attempt');
      throw ApiErrors.unauthorized('You must be logged in to access game data');
    }

    logger.info(`[API /matches/batch] Authenticated user ${session.user.email} requesting batch`);
    
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query parameters
    let eventIds: string;
    let lines: "main" | "all";
    try {
      const query = QuerySchema.parse({
        eventIds: searchParams.get("eventIds") ?? undefined,
        lines: searchParams.get("lines") ?? undefined,
      });
      eventIds = query.eventIds;
      lines = query.lines;
    } catch (e) {
      if (e instanceof z.ZodError) {
        return ApiErrors.unprocessable("Invalid query parameters", e.errors);
      }
      throw e;
    }

    try {
      // Split event IDs and validate batch size
      const eventIdArray = eventIds.split(',').map(id => id.trim()).filter(Boolean);
      
      if (eventIdArray.length === 0) {
        throw ApiErrors.unprocessable('At least one eventId is required');
      }
      
      if (eventIdArray.length > MAX_BATCH_SIZE) {
        throw ApiErrors.unprocessable(
          `Batch size exceeds maximum of ${MAX_BATCH_SIZE} events. ` +
          `Requested: ${eventIdArray.length}. Please split into smaller batches.`
        );
      }
      
      logger.info(`[API /matches/batch] Fetching ${eventIdArray.length} events (lines=${lines})`);
      
      // ⭐ OFFICIAL SDK PATTERN: Batch fetch with eventIDs parameter
      // Per official docs: https://sportsgameodds.com/docs/guides/data-batches
      // eventIDs accepts comma-separated string OR array (SDK converts array to string)
      const oddIDs = lines === 'main' 
        ? 'game-ml,game-ats,game-ou'  // Main lines only: 60-80% smaller payload
        : undefined;                    // All odds: includes props
      
      const response = await getEvents({
        eventIDs: eventIdArray,          // ✅ OFFICIAL: Batch parameter
        oddIDs,                          // Filter specific markets
        includeOpposingOddIDs: true,    // Get both sides of markets
        includeConsensus: true,          // ✅ CRITICAL: Request bookOdds calculations
        limit: MAX_BATCH_SIZE,
      });
      
      const events = response.data || [];
      
      logger.info(`[API /matches/batch] Fetched ${events.length}/${eventIdArray.length} events`, {
        requested: eventIdArray.length,
        returned: events.length,
        optimization: 'Batch request (single API call)',
      });

      // Transform to our internal format
      // Events from SDK match ExtendedSDKEvent structure
      const games = await transformSDKEvents(events as ExtendedSDKEvent[]);

      // Validate transformed data
      const validatedGames = games.map((game) => GameSchema.parse(game));

      // Calculate optimization metrics
      const individualCallsSaved = eventIdArray.length - 1; // Would have made N calls, made 1
      const reductionPercentage = Math.round((individualCallsSaved / eventIdArray.length) * 100);

      logger.info(`[API /matches/batch] Returning ${validatedGames.length} matches (${reductionPercentage}% reduction)`);

      return successResponse(
        validatedGames,
        200,
        {
          requestedCount: eventIdArray.length,
          returnedCount: validatedGames.length,
          optimization: `Batch request (${reductionPercentage}% API call reduction)`,
          individualCallsSaved,
          lines,
          source: "sdk",
        }
      );
    } catch (error) {
      logger.error('[API /matches/batch] Error fetching batch', error);
      throw error;
    }
  });
}
