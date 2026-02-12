/**
 * Arbitrage Detection & Calculator Service
 * 
 * Industry-standard implementation for detecting and calculating arbitrage opportunities
 * (also known as "sure bets" or "miracle bets") across multiple sportsbooks.
 * 
 * Key Concepts:
 * - Arbitrage exists when the sum of inverse odds < 1 (or 100%)
 * - Proper stake distribution ensures guaranteed profit regardless of outcome
 * - Real-world arbitrage margins typically range from 0.5% to 5%
 * 
 * Research Sources:
 * - https://dyutam.com/tools/arbitrage-calculator
 * - https://openwager.ai/arbitrage
 * - https://jedibets.com/tools/arbitrage-calculator
 * - https://oddspedia.com/surebets
 */

import { logger } from "@/lib/logger";
// Note: decimalToAmerican imported for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { americanToDecimal, decimalToAmerican } from "./ev-calculator";

/**
 * Outcome with odds from a specific sportsbook
 */
export interface ArbitrageOutcome {
  outcome: string; // e.g., "Team A", "Team B", "Draw", "Over", "Under"
  sportsbook: string; // e.g., "DraftKings", "FanDuel"
  americanOdds: number;
  decimalOdds?: number; // Calculated if not provided
}

/**
 * Arbitrage opportunity details
 */
export interface ArbitrageOpportunity {
  // Input data
  outcomes: ArbitrageOutcome[];
  totalStake: number;
  
  // Arbitrage detection
  isArbitrage: boolean;
  arbitragePercent: number; // <100% means arbitrage exists
  
  // Profit calculations
  profit: number;
  profitPercent: number;
  roi: number; // Return on investment
  
  // Stake distribution
  stakes: {
    outcome: string;
    sportsbook: string;
    stake: number;
    stakePercent: number;
    potentialPayout: number;
  }[];
  
  // Risk assessment
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  warnings: string[];
}

/**
 * Detect if arbitrage opportunity exists
 * 
 * Arbitrage exists when: Sum(1/Odds_i) < 1 (for decimal odds)
 * Or: Sum(Implied_Probability_i) < 100%
 * 
 * @param outcomes Array of outcomes with odds from different sportsbooks
 * @returns Arbitrage percentage (< 100% indicates arbitrage)
 */
export function detectArbitrage(outcomes: ArbitrageOutcome[]): {
  isArbitrage: boolean;
  arbitragePercent: number;
  impliedProbabilities: number[];
} {
  if (outcomes.length < 2) {
    throw new Error('At least 2 outcomes required for arbitrage detection');
  }
  
  // Convert all odds to decimal and calculate implied probabilities
  const impliedProbabilities = outcomes.map(outcome => {
    const decimalOdds = outcome.decimalOdds || americanToDecimal(outcome.americanOdds);
    return 1 / decimalOdds;
  });
  
  // Calculate arbitrage percentage
  const arbitragePercent = impliedProbabilities.reduce((sum, prob) => sum + prob, 0) * 100;
  
  return {
    isArbitrage: arbitragePercent < 100,
    arbitragePercent,
    impliedProbabilities,
  };
}

/**
 * Calculate optimal stake distribution for arbitrage opportunity
 * 
 * Stake formula: Stake_i = (Total_Stake × (1 / Odds_i)) ÷ (sum of all (1 / Odds_i))
 * 
 * This ensures equal payout regardless of which outcome wins
 */
export function calculateArbitrageStakes(
  outcomes: ArbitrageOutcome[],
  totalStake: number
): {
  outcome: string;
  sportsbook: string;
  stake: number;
  stakePercent: number;
  potentialPayout: number;
  decimalOdds: number;
}[] {
  // Convert all odds to decimal
  const decimalOdds = outcomes.map(outcome => 
    outcome.decimalOdds || americanToDecimal(outcome.americanOdds)
  );
  
  // Calculate inverse odds sum
  const inverseOddsSum = decimalOdds.reduce((sum, odds) => sum + (1 / odds), 0);
  
  // Calculate stake for each outcome
  return outcomes.map((outcome, index) => {
    const odds = decimalOdds[index];
    const stake = (totalStake * (1 / odds)) / inverseOddsSum;
    const potentialPayout = stake * odds;
    const stakePercent = (stake / totalStake) * 100;
    
    return {
      outcome: outcome.outcome,
      sportsbook: outcome.sportsbook,
      stake,
      stakePercent,
      potentialPayout,
      decimalOdds: odds,
    };
  });
}

