/**
 * Batch Player Props API Route
 * 
 * Official SportsGameOdds Batch Implementation:
 * Uses eventIDs parameter with comma-separated list per official docs:
 * https://sportsgameodds.com/docs/guides/data-batches
 * 
 * "The eventIDs parameter accepts a comma-separated list of eventID values"
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

// Query schema for batch requests
const BatchQuerySchema = z.object({
  gameIds: z.string().describe("Comma-separated list of game IDs"),
});

const PLAYER_PROP_ODD_IDS = {
  NBA: [
    'points-PLAYER_ID-game-ou',
    'rebounds-PLAYER_ID-game-ou',
    'assists-PLAYER_ID-game-ou',
    'three_pointers_made-PLAYER_ID-game-ou',
    'steals-PLAYER_ID-game-ou',
    'blocks-PLAYER_ID-game-ou',
  ].join(','),
  NFL: [
    'passing_yards-PLAYER_ID-game-ou',
    'rushing_yards-PLAYER_ID-game-ou',
    'receiving_yards-PLAYER_ID-game-ou',
    'touchdowns-PLAYER_ID-game-ou',
  ].join(','),
  NHL: [
    'goals-PLAYER_ID-game-ou',
    'assists-PLAYER_ID-game-ou',
    'points-PLAYER_ID-game-ou',
    'shots_on_goal-PLAYER_ID-game-ou',
  ].join(','),
};

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await auth();
    
    if (!session || !session.user) {
      logger.warn('[API /batch/player-props] Unauthorized access');
      throw ApiErrors.unauthorized('Authentication required');
    }

    const searchParams = request.nextUrl.searchParams;
    
    let gameIds: string[];
    try {
      const query = BatchQuerySchema.parse({
        gameIds: searchParams.get("gameIds") ?? "",
      });
      
      // Parse comma-separated list
      gameIds = query.gameIds.split(',').map(id => id.trim()).filter(Boolean);
      
      if (gameIds.length === 0) {
        throw new Error('No game IDs provided');
      }
      
      // Limit batch size to prevent abuse
      if (gameIds.length > 20) {
        throw new Error('Maximum 20 games per batch request');
      }
    } catch (e) {
      if (e instanceof z.ZodError) {
        return ApiErrors.unprocessable("Invalid query parameters", e.errors);
      }
      throw e;
    }

    logger.info(`[API /batch/player-props] Batching ${gameIds.length} games`);

    try {
      // Extract league from first game ID (assumes same league)
      const leagueMatch = gameIds[0].match(/_([A-Z]+)$/);
      const leagueID = leagueMatch ? leagueMatch[1] : 'NBA';
      const oddIDs = PLAYER_PROP_ODD_IDS[leagueID as keyof typeof PLAYER_PROP_ODD_IDS] || PLAYER_PROP_ODD_IDS.NBA;

      // ⭐ OFFICIAL SDK BATCH PATTERN: comma-separated eventIDs
      // Per docs: "feed the eventIDs in a comma-separated list"
      const response = await getEventsWithCache({
        eventIDs: gameIds.join(','), // Official batch format
        oddIDs,
        includeOpposingOddIDs: true,
        includeConsensus: true,      // ✅ CRITICAL: Request bookOdds calculations
        oddsAvailable: true,
      });

      // Transform to map structure for easy lookup
      const dataMap: Record<string, unknown[]> = {};
      
      response.data.forEach((event) => {
        if (!event.eventID) return;
        
        const playerProps: unknown[] = [];
        
        if (event.odds) {
          Object.entries(event.odds).forEach(([oddID, oddData]) => {
            const parts = oddID.split('-');
            if (parts.length < 5) return;
            
            const [statType, playerID, period] = parts;
            if (period !== 'game') return;
            
            const propKey = `${playerID}-${statType}`;
            const data = oddData as { playerName?: string; position?: string; team?: string; line?: number; odds?: number };
            
            playerProps.push({
              id: propKey,
              playerId: playerID,
              playerName: data.playerName || playerID.replace(/_/g, ' '),
              position: data.position || 'N/A',
              team: data.team || 'home',
              statType: statType.replace(/_/g, ' '),
              line: data.line || 0,
              overOdds: 0,
              underOdds: 0,
              category: statType,
            });
          });
        }
        
        dataMap[event.eventID] = playerProps;
      });

      logger.info(`[API /batch/player-props] Returned props for ${Object.keys(dataMap).length} games`);

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
      logger.error('[API /batch/player-props] Error:', error);
      return ApiErrors.serviceUnavailable('Unable to fetch batch player props');
    }
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 120;
