/**
 * Player Stats Integration - SportsGameOdds SDK
 * 
 * Fetches actual player performance stats from finished games
 * for accurate player prop settlement.
 * 
 * Per SDK Docs: https://sportsgameodds.com/docs/explorer
 * - Event.results contains player stats: { "points": { "PLAYER_ID": 28 } }
 * - Available for finished games only
 * - Includes all standard stat types (points, rebounds, assists, etc.)
 */

import { getEvents } from '@/lib/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import type { ExtendedSDKEvent } from '@/lib/transformers/sportsgameodds-sdk';

/**
 * Player stats structure returned by SDK
 */
export interface PlayerGameStats {
  [statType: string]: number;  // e.g., { "points": 28, "rebounds": 8, "assists": 5 }
}

/**
 * Fetch player stats from a finished game
 * 
 * @param gameId - The eventID of the finished game
 * @param playerId - The playerID (e.g., "LEBRON_JAMES_1_NBA")
 * @returns Object with player's stats for the game, or null if unavailable
 * 
 * @example
 * ```typescript
 * const stats = await fetchPlayerStats("20231115_LAL_GSW_NBA", "LEBRON_JAMES_1_NBA");
 * // Returns: { points: 28, rebounds: 8, assists: 5, steals: 2, blocks: 1, ... }
 * ```
 */
export async function fetchPlayerStats(
  gameId: string,
  playerId: string
): Promise<PlayerGameStats | null> {
  try {
    logger.info(`[fetchPlayerStats] Fetching stats for player ${playerId} in game ${gameId}`);

    // Fetch event with results data from SDK
    const response = await getEvents({
      eventIDs: gameId,
      // No need for odds, just results
      // SDK should include results automatically for finished games
    });

    if (!response.data || response.data.length === 0) {
      logger.warn(`[fetchPlayerStats] Game ${gameId} not found in SDK`);
      return null;
    }

    const event = response.data[0] as ExtendedSDKEvent;

    // Check if event has results data
    if (!event.results) {
      logger.warn(`[fetchPlayerStats] No results data for game ${gameId} - may not be finished yet`);
      return null;
    }

    // Extract player stats from results
    // Results structure: { "points": { "PLAYER_ID": 28 }, "rebounds": { "PLAYER_ID": 8 }, ... }
    const playerStats: PlayerGameStats = {};

    Object.entries(event.results).forEach(([statType, playerData]) => {
      // playerData is an object: { "PLAYER_ID_1": value1, "PLAYER_ID_2": value2, ... }
      if (typeof playerData === 'object' && playerData[playerId] !== undefined) {
        playerStats[statType] = Number(playerData[playerId]);
      }
    });

    if (Object.keys(playerStats).length === 0) {
      logger.warn(`[fetchPlayerStats] No stats found for player ${playerId} in game ${gameId}`);
      return null;
    }

    logger.info(`[fetchPlayerStats] Found ${Object.keys(playerStats).length} stat types for player ${playerId}:`, playerStats);
    
    return playerStats;

  } catch (error) {
    logger.error(`[fetchPlayerStats] Error fetching stats for player ${playerId} in game ${gameId}:`, error);
    return null;
  }
}

/**
 * Fetch stats for multiple players from a finished game (more efficient)
 * 
 * @param gameId - The eventID of the finished game
 * @param playerIds - Array of playerIDs to fetch stats for
 * @returns Map of playerID to stats object
 * 
 * @example
 * ```typescript
 * const stats = await fetchMultiplePlayerStats("20231115_LAL_GSW_NBA", [
 *   "LEBRON_JAMES_1_NBA",
 *   "ANTHONY_DAVIS_1_NBA"
 * ]);
 * // Returns: Map {
 * //   "LEBRON_JAMES_1_NBA" => { points: 28, rebounds: 8, assists: 5 },
 * //   "ANTHONY_DAVIS_1_NBA" => { points: 25, rebounds: 12, assists: 3 }
 * // }
 * ```
 */
export async function fetchMultiplePlayerStats(
  gameId: string,
  playerIds: string[]
): Promise<Map<string, PlayerGameStats>> {
  const statsMap = new Map<string, PlayerGameStats>();

  try {
    logger.info(`[fetchMultiplePlayerStats] Fetching stats for ${playerIds.length} players in game ${gameId}`);

    // Fetch event with results data from SDK
    const response = await getEvents({
      eventIDs: gameId,
    });

    if (!response.data || response.data.length === 0) {
      logger.warn(`[fetchMultiplePlayerStats] Game ${gameId} not found in SDK`);
      return statsMap;
    }

    const event = response.data[0] as ExtendedSDKEvent;

    if (!event.results) {
      logger.warn(`[fetchMultiplePlayerStats] No results data for game ${gameId}`);
      return statsMap;
    }

    // Extract stats for each player
    playerIds.forEach(playerId => {
      const playerStats: PlayerGameStats = {};

      Object.entries(event.results!).forEach(([statType, playerData]) => {
        if (typeof playerData === 'object' && playerData[playerId] !== undefined) {
          playerStats[statType] = Number(playerData[playerId]);
        }
      });

      if (Object.keys(playerStats).length > 0) {
        statsMap.set(playerId, playerStats);
      }
    });

    logger.info(`[fetchMultiplePlayerStats] Found stats for ${statsMap.size} / ${playerIds.length} players`);
    
    return statsMap;

  } catch (error) {
    logger.error(`[fetchMultiplePlayerStats] Error fetching stats for game ${gameId}:`, error);
    return statsMap;
  }
}

/**
 * Batch fetch stats for players across multiple games
 * Useful for settling multiple player prop bets at once
 * 
 * @param requests - Array of { gameId, playerId } pairs
 * @returns Map of "gameId:playerId" to stats object
 */
export async function batchFetchPlayerStats(
  requests: Array<{ gameId: string; playerId: string }>
): Promise<Map<string, PlayerGameStats>> {
  const statsMap = new Map<string, PlayerGameStats>();

  // Group requests by gameId to minimize SDK calls
  const gameGroups = requests.reduce((acc, req) => {
    if (!acc[req.gameId]) {
      acc[req.gameId] = [];
    }
    acc[req.gameId].push(req.playerId);
    return acc;
  }, {} as Record<string, string[]>);

  try {
    // Fetch stats for each game (parallelized)
    await Promise.all(
      Object.entries(gameGroups).map(async ([gameId, playerIds]) => {
        const gameStats = await fetchMultiplePlayerStats(gameId, playerIds);
        
        // Store in combined map with "gameId:playerId" key
        gameStats.forEach((stats, playerId) => {
          statsMap.set(`${gameId}:${playerId}`, stats);
        });
      })
    );

    logger.info(`[batchFetchPlayerStats] Fetched stats for ${statsMap.size} player-game combinations`);
    
    return statsMap;

  } catch (error) {
    logger.error(`[batchFetchPlayerStats] Error in batch fetch:`, error);
    return statsMap;
  }
}
