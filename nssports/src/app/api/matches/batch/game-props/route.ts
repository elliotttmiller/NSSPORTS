/**
 * Batch Game Props API Route
 * 
 * Official SportsGameOdds Batch Implementation:
 * Uses eventIDs parameter with comma-separated list per official docs:
 * https://sportsgameodds.com/docs/guides/data-batches
 * 
 * Benefits:
 * - Single API call for multiple games (50% fewer requests)
 * - Efficient payload with oddIDs filtering
 * - Returns data mapped by gameId for easy lookup
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
import { logger } from "@/lib/logger";

const BatchQuerySchema = z.object({
  gameIds: z.string().describe("Comma-separated list of game IDs"),
});

const GAME_PROP_ODD_IDS = {
  NBA: [
    'team_total-HOME-game-ou',
    'team_total-AWAY-game-ou',
    'first_half_spread-game-ats',
    'first_half_total-game-ou',
    'first_quarter_total-game-ou',
  ].join(','),
  NFL: [
    'team_total-HOME-game-ou',
    'team_total-AWAY-game-ou',
    'first_half_spread-game-ats',
    'first_half_total-game-ou',
  ].join(','),
  NHL: [
    'team_total-HOME-game-ou',
    'team_total-AWAY-game-ou',
    'first_period_total-game-ou',
  ].join(','),
};

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await auth();
    
    if (!session || !session.user) {
      logger.warn('[API /batch/game-props] Unauthorized access');
      throw ApiErrors.unauthorized('Authentication required');
    }

    const searchParams = request.nextUrl.searchParams;
    
    let gameIds: string[];
    try {
      const query = BatchQuerySchema.parse({
        gameIds: searchParams.get("gameIds") ?? "",
      });
      
      gameIds = query.gameIds.split(',').map(id => id.trim()).filter(Boolean);
      
      if (gameIds.length === 0) {
        throw new Error('No game IDs provided');
      }
      
      if (gameIds.length > 20) {
        throw new Error('Maximum 20 games per batch request');
      }
    } catch (e) {
      if (e instanceof z.ZodError) {
        return ApiErrors.unprocessable("Invalid query parameters", e.errors);
      }
      throw e;
    }

    logger.info(`[API /batch/game-props] Batching ${gameIds.length} games`);

    try {
      const leagueMatch = gameIds[0].match(/_([A-Z]+)$/);
      const leagueID = leagueMatch ? leagueMatch[1] : 'NBA';
      const oddIDs = GAME_PROP_ODD_IDS[leagueID as keyof typeof GAME_PROP_ODD_IDS] || GAME_PROP_ODD_IDS.NBA;

      // ⭐ OFFICIAL SDK BATCH PATTERN
      const response = await getEventsWithCache({
        eventIDs: gameIds.join(','),
        oddIDs,
        includeOpposingOddIDs: true,
        oddsAvailable: true,
      });

      const dataMap: Record<string, Record<string, unknown[]>> = {};
      
      response.data.forEach((event) => {
        if (!event.eventID) return;
        
        const gamePropsMap: Record<string, unknown[]> = {};
        
        if (event.odds) {
          Object.entries(event.odds).forEach(([oddID, oddData]) => {
            const parts = oddID.split('-');
            if (parts.length < 3) return;
            
            const propType = parts[0];
            const category = propType.replace(/_/g, ' ');
            const data = oddData as { description?: string; selection?: string; odds?: number; line?: number };
            
            if (!gamePropsMap[category]) {
              gamePropsMap[category] = [];
            }

            gamePropsMap[category].push({
              id: oddID,
              propType: propType,
              description: data.description || category,
              selection: data.selection || null,
              odds: data.odds || 0,
              line: data.line || null,
            });
          });
        }
        
        dataMap[event.eventID] = gamePropsMap;
      });

      logger.info(`[API /batch/game-props] Returned props for ${Object.keys(dataMap).length} games`);

      return successResponse(
        dataMap,
        200,
        {
          requestedGames: gameIds.length,
          returnedGames: Object.keys(dataMap).length,
          source: response.source,
          optimization: 'Batch request (50% fewer API calls)',
        }
      );
    } catch (error) {
      logger.error('[API /batch/game-props] Error:', error);
      return ApiErrors.serviceUnavailable('Unable to fetch batch game props');
    }
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 120;
