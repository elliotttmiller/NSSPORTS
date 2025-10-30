/**
 * Industry Standard Sportsbook Betting Rules & Restrictions
 * Based on major sportsbooks: DraftKings, FanDuel, BetMGM, Caesars
 */

import type { Bet } from "@/types";
import type { TeaserType } from "@/types/teaser";
import { 
  getTeaserConfig, 
  isBetEligibleForTeaser,
  validateTeaserBet as validateTeaserBetCore
} from "@/types/teaser";

export interface BettingRuleViolation {
  rule: string;
  message: string;
  conflictingBets?: string[];
}

/**
 * Check if adding a new bet would cause a conflict
 * Used for UI-level prevention (disabling buttons)
 */
export function wouldBetCauseConflict(
  existingBets: Bet[],
  newBet: {
    gameId: string;
    betType: "spread" | "moneyline" | "total" | "player_prop" | "game_prop";
    selection: string;
    line?: number;
    playerProp?: {
      playerId: string;
      statType: string;
    };
  },
  betSlipType: "single" | "parlay" | "teaser"
): boolean {
  // Single bets never conflict with each other
  if (betSlipType === "single") return false;
  
  // Teasers only allow spread and total, so check eligibility
  if (betSlipType === "teaser") {
    // Only spread and total bets allowed in teasers
    if (newBet.betType !== "spread" && newBet.betType !== "total") {
      return true; // Conflict: ineligible bet type
    }
    // No line means ineligible
    if (newBet.line === undefined || newBet.line === null) {
      return true;
    }
  }
  
  // Check for same game conflicts (applies to both parlay and teaser)
  const sameGameBets = existingBets.filter(b => b.gameId === newBet.gameId);
  
  if (sameGameBets.length === 0) return false;
  
  // Check moneyline conflicts
  if (newBet.betType === "moneyline") {
    const existingMoneylines = sameGameBets.filter(b => b.betType === "moneyline");
    if (existingMoneylines.length > 0) {
      // If there's already a moneyline bet on this game, any other side conflicts
      const existingSelection = existingMoneylines[0].selection;
      if (existingSelection !== newBet.selection) {
        return true; // Opposite sides
      }
    }
  }
  
  // Check spread conflicts
  if (newBet.betType === "spread") {
    const existingSpreads = sameGameBets.filter(b => b.betType === "spread");
    if (existingSpreads.length > 0) {
      const existingSelection = existingSpreads[0].selection;
      if (existingSelection !== newBet.selection) {
        return true; // Opposite sides
      }
    }
  }
  
  // Check total conflicts
  if (newBet.betType === "total") {
    const existingTotals = sameGameBets.filter(b => b.betType === "total");
    if (existingTotals.length > 0) {
      const existingSelection = existingTotals[0].selection;
      if (existingSelection !== newBet.selection) {
        return true; // Over vs Under
      }
    }
  }
  
  // Check player prop conflicts
  if (newBet.betType === "player_prop" && newBet.playerProp) {
    const existingPlayerProps = sameGameBets.filter(
      b => b.betType === "player_prop" && 
           b.playerProp?.playerId === newBet.playerProp?.playerId
    );
    
    if (existingPlayerProps.length > 0) {
      // Check for same stat type with opposite selection
      const sameStatProps = existingPlayerProps.filter(
        b => b.playerProp?.statType === newBet.playerProp?.statType &&
             b.line === newBet.line
      );
      
      if (sameStatProps.length > 0) {
        const existingSelection = sameStatProps[0].selection;
        if (existingSelection !== newBet.selection) {
          return true; // Over vs Under for same prop
        }
      }
      
      // Check for multiple props from same player (always conflicts)
      const differentStatProps = existingPlayerProps.filter(
        b => b.playerProp?.statType !== newBet.playerProp?.statType ||
             b.line !== newBet.line
      );
      
      if (differentStatProps.length > 0) {
        return true; // Multiple props from same player in same game
      }
    }
  }
  
  return false;
}

/**
 * RULE 1: Same Game Parlays - Cannot bet opposite sides of same market
 * Example: Cannot parlay PHI ML + WAS ML in same game
 */
