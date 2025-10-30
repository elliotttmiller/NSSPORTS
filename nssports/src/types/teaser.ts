/**
 * Teaser Bet Types and Configuration
 * 
 * Teasers allow bettors to adjust point spreads/totals in their favor
 * across multiple games (2+ legs) in exchange for reduced odds.
 * 
 * Industry Standard Rules (DraftKings, FanDuel, BetMGM):
 * - NFL: 6, 6.5, or 7 point adjustments available
 * - NBA: 4, 4.5, or 5 point adjustments available
 * - Only spreads and totals eligible (no moneylines)
 * - Minimum 2 legs required
 * - Push handling varies by teaser type (push/lose/revert)
 * 
 * Research Sources:
 * - DraftKings Official Teaser Rules
 * - FanDuel Teaser Guide
 * - BetMGM Teaser Betting Guide
 * - Wizard of Odds NFL Teaser Analysis
 * - Boyd's Bets Teaser Strategy & Payout Charts
 */

import type { Bet } from "@/types";

/**
 * Teaser type definitions based on problem statement requirements
 */
export type TeaserType = 
  | "2T_TEASER"           // 2 Team Teaser (Ties Push)
  | "3T_SUPER_TEASER"     // 3 Team Super Teaser (Ties Lose)
  | "3T_TEASER"           // 3 Team Teaser (Reverts down)
  | "4T_MONSTER_TEASER"   // 4 Team Monster Teaser (Ties Lose)
  | "4T_TEASER"           // 4 Team Teaser (Reverts down)
  | "5T_TEASER"           // 5 Team Teaser (Reverts down)
  | "6T_TEASER"           // 6 Team Teaser (Reverts down)
  | "7T_TEASER"           // 7 Team Teaser (Reverts down)
  | "8T_TEASER";          // 8 Team Teaser (Reverts down)

/**
 * How ties/pushes are handled in teaser
 */
export type TeaserPushRule = 
  | "push"      // Tie = Push (bet refunded, stake returned)
  | "lose"      // Tie = Lose (entire bet loses)
  | "revert";   // Tie = Revert down (reduces to lower leg count with adjusted payout)

/**
 * Teaser configuration for each type
 */
export interface TeaserConfig {
  type: TeaserType;
  minLegs: number;
  maxLegs: number;
  pointAdjustment: number;  // Points to adjust spread/total
  pushRule: TeaserPushRule;
  odds: number;             // Standard odds for this teaser type (American format)
  displayName: string;
  description: string;
  eligibleBetTypes: ("spread" | "total")[];
  eligibleLeagues: string[]; // ["NFL", "NBA", "NCAAF", "NCAAB"]
  nbaPointAdjustment?: number; // Different adjustment for NBA (if applicable)
}

/**
 * Standard teaser configurations based on industry standards
 * Odds sourced from DraftKings, FanDuel, BetMGM payout tables
 * 
 * NFL Standard: 6-point teaser
 * NBA Standard: 4-point teaser
 * 
 * Typical Odds Structure:
 * - 2 Teams: -110 (6pt), -120 (6.5pt), -130 (7pt)
 * - 3 Teams: +160 to +180 (6pt), +140 (7pt)
 * - 4 Teams: +260 to +300 (6pt), +200 (7pt)
 * - 5 Teams: +400 to +450 (6pt), +350 (7pt)
 * - 6+ Teams: +600 to +700+ (6pt)
 */