/**
 * Calculate guaranteed profit from arbitrage
 */
export function calculateArbitrageProfit(
  outcomes: ArbitrageOutcome[],
  totalStake: number
): {
  profit: number;
  profitPercent: number;
  roi: number;
  averagePayout: number;
} {
  const stakes = calculateArbitrageStakes(outcomes, totalStake);
  
  // All payouts should be equal in a perfect arbitrage
  const averagePayout = stakes.reduce((sum, s) => sum + s.potentialPayout, 0) / stakes.length;
  
  const profit = averagePayout - totalStake;
  const profitPercent = (profit / totalStake) * 100;
  const roi = profitPercent;
  
  return {
    profit,
    profitPercent,
    roi,
    averagePayout,
  };
}

/**
 * Assess the quality of an arbitrage opportunity
 */
function assessArbitrageQuality(
  profitPercent: number,
  _arbitragePercent: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  // Higher profit margin = better quality
  if (profitPercent >= 3) return 'excellent';
  if (profitPercent >= 2) return 'good';
  if (profitPercent >= 1) return 'fair';
  return 'poor';
}

/**
 * Generate warnings for arbitrage opportunity
 */
function generateArbitrageWarnings(
  outcomes: ArbitrageOutcome[],
  profitPercent: number
): string[] {
  const warnings: string[] = [];
  
  // Warn about low profit margin
  if (profitPercent < 1) {
    warnings.push('Low profit margin (<1%). Consider transaction costs and limits.');
  }
  
  // Warn about large number of outcomes (harder to execute)
  if (outcomes.length > 3) {
    warnings.push('Multiple outcomes increase execution complexity and risk.');
  }
  
  // Check for extreme odds differences (may indicate market inefficiency or errors)
  const decimalOdds = outcomes.map(o => 
    o.decimalOdds || americanToDecimal(o.americanOdds)
  );
  const maxOdds = Math.max(...decimalOdds);
  const minOdds = Math.min(...decimalOdds);
  
  if (maxOdds / minOdds > 3) {
    warnings.push('Large odds disparity detected. Verify odds are current and accurate.');
  }
  
  // Warn about using same sportsbook (not true arbitrage)
  const sportsbooks = new Set(outcomes.map(o => o.sportsbook));
  if (sportsbooks.size === 1) {
    warnings.push('All bets are on the same sportsbook. This is not true arbitrage.');
  }
  
  return warnings;
}

/**
 * Comprehensive arbitrage analysis
 * 
 * Analyzes a potential arbitrage opportunity and provides complete details
 * including stake distribution, profit calculations, and risk assessment
 * 
 * @param outcomes Array of outcomes with odds from different sportsbooks
 * @param totalStake Total amount to invest across all bets
 * @returns Complete arbitrage analysis
 */
export function analyzeArbitrage(
  outcomes: ArbitrageOutcome[],
  totalStake: number
): ArbitrageOpportunity {
  // Validate inputs
  if (outcomes.length < 2) {
    throw new Error('At least 2 outcomes required for arbitrage analysis');
  }
  
  if (totalStake <= 0) {
    throw new Error('Total stake must be positive');
  }
  
  // Ensure all outcomes have decimal odds
  const normalizedOutcomes = outcomes.map(outcome => ({
    ...outcome,
    decimalOdds: outcome.decimalOdds || americanToDecimal(outcome.americanOdds),
  }));
  
  // Detect arbitrage
  const detection = detectArbitrage(normalizedOutcomes);
  
  // Calculate stakes and profit
  const stakes = calculateArbitrageStakes(normalizedOutcomes, totalStake);
  const profitCalc = calculateArbitrageProfit(normalizedOutcomes, totalStake);
  
  // Assess quality
  const quality = assessArbitrageQuality(profitCalc.profitPercent, detection.arbitragePercent);
  
  // Generate warnings
  const warnings = generateArbitrageWarnings(normalizedOutcomes, profitCalc.profitPercent);
  
  logger.info('[Arbitrage] Analysis complete', {
    isArbitrage: detection.isArbitrage,
    arbitragePercent: detection.arbitragePercent,
    profitPercent: profitCalc.profitPercent,
    quality,
  });
  
  return {
    outcomes: normalizedOutcomes,
    totalStake,
    isArbitrage: detection.isArbitrage,
    arbitragePercent: detection.arbitragePercent,
    profit: profitCalc.profit,
    profitPercent: profitCalc.profitPercent,
    roi: profitCalc.roi,
    stakes,
    quality,
    warnings,
  };
}