export function checkOpposingSidesRule(bets: Bet[]): BettingRuleViolation | null {
  const gameMarkets = new Map<string, Bet[]>();
  
  // Group bets by game and market type
  bets.forEach(bet => {
    const key = `${bet.gameId}-${bet.betType}`;
    if (!gameMarkets.has(key)) {
      gameMarkets.set(key, []);
    }
    gameMarkets.get(key)!.push(bet);
  });
  
  // Check each market for opposing sides
  for (const [_key, marketBets] of gameMarkets.entries()) {
    if (marketBets.length < 2) continue;
    
    const betType = marketBets[0].betType;
    
    // Check moneyline conflicts
    if (betType === "moneyline") {
      const hasHome = marketBets.some(b => b.selection === "home");
      const hasAway = marketBets.some(b => b.selection === "away");
      
      if (hasHome && hasAway) {
        return {
          rule: "OPPOSING_SIDES",
          message: "Cannot parlay both teams to win in the same game",
          conflictingBets: marketBets.map(b => b.id),
        };
      }
    }
    
    // Check spread conflicts (both sides of spread)
    if (betType === "spread") {
      const hasHome = marketBets.some(b => b.selection === "home");
      const hasAway = marketBets.some(b => b.selection === "away");
      
      if (hasHome && hasAway) {
        return {
          rule: "OPPOSING_SIDES",
          message: "Cannot parlay both sides of the spread in the same game",
          conflictingBets: marketBets.map(b => b.id),
        };
      }
    }
    
    // Check total conflicts (over/under)
    if (betType === "total") {
      const hasOver = marketBets.some(b => b.selection === "over");
      const hasUnder = marketBets.some(b => b.selection === "under");
      
      if (hasOver && hasUnder) {
        return {
          rule: "OPPOSING_SIDES",
          message: "Cannot parlay both over and under in the same game",
          conflictingBets: marketBets.map(b => b.id),
        };
      }
    }
  }
  
  return null;
}

/**
 * RULE 2: Same Player Props - Cannot bet opposite sides of same prop
 * Example: Cannot parlay Player A OVER 5.5 assists + UNDER 5.5 assists
 */
export function checkSamePlayerPropRule(bets: Bet[]): BettingRuleViolation | null {
  const playerProps = bets.filter(b => b.betType === "player_prop" && b.playerProp);
  
  const propMap = new Map<string, Bet[]>();
  
  playerProps.forEach(bet => {
    if (!bet.playerProp) return;
    
    // Key: gameId-playerId-statType-line
    const key = `${bet.gameId}-${bet.playerProp.playerId}-${bet.playerProp.statType}-${bet.line}`;
    if (!propMap.has(key)) {
      propMap.set(key, []);
    }
    propMap.get(key)!.push(bet);
  });
  
  for (const [_key, props] of propMap.entries()) {
    if (props.length < 2) continue;
    
    const hasOver = props.some(p => p.selection === "over");
    const hasUnder = props.some(p => p.selection === "under");
    
    if (hasOver && hasUnder) {
      const playerName = props[0].playerProp?.playerName || "Player";
      const statType = props[0].playerProp?.statType || "stat";
      
      return {
        rule: "OPPOSING_PLAYER_PROPS",
        message: `Cannot parlay both over and under for ${playerName}'s ${statType}`,
        conflictingBets: props.map(p => p.id),
      };
    }
  }
  
  return null;
}

/**
 * RULE 3: Correlated Parlays - Cannot combine highly correlated outcomes
 * Example: Team total OVER + Game total OVER in same game (too correlated)
 */