export const TEASER_CONFIGS: Record<TeaserType, TeaserConfig> = {
  "2T_TEASER": {
    type: "2T_TEASER",
    minLegs: 2,
    maxLegs: 2,
    pointAdjustment: 6,      // 6 points for NFL
    nbaPointAdjustment: 4,   // 4 points for NBA
    pushRule: "push",        // Push = no action, stake refunded
    odds: -110,              // Standard -110 odds (risk $110 to win $100)
    displayName: "2 Team Teaser",
    description: "2 Team Teaser (Ties Push)",
    eligibleBetTypes: ["spread", "total"],
    eligibleLeagues: ["NFL", "NBA", "NCAAF", "NCAAB"],
  },
  "3T_SUPER_TEASER": {
    type: "3T_SUPER_TEASER",
    minLegs: 3,
    maxLegs: 3,
    pointAdjustment: 10,     // Super teaser = more points (10 for NFL, 7 for NBA)
    nbaPointAdjustment: 7,
    pushRule: "lose",        // Push = entire bet loses (higher risk)
    odds: -120,              // Worse odds due to favorable lines
    displayName: "3 Team Super Teaser",
    description: "3 Team Super Teaser (Ties Lose)",
    eligibleBetTypes: ["spread", "total"],
    eligibleLeagues: ["NFL", "NBA", "NCAAF", "NCAAB"],
  },
  "3T_TEASER": {
    type: "3T_TEASER",
    minLegs: 3,
    maxLegs: 3,
    pointAdjustment: 6,
    nbaPointAdjustment: 4,
    pushRule: "revert",      // Push = reverts to 2-team teaser
    odds: 180,               // +180 positive odds
    displayName: "3 Team Teaser",
    description: "3 Team Teaser (Reverts Down)",
    eligibleBetTypes: ["spread", "total"],
    eligibleLeagues: ["NFL", "NBA", "NCAAF", "NCAAB"],
  },
  "4T_MONSTER_TEASER": {
    type: "4T_MONSTER_TEASER",
    minLegs: 4,
    maxLegs: 4,
    pointAdjustment: 13,     // Monster = even more points (13 for NFL, 10 for NBA)
    nbaPointAdjustment: 10,
    pushRule: "lose",        // Push = entire bet loses
    odds: -140,              // Worse odds due to extremely favorable lines
    displayName: "4 Team Monster Teaser",
    description: "4 Team Monster Teaser (Ties Lose)",
    eligibleBetTypes: ["spread", "total"],
    eligibleLeagues: ["NFL", "NBA", "NCAAF", "NCAAB"],
  },
  "4T_TEASER": {
    type: "4T_TEASER",
    minLegs: 4,
    maxLegs: 4,
    pointAdjustment: 6,
    nbaPointAdjustment: 4,
    pushRule: "revert",      // Push = reverts to 3-team teaser
    odds: 300,               // +300 positive odds
    displayName: "4 Team Teaser",
    description: "4 Team Teaser (Reverts Down)",
    eligibleBetTypes: ["spread", "total"],
    eligibleLeagues: ["NFL", "NBA", "NCAAF", "NCAAB"],
  },
  "5T_TEASER": {
    type: "5T_TEASER",
    minLegs: 5,
    maxLegs: 5,
    pointAdjustment: 6,
    nbaPointAdjustment: 4,
    pushRule: "revert",      // Push = reverts to 4-team teaser
    odds: 450,               // +450 positive odds
    displayName: "5 Team Teaser",
    description: "5 Team Teaser (Reverts Down)",
    eligibleBetTypes: ["spread", "total"],
    eligibleLeagues: ["NFL", "NBA", "NCAAF", "NCAAB"],
  },
  "6T_TEASER": {
    type: "6T_TEASER",
    minLegs: 6,
    maxLegs: 6,
    pointAdjustment: 6,
    nbaPointAdjustment: 4,
    pushRule: "revert",      // Push = reverts to 5-team teaser
    odds: 700,               // +700 positive odds
    displayName: "6 Team Teaser",
    description: "6 Team Teaser (Reverts Down)",
    eligibleBetTypes: ["spread", "total"],
    eligibleLeagues: ["NFL", "NBA", "NCAAF", "NCAAB"],
  },
  "7T_TEASER": {
    type: "7T_TEASER",
    minLegs: 7,
    maxLegs: 7,
    pointAdjustment: 6,
    nbaPointAdjustment: 4,
    pushRule: "revert",      // Push = reverts to 6-team teaser
    odds: 1000,              // +1000 positive odds
    displayName: "7 Team Teaser",
    description: "7 Team Teaser (Reverts Down)",
    eligibleBetTypes: ["spread", "total"],
    eligibleLeagues: ["NFL", "NBA", "NCAAF", "NCAAB"],
  },
  "8T_TEASER": {
    type: "8T_TEASER",
    minLegs: 8,
    maxLegs: 8,
    pointAdjustment: 6,
    nbaPointAdjustment: 4,
    pushRule: "revert",      // Push = reverts to 7-team teaser
    odds: 1500,              // +1500 positive odds
    displayName: "8 Team Teaser",
    description: "8 Team Teaser (Reverts Down)",
    eligibleBetTypes: ["spread", "total"],
    eligibleLeagues: ["NFL", "NBA", "NCAAF", "NCAAB"],
  },
};

/**
 * Teaser bet interface extending the base Bet type
 */
export interface TeaserBet {
  id: string;
  teaserType: TeaserType;
  legs: Bet[];              // Individual bets in the teaser
  stake: number;
  adjustedLegs: TeasedLeg[]; // Legs with adjusted lines
  potentialPayout: number;
  odds: number;
}

/**
 * Individual leg in a teaser with adjusted line
 */
export interface TeasedLeg {
  betId: string;
  gameId: string;
  betType: "spread" | "total";
  selection: string;
  originalLine: number;
  adjustedLine: number;     // Line after teaser adjustment
  pointAdjustment: number;
  game: Bet["game"];
}

/**
 * Get teaser config by type
 */
export function getTeaserConfig(type: TeaserType): TeaserConfig {
  return TEASER_CONFIGS[type];
}

/**
 * Get all available teaser types
 */
export function getAvailableTeaserTypes(): TeaserType[] {
  return Object.keys(TEASER_CONFIGS) as TeaserType[];
}

/**
 * Check if a bet is eligible for teaser
 */