/**
 * Find arbitrage opportunities from a list of odds from multiple sportsbooks
 * 
 * This is useful when you have odds for the same event from multiple sources
 * and want to find the best combination that creates arbitrage
 * 
 * @param oddsMatrix Matrix of odds where each row is an outcome and each column is a sportsbook
 * @param outcomeNames Names of outcomes (e.g., ["Team A", "Team B"])
 * @param sportsbookNames Names of sportsbooks (e.g., ["DraftKings", "FanDuel"])
 * @returns Best arbitrage opportunity or null if none exists
 */
export function findBestArbitrage(
  oddsMatrix: number[][], // [outcome][sportsbook] = americanOdds
  outcomeNames: string[],
  sportsbookNames: string[]
): ArbitrageOpportunity | null {
  if (oddsMatrix.length !== outcomeNames.length) {
    throw new Error('Odds matrix rows must match outcome names length');
  }
  
  if (oddsMatrix[0].length !== sportsbookNames.length) {
    throw new Error('Odds matrix columns must match sportsbook names length');
  }
  
  // For each outcome, pick the best odds across all sportsbooks
  const bestOutcomes: ArbitrageOutcome[] = outcomeNames.map((outcome, outcomeIndex) => {
    const oddsForOutcome = oddsMatrix[outcomeIndex];
    
    // Find the best (highest) odds for this outcome
    let bestOdds = oddsForOutcome[0];
    let bestBookIndex = 0;
    
    for (let bookIndex = 1; bookIndex < oddsForOutcome.length; bookIndex++) {
      const currentOdds = oddsForOutcome[bookIndex];
      
      // Higher absolute value is better for negative odds
      // Higher value is better for positive odds
      const currentDecimal = americanToDecimal(currentOdds);
      const bestDecimal = americanToDecimal(bestOdds);
      
      if (currentDecimal > bestDecimal) {
        bestOdds = currentOdds;
        bestBookIndex = bookIndex;
      }
    }
    
    return {
      outcome,
      sportsbook: sportsbookNames[bestBookIndex],
      americanOdds: bestOdds,
      decimalOdds: americanToDecimal(bestOdds),
    };
  });
  
  // Analyze the best combination
  const analysis = analyzeArbitrage(bestOutcomes, 1000); // Default $1000 stake
  
  // Only return if arbitrage exists
  return analysis.isArbitrage ? analysis : null;
}

/**
 * Calculate the maximum stake for an arbitrage opportunity
 * given account limits at each sportsbook
 * 
 * @param opportunity The arbitrage opportunity
 * @param sportsbookLimits Map of sportsbook to maximum stake allowed
 * @returns Maximum total stake and adjusted stakes
 */
export function calculateMaxStake(
  opportunity: ArbitrageOpportunity,
  sportsbookLimits: Record<string, number>
): {
  maxTotalStake: number;
  adjustedStakes: typeof opportunity.stakes;
  limitingFactor: string;
} {
  let maxTotalStake = Infinity;
  let limitingFactor = 'none';
  
  // Find the most restrictive limit
  for (const stake of opportunity.stakes) {
    const limit = sportsbookLimits[stake.sportsbook];
    if (limit !== undefined) {
      // Calculate what total stake would max out this bet
      const impliedTotalStake = limit / (stake.stakePercent / 100);
      
      if (impliedTotalStake < maxTotalStake) {
        maxTotalStake = impliedTotalStake;
        limitingFactor = `${stake.sportsbook} limit on ${stake.outcome}`;
      }
    }
  }
  
  // If no limits found, use a reasonable default
  if (maxTotalStake === Infinity) {
    maxTotalStake = 10000; // $10k default
    limitingFactor = 'default limit';
  }
  
  // Recalculate stakes with the max total
  const adjustedStakes = calculateArbitrageStakes(
    opportunity.outcomes,
    maxTotalStake
  );
  
  return {
    maxTotalStake,
    adjustedStakes,
    limitingFactor,
  };
}