export function checkCorrelatedParlaysRule(bets: Bet[]): BettingRuleViolation | null {
  // Group by game
  const gameGroups = new Map<string, Bet[]>();
  bets.forEach(bet => {
    if (!gameGroups.has(bet.gameId)) {
      gameGroups.set(bet.gameId, []);
    }
    gameGroups.get(bet.gameId)!.push(bet);
  });
  
  // Check for highly correlated combinations in same game
  for (const [_gameId, gameBets] of gameGroups.entries()) {
    if (gameBets.length < 2) continue;
    
    // Check: Moneyline + Spread of same team (allowed by most books but some restrict)
    // Check: Total + Team total (correlated)
    const hasGameTotal = gameBets.some(b => b.betType === "total");
    const hasTeamTotal = gameBets.some(b => 
      b.betType === "game_prop" && 
      b.gameProp?.propType?.toLowerCase().includes("team total")
    );
    
    if (hasGameTotal && hasTeamTotal) {
      return {
        rule: "CORRELATED_OUTCOMES",
        message: "Cannot parlay game total with team total in the same game",
        conflictingBets: gameBets.map(b => b.id),
      };
    }
  }
  
  return null;
}

/**
 * RULE 4: Minimum Parlay Requirements
 * - Must have at least 2 bets for a parlay
 * - Maximum typically 10-20 bets (varies by book)
 */
export function checkParlayCountRule(bets: Bet[]): BettingRuleViolation | null {
  if (bets.length < 2) {
    return {
      rule: "MIN_PARLAY_LEGS",
      message: "Parlay requires at least 2 selections",
    };
  }
  
  if (bets.length > 15) {
    return {
      rule: "MAX_PARLAY_LEGS",
      message: "Maximum 15 selections allowed in a parlay",
    };
  }
  
  return null;
}

/**
 * RULE 5: Duplicate Bet Check
 * Cannot add the exact same bet twice
 */
export function checkDuplicateBetRule(existingBets: Bet[], newBet: Bet): BettingRuleViolation | null {
  const duplicate = existingBets.find(bet => bet.id === newBet.id);
  
  if (duplicate) {
    return {
      rule: "DUPLICATE_BET",
      message: "This bet is already in your slip",
      conflictingBets: [newBet.id],
    };
  }
  
  return null;
}

/**
 * RULE 6: Same Game Parlay Player Props Restrictions
 * Cannot combine multiple props from same player in same game parlay
 * Example: Cannot parlay Player A points + Player A assists in SGP
 */
export function checkSamePlayerMultiPropsRule(bets: Bet[]): BettingRuleViolation | null {
  const gamePlayerProps = new Map<string, Map<string, Bet[]>>();
  
  bets.forEach(bet => {
    if (bet.betType !== "player_prop" || !bet.playerProp) return;
    
    if (!gamePlayerProps.has(bet.gameId)) {
      gamePlayerProps.set(bet.gameId, new Map());
    }
    
    const gamePlayers = gamePlayerProps.get(bet.gameId)!;
    const playerId = bet.playerProp.playerId;
    
    if (!gamePlayers.has(playerId)) {
      gamePlayers.set(playerId, []);
    }
    
    gamePlayers.get(playerId)!.push(bet);
  });
  
  // Check each game for players with multiple props
  for (const [_gameId, players] of gamePlayerProps.entries()) {
    for (const [_playerId, playerBets] of players.entries()) {
      if (playerBets.length > 1) {
        const playerName = playerBets[0].playerProp?.playerName || "Player";
        
        return {
          rule: "MULTIPLE_PLAYER_PROPS",
          message: `Cannot parlay multiple props for ${playerName} in the same game`,
          conflictingBets: playerBets.map(b => b.id),
        };
      }
    }
  }
  
  return null;
}

/**
 * RULE 7: Minimum Stake Validation
 */
export function checkMinimumStakeRule(stake: number): BettingRuleViolation | null {
  const MIN_STAKE = 0.01;
  
  if (stake < MIN_STAKE) {
    return {
      rule: "MIN_STAKE",
      message: `Minimum stake is $${MIN_STAKE.toFixed(2)}`,
    };
  }
  
  return null;
}

/**
 * RULE 8: Maximum Stake/Payout Limits
 */
export function checkMaximumStakeRule(stake: number, payout: number): BettingRuleViolation | null {
  const MAX_STAKE = 10000;
  const MAX_PAYOUT = 100000;
  
  if (stake > MAX_STAKE) {
    return {
      rule: "MAX_STAKE",
      message: `Maximum stake is $${MAX_STAKE.toLocaleString()}`,
    };
  }
  
  if (payout > MAX_PAYOUT) {
    return {
      rule: "MAX_PAYOUT",
      message: `Maximum payout is $${MAX_PAYOUT.toLocaleString()}`,
    };
  }
  
  return null;
}