export function isBetEligibleForTeaser(bet: Bet, teaserType: TeaserType): boolean {
  const config = getTeaserConfig(teaserType);
  
  // Must be spread or total
  if (!config.eligibleBetTypes.includes(bet.betType as "spread" | "total")) {
    return false;
  }
  
  // Must have a line
  if (bet.line === undefined || bet.line === null) {
    return false;
  }
  
  // Must be from eligible league
  const leagueId = bet.game?.leagueId?.toUpperCase();
  if (!leagueId || !config.eligibleLeagues.includes(leagueId)) {
    return false;
  }
  
  return true;
}

/**
 * Get point adjustment based on league
 * NBA uses different point adjustments than NFL
 */
export function getPointAdjustment(teaserType: TeaserType, leagueId: string): number {
  const config = getTeaserConfig(teaserType);
  const league = leagueId.toUpperCase();
  
  // NBA and NCAAB use basketball adjustments
  if ((league === "NBA" || league === "NCAAB") && config.nbaPointAdjustment) {
    return config.nbaPointAdjustment;
  }
  
  // NFL and NCAAF use football adjustments
  return config.pointAdjustment;
}

/**
 * Calculate adjusted line for a teaser leg
 * 
 * Industry Standard Line Movement:
 * - NFL/NCAAF: 6, 6.5, or 7 points
 * - NBA/NCAAB: 4, 4.5, or 5 points
 * 
 * @param originalLine - Original spread or total line
 * @param selection - "home", "away", "over", "under"
 * @param pointAdjustment - Points to adjust (6, 7, etc.)
 * @param betType - "spread" or "total"
 * @returns Adjusted line in bettor's favor
 */
export function calculateAdjustedLine(
  originalLine: number,
  selection: string,
  pointAdjustment: number,
  betType: "spread" | "total"
): number {
  if (betType === "spread") {
    // Spread teaser logic:
    // - Adjust line in bettor's favor (move closer to 0)
    // - Negative spread becomes less negative (easier to cover)
    // - Positive spread becomes more positive (easier to cover)
    //
    // Examples with 6-point teaser:
    // - Team favored by -7 becomes -1 (ADD 6 points: -7 + 6 = -1)
    // - Team underdog at +3 becomes +9 (ADD 6 points: +3 + 6 = +9)
    //
    // The sign of original line determines direction but we always ADD points
    return originalLine + pointAdjustment;
  } else {
    // Total (over/under) teaser logic:
    // - OVER: Subtract points to make it easier to go over (lower total)
    // - UNDER: Add points to make it easier to stay under (higher total)
    //
    // Examples with 6-point teaser:
    // - Over 45.5 becomes Over 39.5 (SUBTRACT 6: 45.5 - 6 = 39.5)
    // - Under 45.5 becomes Under 51.5 (ADD 6: 45.5 + 6 = 51.5)
    if (selection === "over") {
      return originalLine - pointAdjustment;
    } else {
      return originalLine + pointAdjustment;
    }
  }
}

/**
 * Calculate teaser payout using American odds format
 * 
 * American Odds Formula:
 * - Negative odds (e.g., -110): Payout = (stake × 100) / abs(odds)
 * - Positive odds (e.g., +300): Payout = (stake × odds) / 100
 * 
 * @param stake - Amount wagered
 * @param odds - American odds (e.g., -110, +300)
 * @returns Profit amount (not including stake)
 */
export function calculateTeaserPayout(stake: number, odds: number): number {
  if (odds > 0) {
    // Positive odds: (stake * odds / 100)
    // Example: $100 at +300 = $100 × 300 / 100 = $300 profit
    return stake * (odds / 100);
  } else {
    // Negative odds: (stake * 100 / abs(odds))
    // Example: $110 at -110 = $110 × 100 / 110 = $100 profit
    return stake * (100 / Math.abs(odds));
  }
}

/**
 * Validate teaser bet
 */
export function validateTeaserBet(
  legs: Bet[],
  teaserType: TeaserType
): { valid: boolean; error?: string } {
  const config = getTeaserConfig(teaserType);
  
  // Check leg count
  if (legs.length < config.minLegs) {
    return {
      valid: false,
      error: `${config.displayName} requires at least ${config.minLegs} legs`,
    };
  }
  
  if (legs.length > config.maxLegs) {
    return {
      valid: false,
      error: `${config.displayName} allows maximum ${config.maxLegs} legs`,
    };
  }
  
  // Check all legs are eligible
  for (const leg of legs) {
    if (!isBetEligibleForTeaser(leg, teaserType)) {
      return {
        valid: false,
        error: `One or more selections are not eligible for ${config.displayName}`,
      };
    }
  }
  
  // Check no duplicate games
  const gameIds = legs.map(leg => leg.gameId);
  const uniqueGameIds = new Set(gameIds);
  if (gameIds.length !== uniqueGameIds.size) {
    return {
      valid: false,
      error: "Cannot include multiple selections from the same game in a teaser",
    };
  }
  
  return { valid: true };
}
