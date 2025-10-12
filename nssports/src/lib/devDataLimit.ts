/**
 * Development Data Limiting Utilities
 * 
 * The Efficient Development Doctrine:
 * - Protocol I: Production Sanctity - Only applies in development
 * - Protocol II: Configurable Control - Environment variable driven
 * - Protocol III: Architectural Transparency - Low-level data layer
 * - Protocol IV: Live Data Fidelity - Samples real data, doesn't mock
 */

import { logger } from './logger';

/**
 * Configuration for development data limits
 */
interface DevLimitConfig {
  /** Number of games per league for multi-league endpoints */
  gamesPerLeague: number;
  /** Total games limit for single-league endpoints */
  singleLeagueLimit: number;
}

/**
 * Get development data limit configuration from environment variables
 */
function getDevLimitConfig(): DevLimitConfig {
  const gamesPerLeague = parseInt(process.env.DEV_GAMES_PER_LEAGUE || '3', 10);
  const singleLeagueLimit = parseInt(process.env.DEV_SINGLE_LEAGUE_LIMIT || '10', 10);

  return {
    gamesPerLeague: isNaN(gamesPerLeague) ? 3 : gamesPerLeague,
    singleLeagueLimit: isNaN(singleLeagueLimit) ? 10 : singleLeagueLimit,
  };
}

/**
 * Check if development data limiting is enabled
 * Only applies in development mode
 */
export function isDevLimitingEnabled(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Apply stratified sampling for multi-league data
 * Groups data by league and limits each league to N games
 * 
 * @param games Array of games with leagueId property
 * @param leagueIdKey Key to access the league identifier
 * @returns Sampled array of games
 */
export function applyStratifiedSampling<T extends Record<string, any>>(
  games: T[],
  leagueIdKey: keyof T = 'leagueId' as keyof T
): T[] {
  // Only apply in development
  if (!isDevLimitingEnabled()) {
    return games;
  }

  const config = getDevLimitConfig();
  
  // If limit is 0, return all games
  if (config.gamesPerLeague === 0) {
    return games;
  }

  // Group by league
  const gamesByLeague = games.reduce((acc, game) => {
    const leagueId = game[leagueIdKey] as string;
    if (!acc[leagueId]) {
      acc[leagueId] = [];
    }
    acc[leagueId].push(game);
    return acc;
  }, {} as Record<string, T[]>);

  // Sample from each league
  const sampledGames: T[] = [];
  for (const [leagueId, leagueGames] of Object.entries(gamesByLeague)) {
    const limited = leagueGames.slice(0, config.gamesPerLeague);
    sampledGames.push(...limited);
    
    if (limited.length < leagueGames.length) {
      logger.info(
        `[DEV] Limited ${leagueId} from ${leagueGames.length} to ${limited.length} games`
      );
    }
  }

  logger.info(
    `[DEV] Stratified sampling applied: ${games.length} → ${sampledGames.length} games`
  );

  return sampledGames;
}

/**
 * Apply simple limit for single-league data
 * 
 * @param games Array of games
 * @returns Limited array of games
 */
export function applySingleLeagueLimit<T>(games: T[]): T[] {
  // Only apply in development
  if (!isDevLimitingEnabled()) {
    return games;
  }

  const config = getDevLimitConfig();
  
  // If limit is 0, return all games
  if (config.singleLeagueLimit === 0) {
    return games;
  }

  if (games.length > config.singleLeagueLimit) {
    logger.info(
      `[DEV] Single league limit applied: ${games.length} → ${config.singleLeagueLimit} games`
    );
    return games.slice(0, config.singleLeagueLimit);
  }

  return games;
}

/**
 * Apply appropriate development limit based on context
 * 
 * @param games Array of games
 * @param isMultiLeague Whether this is a multi-league endpoint
 * @param leagueIdKey Key to access the league identifier (for multi-league)
 * @returns Limited array of games
 */
export function applyDevLimit<T extends Record<string, any>>(
  games: T[],
  isMultiLeague: boolean,
  leagueIdKey: keyof T = 'leagueId' as keyof T
): T[] {
  if (isMultiLeague) {
    return applyStratifiedSampling(games, leagueIdKey);
  } else {
    return applySingleLeagueLimit(games);
  }
}