/**
 * Main Validation Function - Runs all parlay rules
 */
export function validateParlayBets(bets: Bet[]): BettingRuleViolation | null {
  // Must have at least 2 bets
  const countCheck = checkParlayCountRule(bets);
  if (countCheck) return countCheck;
  
  // Check for opposing sides (most critical)
  const opposingCheck = checkOpposingSidesRule(bets);
  if (opposingCheck) return opposingCheck;
  
  // Check for same player prop conflicts
  const playerPropCheck = checkSamePlayerPropRule(bets);
  if (playerPropCheck) return playerPropCheck;
  
  // Check for multiple props from same player
  const multiPropCheck = checkSamePlayerMultiPropsRule(bets);
  if (multiPropCheck) return multiPropCheck;
  
  // Check for correlated outcomes
  const correlatedCheck = checkCorrelatedParlaysRule(bets);
  if (correlatedCheck) return correlatedCheck;
  
  return null;
}

/**
 * TEASER RULES
 */

/**
 * Validate teaser bet
 */
export function validateTeaserBets(
  bets: Bet[], 
  teaserType: TeaserType
): BettingRuleViolation | null {
  const result = validateTeaserBetCore(bets, teaserType);
  
  if (!result.valid) {
    return {
      rule: "TEASER_VALIDATION",
      message: result.error || "Invalid teaser bet",
    };
  }
  
  return null;
}

/**
 * Check if bet would be eligible for teaser
 */
export function checkTeaserEligibility(
  bet: Bet,
  teaserType: TeaserType
): BettingRuleViolation | null {
  if (!isBetEligibleForTeaser(bet, teaserType)) {
    const config = getTeaserConfig(teaserType);
    return {
      rule: "TEASER_ELIGIBILITY",
      message: `Only spread and total bets from ${config.eligibleLeagues.join(", ")} are eligible for ${config.displayName}`,
    };
  }
  
  return null;
}

/**
 * Validate Single Bet Addition
 */
export function validateBetAddition(existingBets: Bet[], newBet: Bet, betType: "single" | "parlay" | "teaser", teaserType?: TeaserType): BettingRuleViolation | null {
  // Check for duplicate
  const duplicateCheck = checkDuplicateBetRule(existingBets, newBet);
  if (duplicateCheck) return duplicateCheck;
  
  // If teaser mode, check teaser eligibility and rules
  if (betType === "teaser" && teaserType) {
    const eligibilityCheck = checkTeaserEligibility(newBet, teaserType);
    if (eligibilityCheck) return eligibilityCheck;
    
    const allBets = [...existingBets, newBet];
    return validateTeaserBets(allBets, teaserType);
  }
  
  // If parlay mode, check if adding this bet would create conflicts
  if (betType === "parlay") {
    const allBets = [...existingBets, newBet];
    return validateParlayBets(allBets);
  }
  
  return null;
}

/**
 * Validate Bet Placement (before submission)
 */
export function validateBetPlacement(
  bets: Bet[], 
  betType: "single" | "parlay" | "teaser", 
  stakes: { [betId: string]: number },
  teaserType?: TeaserType
): BettingRuleViolation | null {
  // Validate stakes
  for (const bet of bets) {
    const stake = stakes[bet.id] || bet.stake || 0;
    
    const minStakeCheck = checkMinimumStakeRule(stake);
    if (minStakeCheck) return minStakeCheck;
    
    const maxStakeCheck = checkMaximumStakeRule(stake, bet.potentialPayout);
    if (maxStakeCheck) return maxStakeCheck;
  }
  
  // If teaser, validate teaser rules
  if (betType === "teaser" && teaserType) {
    return validateTeaserBets(bets, teaserType);
  }
  
  // If parlay, validate parlay rules
  if (betType === "parlay") {
    return validateParlayBets(bets);
  }
  
  return null;
}
