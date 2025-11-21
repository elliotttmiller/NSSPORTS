/**
 * Live Betting Market Closure Rules - Industry Standards
 * 
 * Based on "Commercial Certainty" principle used by top-tier sportsbooks
 * (DraftKings, FanDuel, BetMGM, Caesars, etc.)
 * 
 * Core Principle: A betting market should not be open on an event whose outcome
 * is a commercial certainty. Allowing bets in such scenarios is financially 
 * irresponsible and violates the principle of offering odds on future uncertainty.
 * 
 * Implementation: Automated triggers based on game clocks, score margins, and
 * specific game contexts to prevent betting when outcome is effectively certain.
 */

import type { LeagueID } from '@/types/game';
import { logger } from './logger';

export interface GameState {
  leagueId: LeagueID;
  status: 'live' | 'upcoming' | 'finished';
  startTime: string;
  homeScore?: number;
  awayScore?: number;
  period?: string;  // e.g., "Q4", "3rd", "9th", "regulation", "overtime"
  timeRemaining?: string;  // e.g., "2:30", "0:45", etc.
  // Tennis-specific
  currentSet?: number;
  homeGamesWon?: number;
  awayGamesWon?: number;
  homeSetsWon?: number;
  awaySetsWon?: number;
  // Baseball-specific
  inning?: number;
  inningHalf?: 'top' | 'bottom';
  outs?: number;
  // Football-specific
  possession?: 'home' | 'away';
  down?: number;
  // Hockey-specific
  goaliePulled?: boolean;
}

export interface MarketClosureResult {
  isClosed: boolean;
  reason?: string;
  category?: 'time_threshold' | 'score_margin' | 'game_context' | 'commercial_certainty';
}

/**
 * Parse time remaining string to seconds
 * Supports formats: "2:30" (2 min 30 sec), "0:45" (45 sec), "120" (120 sec)
 */
function parseTimeRemaining(timeStr: string | undefined): number | null {
  if (!timeStr) return null;
  
  // Handle MM:SS format
  if (timeStr.includes(':')) {
    const [min, sec] = timeStr.split(':').map(Number);
    return (min * 60) + sec;
  }
  
  // Handle seconds only
  const seconds = Number(timeStr);
  return isNaN(seconds) ? null : seconds;
}

/**
 * NBA Basketball Market Closure Rules
 * 
 * Industry Standard:
 * - Close with 2 minutes or less remaining when leading team has possession
 * - Close with >8 point lead and very little time left (even without possession)
 * - Never allow betting in final 30 seconds regardless of score
 */
export function checkNBAMarketClosure(game: GameState): MarketClosureResult {
  if (game.status !== 'live') {
    return { isClosed: false };
  }
  
  const timeSeconds = parseTimeRemaining(game.timeRemaining);
  const homeScore = game.homeScore ?? 0;
  const awayScore = game.awayScore ?? 0;
  const scoreDiff = Math.abs(homeScore - awayScore);
  const period = game.period?.toLowerCase() || '';
  
  // Only apply closure rules in 4th quarter or overtime
  if (!period.includes('4') && !period.includes('ot') && !period.includes('overtime')) {
    return { isClosed: false };
  }
  
  // RULE 1: Never allow betting in final 30 seconds
  if (timeSeconds !== null && timeSeconds <= 30) {
    return {
      isClosed: true,
      reason: 'Market closed - less than 30 seconds remaining',
      category: 'time_threshold',
    };
  }
  
  // RULE 2: Close with 2 minutes or less + leading team has possession
  if (timeSeconds !== null && timeSeconds <= 120) {
    const leader = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : null;
    
    if (leader && game.possession === leader) {
      return {
        isClosed: true,
        reason: 'Market closed - 2 minutes remaining with leading team in possession',
        category: 'game_context',
      };
    }
  }
  
  // RULE 3: Close with insurmountable lead (>8 points with <2 minutes)
  if (timeSeconds !== null && timeSeconds <= 120 && scoreDiff > 8) {
    return {
      isClosed: true,
      reason: `Market closed - insurmountable lead (${scoreDiff} points with ${Math.floor(timeSeconds / 60)}:${(timeSeconds % 60).toString().padStart(2, '0')} remaining)`,
      category: 'commercial_certainty',
    };
  }
  
  return { isClosed: false };
}

/**
 * NFL Football Market Closure Rules
 * 
 * Industry Standard:
 * - Close at 2-minute warning in either half if outcome in doubt
 * - Close immediately in "victory formation" (kneel-down) situations
 * - Never allow betting when winning team is in victory formation
 */
