/**
 * Period/Quarter Scores Integration - SportsGameOdds SDK
 * 
 * Fetches period-level scoring data (quarters, halves, periods, innings) from finished games
 * for accurate quarter/period props settlement.
 * 
 * Per SDK Docs:
 * - Period IDs: https://sportsgameodds.com/docs/data-types/periods
 * - Results structure may contain period-level data similar to player stats
 * - Format investigation needed: event.results might have period keys or separate event.periods field
 * 
 * PERIOD IDS (from official docs):
 * - Full Game: 'game'
 * - Basketball/Football: '1q', '2q', '3q', '4q', '1h', '2h'
 * - Hockey: '1p', '2p', '3p', 'reg', 'ot', 'so'
 * - Baseball: '1i' through '9i', '1ix5', '1ix7'
 * - Soccer: '1h', '2h', 'ot'
 */

import { getEvents } from '@/lib/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
const log = logger.createScopedLogger('PeriodScores');

/**
 * Period scores structure
 */
export interface PeriodScores {
  [periodID: string]: {
    home: number;
    away: number;
  };
}

/**
 * Expanded period scores with computed values
 */
export interface ExpandedPeriodScores {
  // All base period scores
  [periodID: string]: { home: number; away: number };
}

/**
 * Fetch period/quarter scores from a finished game
 * 
 * SDK Structure: event.results[periodID] contains { home: { points: X }, away: { points: Y } }
 * Example: event.results['1q'] = { home: { points: 31 }, away: { points: 28 } }
 * 
 * @param gameId - The eventID of the finished game
 * @returns Period scores object, or null if unavailable
 * 
 * @example
 * ```typescript
 * const scores = await fetchPeriodScores("20231115_LAL_GSW_NBA");
 * // Returns: { 
 * //   "1q": { home: 28, away: 25 },
 * //   "2q": { home: 30, away: 27 },
 * //   "3q": { home: 26, away: 23 },
 * //   "4q": { home: 26, away: 20 }
 * // }
 * ```
 */
