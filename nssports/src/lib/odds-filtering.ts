/**
 * Odds Filtering for Performance Optimization
 * 
 * Implements best practices from official documentation:
 * https://sportsgameodds.com/docs/guides/response-speed
 * https://sportsgameodds.com/docs/guides/handling-odds
 * 
 * Key optimizations:
 * - Use `oddIDs` parameter to fetch only needed odds
 * - Use `includeOpposingOddIDs` to get both sides efficiently
 * - Use PLAYER_ID wildcard for all players
 * - Reduce response payload by 50-90%
 */

import { logger } from './logger';

/**
 * Common oddID patterns for each sport
 * Based on SportsGameOdds Markets documentation
 */
export const ODDS_PATTERNS = {
  // Basketball (NBA)
  NBA: {
    // Main markets
    MONEYLINE: 'game-ml-{side}', // side: home, away
    SPREAD: 'game-ats-{side}', // Against the spread
    TOTAL: 'game-ou-{side}', // Over/Under, side: over, under
    
    // Player props
    PLAYER_POINTS: 'points-PLAYER_ID-game-ou-{side}',
    PLAYER_REBOUNDS: 'rebounds-PLAYER_ID-game-ou-{side}',
    PLAYER_ASSISTS: 'assists-PLAYER_ID-game-ou-{side}',
    PLAYER_THREES: 'threes_made-PLAYER_ID-game-ou-{side}',
    PLAYER_PRA: 'points_rebounds_assists-PLAYER_ID-game-ou-{side}',
  },
  
  // Football (NFL)
  NFL: {
    // Main markets
    MONEYLINE: 'game-ml-{side}',
    SPREAD: 'game-ats-{side}',
    TOTAL: 'game-ou-{side}',
    
    // Player props
    PLAYER_PASSING_YARDS: 'passing_yards-PLAYER_ID-game-ou-{side}',
    PLAYER_PASSING_TDS: 'passing_touchdowns-PLAYER_ID-game-ou-{side}',
    PLAYER_RUSHING_YARDS: 'rushing_yards-PLAYER_ID-game-ou-{side}',
    PLAYER_RECEIVING_YARDS: 'receiving_yards-PLAYER_ID-game-ou-{side}',
  },
  
  // Hockey (NHL)
  NHL: {
    // Main markets
    MONEYLINE: 'game-ml-{side}',
    PUCKLINE: 'game-ats-{side}', // NHL spread is called puck line
    TOTAL: 'game-ou-{side}',
    
    // Player props
    PLAYER_GOALS: 'goals-PLAYER_ID-game-ou-{side}',
    PLAYER_ASSISTS: 'assists-PLAYER_ID-game-ou-{side}',
    PLAYER_POINTS: 'points-PLAYER_ID-game-ou-{side}',
    PLAYER_SHOTS: 'shots_on_goal-PLAYER_ID-game-ou-{side}',
  },
};

/**
 * Preset odd configurations for common use cases
 */
export const ODDS_PRESETS = {
  // Main game odds only (fastest)
  MAIN_LINES: {
    name: 'Main Lines',
    oddIDs: ['game-ml', 'game-ats', 'game-ou'],
    includeOpposingOddIDs: true,
    description: 'Moneyline, spread, and total only',
  },
  
  // Main lines + popular player props
  POPULAR_PROPS: {
    name: 'Popular Props',
    oddIDs: [
      'game-ml', 'game-ats', 'game-ou',
      'points-PLAYER_ID-game-ou',
      'rebounds-PLAYER_ID-game-ou',
      'assists-PLAYER_ID-game-ou',
    ],
    includeOpposingOddIDs: true,
    description: 'Main lines + points/rebounds/assists props',
  },
  
  // All player props (slower but comprehensive)
  ALL_PLAYER_PROPS: {
    name: 'All Player Props',
    oddIDs: ['PLAYER_ID-game-ou'],
    includeOpposingOddIDs: true,
    description: 'All available player proposition markets',
  },
};

/**
 * Build oddIDs parameter for API requests
 * 
 * @param league - League ID (NBA, NFL, NHL)
 * @param markets - Array of market types
 * @param includeOpposing - Include opposite side (over/under, home/away)
 * @returns Formatted oddIDs string for API
 * 
 * Example:
 * ```typescript
 * const oddIDs = buildOddIDsParam('NBA', ['SPREAD', 'TOTAL', 'PLAYER_POINTS']);
 * // Returns: 'game-ats,game-ou,points-PLAYER_ID-game-ou'
 * ```
 */