export function checkNFLMarketClosure(game: GameState): MarketClosureResult {
  if (game.status !== 'live') {
    return { isClosed: false };
  }
  
  const timeSeconds = parseTimeRemaining(game.timeRemaining);
  const homeScore = game.homeScore ?? 0;
  const awayScore = game.awayScore ?? 0;
  const scoreDiff = Math.abs(homeScore - awayScore);
  const period = game.period?.toLowerCase() || '';
  
  // Only apply in 2nd or 4th quarter (or overtime)
  const isClosingPeriod = period.includes('2') || period.includes('4') || 
                          period.includes('ot') || period.includes('overtime');
  
  if (!isClosingPeriod) {
    return { isClosed: false };
  }
  
  // RULE 1: Close at 2-minute warning
  if (timeSeconds !== null && timeSeconds <= 120) {
    return {
      isClosed: true,
      reason: 'Market closed - 2-minute warning',
      category: 'time_threshold',
    };
  }
  
  // RULE 2: Victory formation detection (approximation)
  // If leading team has possession with <3 min remaining and >1 score lead
  if (timeSeconds !== null && timeSeconds <= 180 && scoreDiff > 7) {
    const leader = homeScore > awayScore ? 'home' : 'away';
    
    if (game.possession === leader) {
      return {
        isClosed: true,
        reason: 'Market closed - victory formation likely',
        category: 'game_context',
      };
    }
  }
  
  return { isClosed: false };
}

/**
 * NCAAB Basketball Market Closure Rules
 * 
 * Industry Standard:
 * - Stricter than NBA: often 1 minute or 30 seconds remaining
 * - Depends on score margin and possession
 * - College games have more variance in closing times
 */
export function checkNCAABMarketClosure(game: GameState): MarketClosureResult {
  if (game.status !== 'live') {
    return { isClosed: false };
  }
  
  const timeSeconds = parseTimeRemaining(game.timeRemaining);
  const homeScore = game.homeScore ?? 0;
  const awayScore = game.awayScore ?? 0;
  const scoreDiff = Math.abs(homeScore - awayScore);
  const period = game.period?.toLowerCase() || '';
  
  // Only apply in 2nd half or overtime
  if (!period.includes('2') && !period.includes('ot') && !period.includes('overtime')) {
    return { isClosed: false };
  }
  
  // RULE 1: Never allow betting in final 30 seconds
  if (timeSeconds !== null && timeSeconds <= 30) {
    return {
      isClosed: true,
      reason: 'Market closed - less than 30 seconds remaining',
      category: 'time_threshold',
    };
  }
  
  // RULE 2: Close with 1 minute or less + leading team has possession
  if (timeSeconds !== null && timeSeconds <= 60) {
    const leader = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : null;
    
    if (leader && game.possession === leader) {
      return {
        isClosed: true,
        reason: 'Market closed - 1 minute remaining with leading team in possession',
        category: 'game_context',
      };
    }
  }
  
  // RULE 3: Close with large lead (>10 points with <2 minutes)
  if (timeSeconds !== null && timeSeconds <= 120 && scoreDiff > 10) {
    return {
      isClosed: true,
      reason: `Market closed - insurmountable lead (${scoreDiff} points)`,
      category: 'commercial_certainty',
    };
  }
  
  return { isClosed: false };
}

/**
 * MLB Baseball Market Closure Rules
 * 
 * Industry Standard:
 * - Close once there are 2 outs in final inning
 * - Close when winning run is on base or at bat in close game
 * - Close permanently once final out is recorded
 */
export function checkMLBMarketClosure(game: GameState): MarketClosureResult {
  if (game.status !== 'live') {
    return { isClosed: false };
  }
  
  const homeScore = game.homeScore ?? 0;
  const awayScore = game.awayScore ?? 0;
  const scoreDiff = Math.abs(homeScore - awayScore);
  const inning = game.inning ?? 0;
  const inningHalf = game.inningHalf;
  const outs = game.outs ?? 0;
  
  // Only apply in 9th inning or later (extra innings)
  if (inning < 9) {
    return { isClosed: false };
  }
  
  // RULE 1: Close with 2 outs in final inning
  if (outs >= 2) {
    // Bottom of 9th (or later): home team leading or tied
    if (inningHalf === 'bottom' && homeScore >= awayScore) {
      return {
        isClosed: true,
        reason: 'Market closed - 2 outs in bottom of 9th with home leading/tied',
        category: 'commercial_certainty',
      };
    }
    
    // Top of 9th (or later) with large lead
    if (inningHalf === 'top' && scoreDiff > 3) {
      return {
        isClosed: true,
        reason: 'Market closed - 2 outs with insurmountable lead',
        category: 'commercial_certainty',
      };
    }
  }
  
  // RULE 2: Close in walk-off situations (bottom of 9th or later, home team can win)
  if (inningHalf === 'bottom' && homeScore >= awayScore) {
    return {
      isClosed: true,
      reason: 'Market closed - walk-off scenario',
      category: 'game_context',
    };
  }
  
  return { isClosed: false };
}

