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
 * INVESTIGATION STATUS: The SDK's exact format for period scores is unclear from docs.
 * This function will:
 * 1. Check event.results for period-based stat entries
 * 2. Check for a potential event.periods or event.periodScores field
 * 3. Log what's actually available for debugging
 * 
 * @param gameId - The eventID of the finished game
 * @returns Period scores object, or null if unavailable
 * 
 * @example
 * ```typescript
 * const scores = await fetchPeriodScores("20231115_LAL_GSW_NBA");
 * // Expected: { 
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
    logger.info(`[fetchPeriodScores] Fetching period scores for game ${gameId}`);

    // Fetch event from SDK
    const response = await getEvents({
      eventIDs: gameId,
    });

    if (!response.data || response.data.length === 0) {
      logger.warn(`[fetchPeriodScores] Game ${gameId} not found in SDK`);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = response.data[0] as any; // Use 'any' to inspect unknown fields

    // INVESTIGATION: Log the entire event structure to see what's available
    logger.info(`[fetchPeriodScores] Event structure keys:`, { keys: Object.keys(event) });
    
    // Check for common field names that might contain period data
    if (event.periods) {
      logger.info(`[fetchPeriodScores] Found event.periods field:`, event.periods);
    }
    if (event.periodScores) {
      logger.info(`[fetchPeriodScores] Found event.periodScores field:`, event.periodScores);
    }
    if (event.quarters) {
      logger.info(`[fetchPeriodScores] Found event.quarters field:`, event.quarters);
    }
    if (event.periodData) {
      logger.info(`[fetchPeriodScores] Found event.periodData field:`, event.periodData);
    }
    
    // Check if results contains period-based entries
    if (event.results) {
      logger.info(`[fetchPeriodScores] event.results keys:`, { keys: Object.keys(event.results) });
      
      // Look for period-related keys in results
      const periodKeys = Object.keys(event.results).filter(key => 
        /^(1q|2q|3q|4q|1h|2h|1p|2p|3p|1i|2i|3i|4i|5i|6i|7i|8i|9i)/.test(key)
      );
      
      if (periodKeys.length > 0) {
        logger.info(`[fetchPeriodScores] Found period keys in results:`, { periodKeys });
        logger.info(`[fetchPeriodScores] Sample period data:`, event.results[periodKeys[0]]);
      }
    }

    // ATTEMPT 1: Check for event.periods field (most likely location)
    if (event.periods && typeof event.periods === 'object') {
      const periodScores: PeriodScores = {};
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.entries(event.periods).forEach(([periodID, periodData]: [string, any]) => {
        if (periodData && typeof periodData === 'object') {
          // Check various possible structures
          if (periodData.home !== undefined && periodData.away !== undefined) {
            periodScores[periodID] = {
              home: Number(periodData.home),
              away: Number(periodData.away),
            };
          } else if (periodData.scores) {
            periodScores[periodID] = {
              home: Number(periodData.scores.home),
              away: Number(periodData.scores.away),
            };
          }
        }
      });
      
      if (Object.keys(periodScores).length > 0) {
        logger.info(`[fetchPeriodScores] Successfully parsed ${Object.keys(periodScores).length} periods from event.periods`);
        return periodScores;
      }
    }

    // ATTEMPT 2: Check results field for period-based stats
    if (event.results && typeof event.results === 'object') {
      // Results structure might be: { "1q": { "home": 28, "away": 25 }, ... }
      // OR: { "1q_home": { "team": 28 }, "1q_away": { "team": 25 }, ... }
      
      const periodScores: PeriodScores = {};
      const potentialPeriods = ['1q', '2q', '3q', '4q', '1h', '2h', '1p', '2p', '3p', 'reg', 'ot'];
      
      potentialPeriods.forEach(periodID => {
        // Try direct period key
        if (event.results[periodID]) {
          const periodData = event.results[periodID];
          if (typeof periodData === 'object' && periodData.home !== undefined && periodData.away !== undefined) {
            periodScores[periodID] = {
              home: Number(periodData.home),
              away: Number(periodData.away),
            };
          }
        }
        
        // Try split keys (e.g., "1q_home" and "1q_away")
        const homeKey = `${periodID}_home`;
        const awayKey = `${periodID}_away`;
        if (event.results[homeKey] && event.results[awayKey]) {
          periodScores[periodID] = {
            home: Number(event.results[homeKey]),
            away: Number(event.results[awayKey]),
          };
        }
      });
      
      if (Object.keys(periodScores).length > 0) {
        logger.info(`[fetchPeriodScores] Successfully parsed ${Object.keys(periodScores).length} periods from event.results`);
        return periodScores;
      }
    }

    // ATTEMPT 3: Check for periodScores field
    if (event.periodScores && typeof event.periodScores === 'object') {
      const periodScores: PeriodScores = {};
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.entries(event.periodScores).forEach(([periodID, scores]: [string, any]) => {
        if (scores && typeof scores === 'object') {
          periodScores[periodID] = {
            home: Number(scores.home || 0),
            away: Number(scores.away || 0),
          };
        }
      });
      
      if (Object.keys(periodScores).length > 0) {
        logger.info(`[fetchPeriodScores] Successfully parsed ${Object.keys(periodScores).length} periods from event.periodScores`);
        return periodScores;
      }
    }

    logger.warn(`[fetchPeriodScores] No period score data found for game ${gameId}`);
    logger.warn(`[fetchPeriodScores] Available event fields:`, { fields: Object.keys(event) });
    
    return null;

  } catch (error) {
    logger.error(`[fetchPeriodScores] Error fetching period scores for game ${gameId}:`, error);
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
    logger.warn(`[getPeriodScore] No score data for period ${periodID} in game ${gameId}`);
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
