/**
 * Player Stats Integration - SportsGameOdds SDK
 * 
 * Fetches actual player performance stats from finished games
 * for accurate player prop settlement.
 * 
 * SDK Structure:
 * - event.results['game'][playerID] contains player stats
 * - Player IDs format: "FIRSTNAME_LASTNAME_#_LEAGUE" (e.g., "LEBRON_JAMES_1_NBA")
 * - Stats available: points, rebounds, assists, steals, blocks, turnovers, etc.
 * 
 * Example:
 * event.results['game']['LEBRON_JAMES_1_NBA'] = {
 *   points: 28,
 *   rebounds: 8,
 *   assists: 5,
 *   steals: 2,
 *   blocks: 1,
 *   turnovers: 3,
 *   ...
 * }
 */

import { getEvents } from '@/lib/sportsgameodds-sdk';
import { logger } from '@/lib/logger';

/**
 * Player stats structure returned by SDK
 */
export interface PlayerGameStats {
  [statType: string]: number;  // e.g., { "points": 28, "rebounds": 8, "assists": 5 }
}

/**
 * Fetch player stats from a finished game
 * 
 * SDK Structure: event.results['game'][playerID] = { points: X, rebounds: Y, ... }
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

    // Fetch event from SDK
    const response = await getEvents({
      eventIDs: gameId,
    });

    if (!response.data || response.data.length === 0) {
      logger.warn(`[fetchPlayerStats] Game ${gameId} not found in SDK`);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = response.data[0] as any;

    // SDK structure: event.results['game'][playerID] = { points: X, rebounds: Y, ... }
    if (!event.results || !event.results['game']) {
      logger.warn(`[fetchPlayerStats] No game results data for game ${gameId} - may not be finished yet`);
      return null;
    }

    const gameResults = event.results['game'];
    
    // Check if player data exists
    if (!gameResults[playerId]) {
      logger.warn(`[fetchPlayerStats] No stats found for player ${playerId} in game ${gameId}`);
      const availablePlayers = Object.keys(gameResults).filter(k => k.includes('_NBA') || k.includes('_NFL') || k.includes('_NHL')).slice(0, 5);
      logger.info(`[fetchPlayerStats] Sample available players: ${availablePlayers.join(', ')}`);
      return null;
    }

    const playerStats = gameResults[playerId];
    
    if (typeof playerStats !== 'object') {
      logger.warn(`[fetchPlayerStats] Invalid stats format for player ${playerId}`);
      return null;
    }

    logger.info(`[fetchPlayerStats] Found ${Object.keys(playerStats).length} stat types for player ${playerId}`);
    
    return playerStats as PlayerGameStats;

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

    // Fetch event from SDK
    const response = await getEvents({
      eventIDs: gameId,
    });

    if (!response.data || response.data.length === 0) {
      logger.warn(`[fetchMultiplePlayerStats] Game ${gameId} not found in SDK`);
      return statsMap;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = response.data[0] as any;

    if (!event.results || !event.results['game']) {
      logger.warn(`[fetchMultiplePlayerStats] No game results data for game ${gameId}`);
      return statsMap;
    }

    const gameResults = event.results['game'];

    // Extract stats for each player
    playerIds.forEach(playerId => {
      if (gameResults[playerId] && typeof gameResults[playerId] === 'object') {
        statsMap.set(playerId, gameResults[playerId] as PlayerGameStats);
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