/**
 * NHL Hockey Market Closure Rules
 * 
 * Industry Standard:
 * - Close with 2 minutes or less in 3rd period with leading team having possession
 * - Re-evaluate if goalie is pulled (may close, reopen with adjusted odds, or stay open)
 * - Close in empty net situations with significant lead
 */
export function checkNHLMarketClosure(game: GameState): MarketClosureResult {
  if (game.status !== 'live') {
    return { isClosed: false };
  }
  
  const timeSeconds = parseTimeRemaining(game.timeRemaining);
  const homeScore = game.homeScore ?? 0;
  const awayScore = game.awayScore ?? 0;
  const scoreDiff = Math.abs(homeScore - awayScore);
  const period = game.period?.toLowerCase() || '';
  
  // Only apply in 3rd period or overtime
  const isClosingPeriod = period.includes('3') || period.includes('ot') || period.includes('overtime');
  
  if (!isClosingPeriod) {
    return { isClosed: false };
  }
  
  // RULE 1: Never allow betting in final 30 seconds
  if (timeSeconds !== null && timeSeconds <= 30) {
    return {
      isClosed: true,
      reason: 'Market closed - less than 30 seconds remaining',
      category: 'time_threshold',
    };
  }
  
  // RULE 2: Close with 2 minutes or less + leading team has puck possession
  if (timeSeconds !== null && timeSeconds <= 120) {
    const leader = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : null;
    
    if (leader && game.possession === leader) {
      return {
        isClosed: true,
        reason: 'Market closed - 2 minutes remaining with leading team in possession',
        category: 'game_context',
      };
    }
  }
  
  // RULE 3: Close if goalie pulled and significant lead exists
  if (game.goaliePulled && scoreDiff >= 2) {
    return {
      isClosed: true,
      reason: 'Market closed - empty net with 2+ goal lead',
      category: 'commercial_certainty',
    };
  }
  
  return { isClosed: false };
}

/**
 * Soccer Market Closure Rules
 * 
 * Industry Standard:
 * - ALWAYS close at 90-minute mark (end of regulation)
 * - Do NOT reopen for stoppage time
 * - May offer separate "Next Goal" markets during stoppage time
 * - Main match winner market remains closed
 */
export function checkSoccerMarketClosure(game: GameState): MarketClosureResult {
  if (game.status !== 'live') {
    return { isClosed: false };
  }
  
  const timeSeconds = parseTimeRemaining(game.timeRemaining);
  const period = game.period?.toLowerCase() || '';
  
  // RULE 1: Close at 90-minute mark (regulation time ends)
  // Soccer time counts up, so we check if we're at or past 90 minutes
  // In practice, API usually marks this as "stoppage time" or similar
  if (period.includes('stoppage') || period.includes('injury') || period.includes('added')) {
    return {
      isClosed: true,
      reason: 'Market closed - stoppage time (main market closes at 90 minutes)',
      category: 'time_threshold',
    };
  }
  
  // RULE 2: Close in final minute of regulation
  if (timeSeconds !== null && timeSeconds <= 60 && !period.includes('extra') && !period.includes('overtime')) {
    return {
      isClosed: true,
      reason: 'Market closed - approaching end of regulation (90 minutes)',
      category: 'time_threshold',
    };
  }
  
  return { isClosed: false };
}

/**
 * Tennis Market Closure Rules
 * 
 * Industry Standard:
 * - Close when a player is at match point
 * - Close in final game of final set when score is decisive
 * - Close when outcome is commercially certain based on score and serve
 */