export function buildOddIDsParam(
  league: 'NBA' | 'NFL' | 'NHL',
  markets: string[],
  includeOpposing = true
): { oddIDs: string; includeOpposingOddIDs: boolean } {
  const patterns = ODDS_PATTERNS[league];
  const oddIDs: string[] = [];

  markets.forEach((market) => {
    const pattern = patterns[market as keyof typeof patterns];
    if (pattern) {
      // Remove {side} placeholder for API
      const oddID = pattern.replace('-{side}', '');
      oddIDs.push(oddID);
    } else {
      logger.warn('[OddsFilter] Unknown market type', { league, market });
    }
  });

  logger.debug('[OddsFilter] Built oddIDs parameter', {
    league,
    markets,
    oddIDs,
    includeOpposing,
  });

  return {
    oddIDs: oddIDs.join(','),
    includeOpposingOddIDs: includeOpposing,
  };
}

/**
 * Apply preset odds configuration
 */
export function applyOddsPreset(
  presetName: keyof typeof ODDS_PRESETS
): { oddIDs: string; includeOpposingOddIDs: boolean } {
  const preset = ODDS_PRESETS[presetName];
  
  if (!preset) {
    logger.warn('[OddsFilter] Unknown preset', { presetName });
    return { oddIDs: '', includeOpposingOddIDs: false };
  }

  logger.info('[OddsFilter] Applying odds preset', {
    preset: preset.name,
    description: preset.description,
  });

  return {
    oddIDs: preset.oddIDs.join(','),
    includeOpposingOddIDs: preset.includeOpposingOddIDs,
  };
}

/**
 * Grade odds based on final score
 * 
 * Implements odds grading logic from documentation:
 * https://sportsgameodds.com/docs/guides/handling-odds
 * 
 * @param odds - Odds object from API
 * @param score - Final score value
 * @returns 'over' | 'under' | 'push'
 */
export function gradeOverUnderOdds(
  closeOverUnder: number,
  score: number
): 'over' | 'under' | 'push' {
  if (score > closeOverUnder) {
    return 'over';
  } else if (score < closeOverUnder) {
    return 'under';
  } else {
    return 'push';
  }
}

/**
 * Grade spread odds
 */
export function gradeSpreadOdds(
  closeSpread: number,
  actualSpread: number
): 'home' | 'away' | 'push' {
  if (actualSpread > closeSpread) {
    return 'home';
  } else if (actualSpread < closeSpread) {
    return 'away';
  } else {
    return 'push';
  }
}

/**
 * Grade moneyline odds
 */
export function gradeMoneylineOdds(
  homeScore: number,
  awayScore: number
): 'home' | 'away' | 'push' {
  if (homeScore > awayScore) {
    return 'home';
  } else if (awayScore > homeScore) {
    return 'away';
  } else {
    return 'push';
  }
}

/**
 * Calculate odds efficiency savings
 * 
 * Estimates response size reduction when using oddIDs filtering
 */
export function calculateOddsFilteringStats(
  totalOdds: number,
  filteredOdds: number
): {
  percentageReduction: number;
  oddsSaved: number;
  estimatedSpeedImprovement: string;
} {
  const oddsSaved = totalOdds - filteredOdds;
  const percentageReduction = (oddsSaved / totalOdds) * 100;
  
  let estimatedSpeedImprovement = '0-10%';
  if (percentageReduction > 80) {
    estimatedSpeedImprovement = '50-80%';
  } else if (percentageReduction > 60) {
    estimatedSpeedImprovement = '30-50%';
  } else if (percentageReduction > 40) {
    estimatedSpeedImprovement = '20-30%';
  } else if (percentageReduction > 20) {
    estimatedSpeedImprovement = '10-20%';
  }

  return {
    percentageReduction: Math.round(percentageReduction),
    oddsSaved,
    estimatedSpeedImprovement,
  };
}

/**
 * Development mode: Log odds filtering recommendations
 */
export function logOddsFilteringRecommendations(
  eventCount: number,
  oddsPerEvent: number
): void {
  const totalOdds = eventCount * oddsPerEvent;
  
  logger.info('[OddsFilter] Recommendations', {
    eventCount,
    oddsPerEvent,
    totalOdds,
    recommendations: [
      totalOdds > 1000 ? '⚠️ Use oddIDs filtering - response may be slow' : '✅ Response size acceptable',
      oddsPerEvent > 100 ? '💡 Consider MAIN_LINES preset for faster response' : '✅ Odds count per event is reasonable',
      eventCount > 50 ? '💡 Consider pagination or date range filtering' : '✅ Event count is reasonable',
    ],
  });
}