export async function fetchPeriodScores(
  gameId: string
): Promise<PeriodScores | null> {
  try {
  log.debug(`[fetchPeriodScores] Fetching period scores for game ${gameId}`);

    // Fetch event from SDK
    const response = await getEvents({
      eventIDs: gameId,
    });

    if (!response.data || response.data.length === 0) {
  log.warn(`[fetchPeriodScores] Game ${gameId} not found in SDK`);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = response.data[0] as any;

    // SDK structure: event.results[periodID] = { home: { points: X }, away: { points: Y } }
    if (!event.results) {
  log.warn(`[fetchPeriodScores] No results field in event ${gameId}`);
      return null;
    }

    const periodScores: PeriodScores = {};
    
    // Known period IDs from SDK docs
    const periodIDs = ['1q', '2q', '3q', '4q', '1h', '2h', '1p', '2p', '3p', 'game', 'reg', 'ot'];
    
    for (const periodID of periodIDs) {
      const periodData = event.results[periodID];
      if (periodData && periodData.home && periodData.away) {
        // Extract points from home/away objects
        const homePoints = periodData.home.points;
        const awayPoints = periodData.away.points;
        
        if (typeof homePoints === 'number' && typeof awayPoints === 'number') {
          periodScores[periodID] = {
            home: homePoints,
            away: awayPoints
          };
        }
      }
    }

    if (Object.keys(periodScores).length === 0) {
  log.warn(`[fetchPeriodScores] No period scores found in results for game ${gameId}`);
      return null;
    }

  log.debug(`[fetchPeriodScores] Successfully extracted ${Object.keys(periodScores).length} periods for game ${gameId}`);
    return periodScores;

  } catch (error) {
  log.error(`[fetchPeriodScores] Error fetching period scores for game ${gameId}:`, error);
    return null;
  }
}

/**
 * Fetch period scores with computed half and full game totals
 * 
 * @param gameId - The eventID of the finished game
 * @returns Expanded period scores with computed halves and total
 */
export async function fetchExpandedPeriodScores(
  gameId: string
): Promise<ExpandedPeriodScores | null> {
  const periodScores = await fetchPeriodScores(gameId);
  
  if (!periodScores) {
    return null;
  }

  const expanded: ExpandedPeriodScores = { ...periodScores };

  // Compute 1st half (Q1 + Q2) if quarters available
  if (periodScores['1q'] && periodScores['2q']) {
    expanded['1h'] = {
      home: periodScores['1q'].home + periodScores['2q'].home,
      away: periodScores['1q'].away + periodScores['2q'].away,
    };
  }

  // Compute 2nd half (Q3 + Q4) if quarters available
  if (periodScores['3q'] && periodScores['4q']) {
    expanded['2h'] = {
      home: periodScores['3q'].home + periodScores['4q'].home,
      away: periodScores['3q'].away + periodScores['4q'].away,
    };
  }

  // Compute full game total from all periods
  const allPeriods = Object.values(periodScores);
  if (allPeriods.length > 0) {
    expanded.total = {
      home: allPeriods.reduce((sum, period) => sum + period.home, 0),
      away: allPeriods.reduce((sum, period) => sum + period.away, 0),
    };
  }

  return expanded;
}

/**
 * Get score for a specific period
 * 
 * @param gameId - The eventID of the finished game
 * @param periodID - The period identifier (e.g., '1q', '2q', '1h')
 * @returns Home and away scores for the period, or null if unavailable
 */
export async function getPeriodScore(
  gameId: string,
  periodID: string
): Promise<{ home: number; away: number } | null> {
  const scores = await fetchExpandedPeriodScores(gameId);
  
  if (!scores || !scores[periodID]) {
    log.warn(`[getPeriodScore] No score data for period ${periodID} in game ${gameId}`);
    return null;
  }

  return scores[periodID];
}

/**
 * Validate if period data is available from SDK
 * This is a diagnostic function to help determine SDK capabilities
 * 
 * @param gameId - A known finished game ID
 */
export async function diagnosticPeriodDataCheck(gameId: string): Promise<void> {
  logger.info(`[diagnosticPeriodDataCheck] Running diagnostic for game ${gameId}`);
  logger.info('================================================');
  
  const response = await getEvents({ eventIDs: gameId });
  
  if (!response.data || response.data.length === 0) {
    logger.error(`[diagnosticPeriodDataCheck] Game ${gameId} not found`);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = response.data[0] as any;
  
  logger.info(`[diagnosticPeriodDataCheck] Event ID: ${event.eventID}`);
  logger.info(`[diagnosticPeriodDataCheck] Status: ${event.status?.completed ? 'Finished' : 'Not Finished'}`);
  logger.info(`[diagnosticPeriodDataCheck] Final Score: ${event.scores?.home} - ${event.scores?.away}`);
  logger.info('');
  logger.info(`[diagnosticPeriodDataCheck] Top-level fields in event:`, { fields: Object.keys(event) });
  logger.info('');
  
  // Check each possible location for period data
  const fieldsToCheck = ['periods', 'periodScores', 'quarters', 'periodData', 'boxScore', 'linescore', 'results'];
  
  fieldsToCheck.forEach(field => {
    if (event[field]) {
      logger.info(`[diagnosticPeriodDataCheck] ✅ Found field: event.${field}`);
      logger.info(`[diagnosticPeriodDataCheck] Type: ${typeof event[field]}`);
      
      if (typeof event[field] === 'object') {
        logger.info(`[diagnosticPeriodDataCheck] Keys in event.${field}:`, { keys: Object.keys(event[field]) });
        
        // Show first entry as sample
        const firstKey = Object.keys(event[field])[0];
        if (firstKey) {
          logger.info(`[diagnosticPeriodDataCheck] Sample (event.${field}.${firstKey}):`, event[field][firstKey]);
        }
      }
      
      logger.info('');
    } else {
      logger.info(`[diagnosticPeriodDataCheck] ❌ Field not found: event.${field}`);
    }
  });
  
  logger.info('================================================');
  logger.info('[diagnosticPeriodDataCheck] Diagnostic complete');
  logger.info('Next step: Review logs above to determine correct field/structure');
}