export function checkTennisMarketClosure(game: GameState): MarketClosureResult {
  if (game.status !== 'live') {
    return { isClosed: false };
  }
  
  const homeSetsWon = game.homeSetsWon ?? 0;
  const awaySetsWon = game.awaySetsWon ?? 0;
  const homeGamesWon = game.homeGamesWon ?? 0;
  const awayGamesWon = game.awayGamesWon ?? 0;
  
  // Determine match format (best of 3 or best of 5)
  // Most tournaments are best of 3 (2 sets to win), Grand Slams men's are best of 5 (3 sets to win)
  const setsToWin = 2; // Default to best of 3 (ATP/WTA standard)
  
  // RULE 1: Match point scenario (one player needs 1 point to win)
  // Player at match point: has won setsToWin-1 sets and is at 5+ games in current set
  const homeAtMatchPoint = homeSetsWon === (setsToWin - 1) && homeGamesWon >= 5 && 
                           (homeGamesWon - awayGamesWon) >= 1;
  const awayAtMatchPoint = awaySetsWon === (setsToWin - 1) && awayGamesWon >= 5 && 
                           (awayGamesWon - homeGamesWon) >= 1;
  
  if (homeAtMatchPoint || awayAtMatchPoint) {
    return {
      isClosed: true,
      reason: 'Market closed - match point',
      category: 'commercial_certainty',
    };
  }
  
  // RULE 2: One player has won required number of sets (match over)
  if (homeSetsWon >= setsToWin || awaySetsWon >= setsToWin) {
    return {
      isClosed: true,
      reason: 'Market closed - match decided',
      category: 'commercial_certainty',
    };
  }
  
  // RULE 3: Decisive lead in final set (e.g., 5-2 in games)
  const setsDiff = Math.abs(homeSetsWon - awaySetsWon);
  const gamesDiff = Math.abs(homeGamesWon - awayGamesWon);
  
  if (setsDiff === (setsToWin - 1) && gamesDiff >= 3 && (homeGamesWon >= 5 || awayGamesWon >= 5)) {
    return {
      isClosed: true,
      reason: 'Market closed - decisive lead in final set',
      category: 'commercial_certainty',
    };
  }
  
  return { isClosed: false };
}

/**
 * Master function to check if betting market should be closed
 * Routes to sport-specific rules based on league ID
 */
export function shouldMarketBeClosed(game: GameState): MarketClosureResult {
  // Always allow betting on upcoming games
  if (game.status === 'upcoming') {
    return { isClosed: false };
  }
  
  // Never allow betting on finished games
  if (game.status === 'finished') {
    return {
      isClosed: true,
      reason: 'Market closed - game finished',
      category: 'commercial_certainty',
    };
  }
  
  // Route to sport-specific rules
  const leagueId = game.leagueId;
  
  try {
    if (leagueId === 'NBA') {
      return checkNBAMarketClosure(game);
    } else if (leagueId === 'NFL' || leagueId === 'NCAAF') {
      return checkNFLMarketClosure(game);
    } else if (leagueId === 'NCAAB') {
      return checkNCAABMarketClosure(game);
    } else if (leagueId === 'MLB') {
      return checkMLBMarketClosure(game);
    } else if (leagueId === 'NHL') {
      return checkNHLMarketClosure(game);
    } else if (leagueId === 'MLS' || leagueId === 'EPL' || leagueId === 'LA_LIGA' || 
               leagueId === 'BUNDESLIGA' || leagueId === 'IT_SERIE_A' || leagueId === 'FR_LIGUE_1') {
      return checkSoccerMarketClosure(game);
    } else if (leagueId === 'ATP' || leagueId === 'WTA' || leagueId === 'ITF') {
      return checkTennisMarketClosure(game);
    }
    
    // Default: allow betting for unknown/unsupported leagues
    return { isClosed: false };
  } catch (error) {
    logger.error('Error checking market closure', { error, gameState: game });
    // On error, err on the side of caution and close the market
    return {
      isClosed: true,
      reason: 'Market temporarily unavailable',
      category: 'commercial_certainty',
    };
  }
}

/**
 * Validate if a bet can be placed on a game given current game state
 * Returns null if bet is allowed, or an error message if market is closed
 */
export function validateBetPlacement(game: GameState): string | null {
  const closureResult = shouldMarketBeClosed(game);
  
  if (closureResult.isClosed) {
    logger.info('Bet placement blocked - market closed', {
      leagueId: game.leagueId,
      reason: closureResult.reason,
      category: closureResult.category,
    });
    
    return closureResult.reason || 'Betting is currently closed for this game';
  }
  
  return null; // Bet is allowed
}

// ============================================================================
// PERIOD/QUARTER/HALF PROP FILTERING
// ============================================================================

