/**
 * EV+ (Expected Value) Calculator Service
 * 
 * Industry-standard implementation based on proven sports betting mathematics:
 * - Expected Value calculation for betting opportunities
 * - Kelly Criterion for optimal bet sizing
 * - Vig-free probability estimation
 * - Sharp line value analysis
 * 
 * Research Sources:
 * - https://app.betherosports.com/calculators/expected-value
 * - https://valuebets.net/tools/kelly-criterion-calculator
 * - https://www.r-bloggers.com/2026/02/designing-sports-betting-systems-in-r-bayesian-probabilities-expected-value-and-kelly-logic/
 */

import { logger } from "@/lib/logger";

/**
 * Convert American odds to decimal odds
 */
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

/**
 * Convert decimal odds to American odds
 */
export function decimalToAmerican(decimalOdds: number): number {
  if (decimalOdds >= 2.0) {
    return Math.round((decimalOdds - 1) * 100);
  } else {
    return Math.round(-100 / (decimalOdds - 1));
  }
}

/**
 * Convert odds to implied probability
 */
export function oddsToImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

/**
 * Convert probability to American odds
 */
export function probabilityToAmericanOdds(probability: number): number {
  if (probability >= 0.5) {
    // Favorite (negative odds)
    return Math.round((-100 * probability) / (1 - probability));
  } else {
    // Underdog (positive odds)
    return Math.round((100 * (1 - probability)) / probability);
  }
}

/**
 * Remove vig from two-way market odds to get fair/true probabilities
 * Uses proportional method to distribute the overround
 * 
 * @param odds1 American odds for outcome 1
 * @param odds2 American odds for outcome 2
 * @returns Fair probabilities for both outcomes
 */
export function removeVigTwoWay(
  odds1: number,
  odds2: number
): { prob1: number; prob2: number; vig: number } {
  const impliedProb1 = oddsToImpliedProbability(odds1);
  const impliedProb2 = oddsToImpliedProbability(odds2);
  
  const totalImplied = impliedProb1 + impliedProb2;
  const vig = totalImplied - 1; // Overround (vig)
  
  // Remove vig proportionally
  const fairProb1 = impliedProb1 / totalImplied;
  const fairProb2 = impliedProb2 / totalImplied;
  
  return {
    prob1: fairProb1,
    prob2: fairProb2,
    vig: vig,
  };
}

/**
 * Remove vig from three-way market odds (e.g., soccer 1X2)
 * 
 * @param odds1 American odds for outcome 1
 * @param odds2 American odds for outcome 2
 * @param odds3 American odds for outcome 3
 * @returns Fair probabilities for all outcomes
 */
export function removeVigThreeWay(
  odds1: number,
  odds2: number,
  odds3: number
): { prob1: number; prob2: number; prob3: number; vig: number } {
  const impliedProb1 = oddsToImpliedProbability(odds1);
  const impliedProb2 = oddsToImpliedProbability(odds2);
  const impliedProb3 = oddsToImpliedProbability(odds3);
  
  const totalImplied = impliedProb1 + impliedProb2 + impliedProb3;
  const vig = totalImplied - 1; // Overround (vig)
  
  // Remove vig proportionally
  const fairProb1 = impliedProb1 / totalImplied;
  const fairProb2 = impliedProb2 / totalImplied;
  const fairProb3 = impliedProb3 / totalImplied;
  
  return {
    prob1: fairProb1,
    prob2: fairProb2,
    prob3: fairProb3,
    vig: vig,
  };
}

/**
 * Calculate Expected Value (EV) for a betting opportunity
 * 
 * Formula: EV = (Probability Win × Profit Win) - (Probability Lose × Amount Lost)
 * 
 * @param trueProbability Your estimated true probability of winning (0-1)
 * @param americanOdds The odds offered by the sportsbook
 * @param stake The amount you plan to bet
 * @returns Expected value in dollars and as a percentage
 */
export function calculateEV(
  trueProbability: number,
  americanOdds: number,
  stake: number = 100
): {
  ev: number;
  evPercent: number;
  profit: number;
  isPositiveEV: boolean;
} {
  // Convert to decimal odds for profit calculation
  const decimalOdds = americanToDecimal(americanOdds);
  
  // Calculate potential profit
  const profit = stake * (decimalOdds - 1);
  
  // Calculate EV
  const winAmount = profit;
  const loseAmount = stake;
  const loseProb = 1 - trueProbability;
  
  const ev = (trueProbability * winAmount) - (loseProb * loseAmount);
  const evPercent = (ev / stake) * 100;
  
  return {
    ev,
    evPercent,
    profit,
    isPositiveEV: ev > 0,
  };
}

/**
 * Kelly Criterion - Calculate optimal bet size as fraction of bankroll
 * 
 * Formula: f = [(odds × win probability) - 1] / (odds - 1)
 * Where odds are in decimal format
 * 
 * @param trueProbability Your estimated true probability of winning (0-1)
 * @param americanOdds The odds offered by the sportsbook
 * @param bankroll Your total bankroll
 * @param fraction Fractional Kelly (0.25 = 25% Kelly, recommended for risk management)
 * @returns Recommended bet size and Kelly fraction
 */