/**
 * Check if a specific period/quarter/half has completed
 * Used to filter out game props for periods that have already ended
 * 
 * Industry Standard: Props for completed periods should not be offered
 * Example: NHL 1st period props should not be available after 1st period ends
 * 
 * @param periodID - The period identifier (e.g., '1q', '2q', '1h', '1p')
 * @param gameState - Current game state including period and league
 * @returns true if the period has completed, false otherwise
 */
export function isPeriodCompleted(periodID: string, gameState: GameState): boolean {
  // Upcoming games: no periods completed yet
  if (gameState.status === 'upcoming') {
    return false;
  }
  
  // Finished games: all periods completed
  if (gameState.status === 'finished') {
    return true;
  }
  
  // Live games: check current period against prop period
  const currentPeriod = gameState.period?.toLowerCase() || '';
  const propPeriod = periodID.toLowerCase();
  const leagueId = gameState.leagueId;
  
  // Handle full game props (never filter these based on period)
  if (propPeriod === 'game' || propPeriod === 'full') {
    return false;
  }
  
  // Validate inputs
  if (!periodID || !gameState) {
    console.warn('[isPeriodCompleted] Invalid inputs: periodID or gameState is missing');
    return false;
  }
  
  // NBA/NCAAB - Quarters (1q, 2q, 3q, 4q) and Halves (1h, 2h)
  if (leagueId === 'NBA' || leagueId === 'NCAAB') {
    // Quarter props (NCAAB won't have these due to SDK filtering)
    if (propPeriod === '1q') {
      // 1Q prop is completed if we're in Q2, Q3, Q4, or later
      return currentPeriod.includes('2') || currentPeriod.includes('3') || 
             currentPeriod.includes('4') || currentPeriod.includes('ot') || 
             currentPeriod.includes('overtime');
    }
    if (propPeriod === '2q') {
      return currentPeriod.includes('3') || currentPeriod.includes('4') || 
             currentPeriod.includes('ot') || currentPeriod.includes('overtime');
    }
    if (propPeriod === '3q') {
      return currentPeriod.includes('4') || currentPeriod.includes('ot') || 
             currentPeriod.includes('overtime');
    }
    if (propPeriod === '4q') {
      // 4Q prop is completed only after game ends (overtime starts)
      return currentPeriod.includes('ot') || currentPeriod.includes('overtime');
    }
    
    // Half props
    if (propPeriod === '1h') {
      // 1H prop is completed if we're in 2H (Q3/Q4) or later
      return currentPeriod.includes('3') || currentPeriod.includes('4') || 
             currentPeriod.includes('ot') || currentPeriod.includes('overtime') ||
             currentPeriod.includes('2nd') || currentPeriod.includes('second');
    }
    if (propPeriod === '2h') {
      // 2H prop is completed only after game ends (overtime starts)
      // 2H includes Q3 and Q4, so it's only complete when game is over
      return currentPeriod.includes('ot') || currentPeriod.includes('overtime');
    }
    
    // Overtime/special cases
    if (propPeriod === 'ot' || propPeriod === 'overtime') {
      return currentPeriod.includes('so') || currentPeriod.includes('shootout');
    }
  }
  
  // NFL/NCAAF - Quarters (1q, 2q, 3q, 4q) and Halves (1h, 2h)
  if (leagueId === 'NFL' || leagueId === 'NCAAF') {
    // Same logic as basketball
    if (propPeriod === '1q') {
      return currentPeriod.includes('2') || currentPeriod.includes('3') || 
             currentPeriod.includes('4') || currentPeriod.includes('ot') || 
             currentPeriod.includes('overtime');
    }
    if (propPeriod === '2q') {
      return currentPeriod.includes('3') || currentPeriod.includes('4') || 
             currentPeriod.includes('ot') || currentPeriod.includes('overtime');
    }
    if (propPeriod === '3q') {
      return currentPeriod.includes('4') || currentPeriod.includes('ot') || 
             currentPeriod.includes('overtime');
    }
    if (propPeriod === '4q') {
      return currentPeriod.includes('ot') || currentPeriod.includes('overtime');
    }
    if (propPeriod === '1h') {
      // 1H is completed if we're in 2H (Q3/Q4) or later
      return currentPeriod.includes('3') || currentPeriod.includes('4') || 
             currentPeriod.includes('ot') || currentPeriod.includes('overtime') ||
             currentPeriod.includes('2nd') || currentPeriod.includes('second');
    }
    if (propPeriod === '2h') {
      // 2H is completed only after game ends
      return currentPeriod.includes('ot') || currentPeriod.includes('overtime');
    }
  }
  
  // NHL - Periods (1p, 2p, 3p), Regulation (reg), Overtime (ot), Shootout (so)
  if (leagueId === 'NHL') {
    if (propPeriod === '1p') {
      // 1P prop is completed if we're in 2P, 3P, OT, or SO
      return currentPeriod.includes('2') || currentPeriod.includes('3') || 
             currentPeriod.includes('ot') || currentPeriod.includes('overtime') ||
             currentPeriod.includes('so') || currentPeriod.includes('shootout');
    }
    if (propPeriod === '2p') {
      return currentPeriod.includes('3') || currentPeriod.includes('ot') || 
             currentPeriod.includes('overtime') || currentPeriod.includes('so') || 
             currentPeriod.includes('shootout');
    }
    if (propPeriod === '3p') {
      return currentPeriod.includes('ot') || currentPeriod.includes('overtime') ||
             currentPeriod.includes('so') || currentPeriod.includes('shootout');
    }
    if (propPeriod === 'reg') {
      // Regulation props are completed when OT/SO begins
      return currentPeriod.includes('ot') || currentPeriod.includes('overtime') ||
             currentPeriod.includes('so') || currentPeriod.includes('shootout');
    }
    if (propPeriod === 'ot') {
      return currentPeriod.includes('so') || currentPeriod.includes('shootout');
    }
  }
  
  // MLB - Innings (1i, 2i, ..., 9i) and Halves (1h - first 5 innings, 2h - last 4+)
  if (leagueId === 'MLB') {
    const inning = gameState.inning || 1;
    
    // Inning-specific props (1i through 9i)
    const propInningMatch = propPeriod.match(/^(\d+)i$/);
    if (propInningMatch && propInningMatch[1]) {
      const propInning = parseInt(propInningMatch[1]);
      return inning > propInning;
    }
    
    // First 5 innings (1h or f5)
    if (propPeriod === '1h' || propPeriod === 'f5') {
      return inning > 5;
    }
  }
  
  // Soccer - Halves (1h, 2h)
  const soccerLeagues = ['MLS', 'EPL', 'LA_LIGA', 'BUNDESLIGA', 'IT_SERIE_A', 'FR_LIGUE_1'];
  if (soccerLeagues.includes(leagueId)) {
    if (propPeriod === '1h') {
      // 1H is completed if we're in 2H or later
      return currentPeriod.includes('2') || currentPeriod.includes('second') ||
             currentPeriod.includes('stoppage') || currentPeriod.includes('injury') ||
             currentPeriod.includes('added') || currentPeriod.includes('extra');
    }
    if (propPeriod === '2h') {
      // 2H is completed when game ends (extra time)
      return currentPeriod.includes('extra') || currentPeriod.includes('added');
    }
  }
  
  // Tennis - Sets (1s, 2s, 3s, 4s, 5s)
  if (leagueId === 'ATP' || leagueId === 'WTA' || leagueId === 'ITF') {
    const currentSet = gameState.currentSet || 1;
    
    const propSetMatch = propPeriod.match(/^(\d+)s$/);
    if (propSetMatch && propSetMatch[1]) {
      const propSet = parseInt(propSetMatch[1]);
      return currentSet > propSet;
    }
  }
  
  // Default: if we can't determine, don't filter (safer to show than hide)
  console.warn(`[isPeriodCompleted] Unable to determine completion for periodID: ${periodID}, leagueId: ${leagueId}`);
  return false;
}

/**
 * Filter game props to remove markets for completed periods
 * 
 * @param gameProps - Array of game prop objects with periodID
 * @param gameState - Current game state
 * @returns Filtered array of game props with active periods only
 */
export function filterCompletedPeriodProps(
  gameProps: Array<{ periodID?: string; [key: string]: unknown }>,
  gameState: GameState
): Array<{ periodID?: string; [key: string]: unknown }> {
  return gameProps.filter((prop: { periodID?: string; [key: string]: unknown }) => {
    // Keep props without periodID (full game props)
    if (!prop.periodID) {
      return true;
    }
    // Filter out props for completed periods
    const isCompleted = isPeriodCompleted(prop.periodID, gameState);
    if (isCompleted) {
      logger.debug('Filtering completed period prop', {
        periodID: prop.periodID,
        currentPeriod: gameState.period,
        leagueId: gameState.leagueId,
      });
    }
    return !isCompleted;
  });
}