export function calculateKelly(
  trueProbability: number,
  americanOdds: number,
  bankroll: number,
  fraction: number = 0.25
): {
  kellyFraction: number;
  fullKellyAmount: number;
  recommendedBet: number;
  fractionUsed: number;
} {
  // Convert to decimal odds
  const decimalOdds = americanToDecimal(americanOdds);
  
  // Calculate Kelly fraction
  const q = 1 - trueProbability; // Probability of losing
  const kellyFraction = ((decimalOdds * trueProbability) - 1) / (decimalOdds - 1);
  
  // Ensure Kelly fraction is not negative (only bet on +EV opportunities)
  const safeKellyFraction = Math.max(0, kellyFraction);
  
  // Calculate bet amounts
  const fullKellyAmount = bankroll * safeKellyFraction;
  const recommendedBet = fullKellyAmount * fraction;
  
  return {
    kellyFraction: safeKellyFraction,
    fullKellyAmount,
    recommendedBet,
    fractionUsed: fraction,
  };
}

/**
 * Calculate Closing Line Value (CLV) - measure of bet quality
 * Compares the odds you got vs the closing odds
 * 
 * Positive CLV indicates you got better odds than the market consensus
 * 
 * @param yourOdds The odds when you placed your bet
 * @param closingOdds The odds at game time
 * @returns CLV as a percentage
 */
export function calculateCLV(
  yourOdds: number,
  closingOdds: number
): {
  clv: number;
  clvPercent: number;
  isPositiveCLV: boolean;
} {
  const yourImplied = oddsToImpliedProbability(yourOdds);
  const closingImplied = oddsToImpliedProbability(closingOdds);
  
  // CLV = closing implied prob - your implied prob
  // Positive CLV means closing implied is higher (worse odds), so you got value
  const clv = closingImplied - yourImplied;
  const clvPercent = (clv / yourImplied) * 100;
  
  return {
    clv,
    clvPercent,
    isPositiveCLV: clv > 0,
  };
}

/**
 * Calculate edge (advantage) over the sportsbook
 * 
 * @param trueProbability Your estimated true probability
 * @param americanOdds The odds offered
 * @returns Edge as a decimal and percentage
 */
export function calculateEdge(
  trueProbability: number,
  americanOdds: number
): {
  edge: number;
  edgePercent: number;
  hasEdge: boolean;
} {
  const impliedProbability = oddsToImpliedProbability(americanOdds);
  const edge = trueProbability - impliedProbability;
  const edgePercent = edge * 100;
  
  return {
    edge,
    edgePercent,
    hasEdge: edge > 0,
  };
}

/**
 * Comprehensive EV+ Analysis for a betting opportunity
 * Combines all calculations into a single analysis
 */
export interface EVAnalysis {
  // Input parameters
  trueProbability: number;
  americanOdds: number;
  stake: number;
  bankroll?: number;
  
  // EV calculations
  ev: number;
  evPercent: number;
  isPositiveEV: boolean;
  
  // Edge calculations
  edge: number;
  edgePercent: number;
  
  // Market analysis
  impliedProbability: number;
  decimalOdds: number;
  
  // Kelly Criterion (if bankroll provided)
  kelly?: {
    kellyFraction: number;
    fullKellyAmount: number;
    recommendedBet: number;
    fractionUsed: number;
  };
  
  // Risk assessment
  confidence: 'high' | 'medium' | 'low';
  recommendation: 'strong_bet' | 'bet' | 'pass' | 'avoid';
}

/**
 * Perform comprehensive EV+ analysis on a betting opportunity
 */
export function analyzeEV(
  trueProbability: number,
  americanOdds: number,
  stake: number = 100,
  bankroll?: number,
  kellyFraction: number = 0.25
): EVAnalysis {
  // Validate inputs
  if (trueProbability < 0 || trueProbability > 1) {
    logger.error('[EV] Invalid probability', { trueProbability });
    throw new Error('Probability must be between 0 and 1');
  }
  
  // Calculate EV
  const evResult = calculateEV(trueProbability, americanOdds, stake);
  
  // Calculate edge
  const edgeResult = calculateEdge(trueProbability, americanOdds);
  
  // Calculate Kelly if bankroll provided
  let kelly: EVAnalysis['kelly'] = undefined;
  if (bankroll && bankroll > 0) {
    kelly = calculateKelly(trueProbability, americanOdds, bankroll, kellyFraction);
  }
  
  // Determine confidence level
  let confidence: EVAnalysis['confidence'] = 'low';
  if (edgeResult.edgePercent >= 5) confidence = 'high';
  else if (edgeResult.edgePercent >= 2) confidence = 'medium';
  
  // Determine recommendation
  let recommendation: EVAnalysis['recommendation'] = 'pass';
  if (evResult.evPercent >= 5 && confidence === 'high') {
    recommendation = 'strong_bet';
  } else if (evResult.evPercent >= 2 && confidence !== 'low') {
    recommendation = 'bet';
  } else if (evResult.evPercent < 0) {
    recommendation = 'avoid';
  }
  
  return {
    trueProbability,
    americanOdds,
    stake,
    bankroll,
    ev: evResult.ev,
    evPercent: evResult.evPercent,
    isPositiveEV: evResult.isPositiveEV,
    edge: edgeResult.edge,
    edgePercent: edgeResult.edgePercent,
    impliedProbability: oddsToImpliedProbability(americanOdds),
    decimalOdds: americanToDecimal(americanOdds),
    kelly,
    confidence,
    recommendation,
  };
}

/**
 * Calculate break-even win rate needed for a given odds
 * This is the minimum win rate needed to break even at the offered odds
 */
export function calculateBreakEven(americanOdds: number): {
  breakEvenRate: number;
  breakEvenPercent: number;
} {
  const impliedProb = oddsToImpliedProbability(americanOdds);
  return {
    breakEvenRate: impliedProb,
    breakEvenPercent: impliedProb * 100,
  };
}
