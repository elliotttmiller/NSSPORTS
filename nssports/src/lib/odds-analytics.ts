/**
 * Advanced Odds Analytics Service
 * 
 * Provides sophisticated analytics and calculations for odds management:
 * - Kelly Criterion calculations for optimal bet sizing
 * - De-vigging algorithms to find true/fair odds
 * - Profitability forecasting
 * - Market efficiency analysis
 * - Sharp action detection metrics
 */

import { logger } from './logger';

/**
 * Kelly Criterion - Calculate optimal bet size
 * Formula: f* = (bp - q) / b
 * where:
 * - f* = fraction of bankroll to wager
 * - b = net odds received (decimal odds - 1)
 * - p = probability of winning
 * - q = probability of losing (1 - p)
 */
export interface KellyCriterionInput {
  winProbability: number;  // 0 to 1 (e.g., 0.55 for 55%)
  americanOdds: number;    // American odds format (e.g., -110, +150)
  bankroll: number;        // Total bankroll amount
  fractionalKelly?: number; // Use fractional Kelly (e.g., 0.5 for half-Kelly)
}

export interface KellyCriterionOutput {
  optimalBetSize: number;      // Dollar amount to bet
  optimalBetPercentage: number; // Percentage of bankroll
  edge: number;                 // Bettor's edge in percentage
  expectedValue: number;        // EV of the bet
  isPositiveEV: boolean;        // Whether bet has positive EV
  recommendation: 'strong_bet' | 'moderate_bet' | 'small_bet' | 'no_bet';
}

/**
 * Calculate optimal bet size using Kelly Criterion
 */
export function calculateKellyCriterion(input: KellyCriterionInput): KellyCriterionOutput {
  const { winProbability, americanOdds, bankroll, fractionalKelly = 1.0 } = input;
  
  // Convert American odds to decimal odds
  const decimalOdds = americanOddsToDecimal(americanOdds);
  const b = decimalOdds - 1; // Net odds
  const p = winProbability;
  const q = 1 - p;
  
  // Calculate Kelly percentage
  const kellyFraction = (b * p - q) / b;
  
  // Apply fractional Kelly if specified
  const adjustedKelly = kellyFraction * fractionalKelly;
  
  // Kelly can be negative (no edge) - clamp to 0
  const safeBetPercentage = Math.max(0, Math.min(1, adjustedKelly));
  
  // Calculate dollar amounts
  const optimalBetSize = bankroll * safeBetPercentage;
  
  // Calculate edge and EV
  const impliedProbability = americanOddsToImpliedProbability(americanOdds);
  const edge = (p - impliedProbability) * 100;
  const expectedValue = (p * (decimalOdds - 1) - q) * 100;
  
  // Determine recommendation
  let recommendation: KellyCriterionOutput['recommendation'];
  if (edge <= 0 || expectedValue <= 0) {
    recommendation = 'no_bet';
  } else if (edge >= 5) {
    recommendation = 'strong_bet';
  } else if (edge >= 2) {
    recommendation = 'moderate_bet';
  } else {
    recommendation = 'small_bet';
  }
  
  return {
    optimalBetSize: Math.round(optimalBetSize * 100) / 100,
    optimalBetPercentage: safeBetPercentage * 100,
    edge,
    expectedValue,
    isPositiveEV: expectedValue > 0,
    recommendation,
  };
}

/**
 * De-vigging - Remove juice to find true/fair odds
 * Uses multiplicative (proportional) method - industry standard
 */
export interface DeviggingInput {
  odds1: number;  // American odds for outcome 1
  odds2: number;  // American odds for outcome 2
  method?: 'multiplicative' | 'additive' | 'power';
}

export interface DeviggingOutput {
  fairOdds1: number;        // Fair American odds for outcome 1
  fairOdds2: number;        // Fair American odds for outcome 2
  fairProbability1: number; // True probability of outcome 1
  fairProbability2: number; // True probability of outcome 2
  vigorish: number;         // House edge percentage
  totalImplied: number;     // Sum of implied probabilities (should be > 100%)
}

/**
 * Remove vig/juice to find fair odds using multiplicative method
 */
export function devig(input: DeviggingInput): DeviggingOutput {
  const { odds1, odds2, method = 'multiplicative' } = input;
  
  // Convert to implied probabilities
  const implied1 = americanOddsToImpliedProbability(odds1);
  const implied2 = americanOddsToImpliedProbability(odds2);
  const totalImplied = implied1 + implied2;
  
  // Calculate vig
  const vigorish = (totalImplied - 1) * 100;
  
  let fairProbability1: number;
  let fairProbability2: number;
  
  if (method === 'multiplicative') {
    // Proportional method - industry standard
    fairProbability1 = implied1 / totalImplied;
    fairProbability2 = implied2 / totalImplied;
  } else if (method === 'additive') {
    // Equally distribute vig
    const halfVig = (totalImplied - 1) / 2;
    fairProbability1 = implied1 - halfVig;
    fairProbability2 = implied2 - halfVig;
  } else {
    // Power method (default to multiplicative)
    fairProbability1 = implied1 / totalImplied;
    fairProbability2 = implied2 / totalImplied;
  }
  
  // Convert back to American odds
  const fairOdds1 = impliedProbabilityToAmericanOdds(fairProbability1);
  const fairOdds2 = impliedProbabilityToAmericanOdds(fairProbability2);
  
  return {
    fairOdds1,
    fairOdds2,
    fairProbability1,
    fairProbability2,
    vigorish,
    totalImplied,
  };
}

/**
 * Calculate profitability metrics for a given juice configuration
 */
export interface ProfitabilityInput {
  dailyHandle: number;      // Expected daily wagering volume
  margins: {
    spread: number;         // Margin percentage (e.g., 0.045 for 4.5%)
    moneyline: number;
    total: number;
    playerProps: number;
    gameProps: number;
  };
  marketDistribution?: {    // What % of handle goes to each market
    spread: number;
    moneyline: number;
    total: number;
    playerProps: number;
    gameProps: number;
  };
}

export interface ProfitabilityOutput {
  daily: {
    expectedProfit: number;
    expectedRevenue: number;
    riskAmount: number;
  };
  monthly: {
    expectedProfit: number;
    expectedRevenue: number;
    riskAmount: number;
  };
  yearly: {
    expectedProfit: number;
    expectedRevenue: number;
    riskAmount: number;
  };
  breakdownByMarket: {
    spread: number;
    moneyline: number;
    total: number;
    playerProps: number;
    gameProps: number;
  };
  averageMargin: number;
  riskAdjustedReturn: number;
}

/**
 * Calculate comprehensive profitability forecast
 */
export function calculateProfitability(input: ProfitabilityInput): ProfitabilityOutput {
  const { dailyHandle, margins, marketDistribution } = input;
  
  // Default market distribution if not provided
  const distribution = marketDistribution || {
    spread: 0.35,      // 35% of handle
    moneyline: 0.25,   // 25% of handle
    total: 0.20,       // 20% of handle
    playerProps: 0.12, // 12% of handle
    gameProps: 0.08,   // 8% of handle
  };
  
  // Calculate profit by market
  const profitByMarket = {
    spread: dailyHandle * distribution.spread * margins.spread,
    moneyline: dailyHandle * distribution.moneyline * margins.moneyline,
    total: dailyHandle * distribution.total * margins.total,
    playerProps: dailyHandle * distribution.playerProps * margins.playerProps,
    gameProps: dailyHandle * distribution.gameProps * margins.gameProps,
  };
  
  const dailyProfit = Object.values(profitByMarket).reduce((sum, val) => sum + val, 0);
  
  // Calculate average margin
  const averageMargin = dailyProfit / dailyHandle;
  
  // Risk calculations (assume standard deviation of 3x margin)
  const dailyRisk = dailyHandle * averageMargin * 3;
  
  return {
    daily: {
      expectedProfit: dailyProfit,
      expectedRevenue: dailyProfit,
      riskAmount: dailyRisk,
    },
    monthly: {
      expectedProfit: dailyProfit * 30,
      expectedRevenue: dailyProfit * 30,
      riskAmount: dailyRisk * Math.sqrt(30), // Adjust for time diversification
    },
    yearly: {
      expectedProfit: dailyProfit * 365,
      expectedRevenue: dailyProfit * 365,
      riskAmount: dailyRisk * Math.sqrt(365),
    },
    breakdownByMarket: profitByMarket,
    averageMargin: averageMargin * 100,
    riskAdjustedReturn: dailyProfit / dailyRisk,
  };
}

/**
 * Analyze market efficiency and competitiveness
 */
export interface MarketEfficiencyInput {
  yourOdds: number;        // Your book's odds
  marketConsensus: number; // Average odds from other books
  sharpOdds?: number;      // Odds from sharp books (Pinnacle, etc.)
}

export interface MarketEfficiencyOutput {
  competitiveScore: number;  // 0-100 score (higher = more competitive)
  priceDifference: number;   // Difference from consensus (in odds points)
  recommendation: 'more_competitive' | 'well_priced' | 'too_aggressive' | 'check_pricing';
  isAttractingSharpAction: boolean;
  suggestedAdjustment?: number;
}

/**
 * Analyze how competitive your odds are vs market
 */
export function analyzeMarketEfficiency(input: MarketEfficiencyInput): MarketEfficiencyOutput {
  const { yourOdds, marketConsensus, sharpOdds } = input;
  
  // Calculate price difference
  const priceDifference = yourOdds - marketConsensus;
  const percentDiff = Math.abs(priceDifference / marketConsensus) * 100;
  
  // Competitive score (100 = perfectly priced, lower = less competitive)
  let competitiveScore = 100 - Math.min(percentDiff * 10, 50);
  
  // Check against sharp odds if available
  const isAttractingSharpAction = sharpOdds ? 
    (yourOdds > 0 ? yourOdds > sharpOdds : yourOdds < sharpOdds) : 
    false;
  
  // Determine recommendation
  let recommendation: MarketEfficiencyOutput['recommendation'];
  let suggestedAdjustment: number | undefined;
  
  if (percentDiff < 2) {
    recommendation = 'well_priced';
  } else if (percentDiff < 5) {
    if (yourOdds > 0) {
      // Underdog odds - yours are better for bettor
      recommendation = yourOdds > marketConsensus ? 'too_aggressive' : 'more_competitive';
    } else {
      // Favorite odds - more negative is worse for bettor
      recommendation = yourOdds < marketConsensus ? 'too_aggressive' : 'more_competitive';
    }
    suggestedAdjustment = Math.round((marketConsensus - yourOdds) / 2);
  } else {
    recommendation = 'check_pricing';
    suggestedAdjustment = Math.round((marketConsensus - yourOdds) * 0.7);
  }
  
  return {
    competitiveScore: Math.round(competitiveScore),
    priceDifference,
    recommendation,
    isAttractingSharpAction,
    suggestedAdjustment,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert American odds to decimal odds
 */
export function americanOddsToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

/**
 * Convert American odds to implied probability
 */
export function americanOddsToImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

/**
 * Convert implied probability to American odds
 */
export function impliedProbabilityToAmericanOdds(probability: number): number {
  if (probability >= 0.5) {
    // Favorite (negative odds)
    return Math.round((-100 * probability) / (1 - probability));
  } else {
    // Underdog (positive odds)
    return Math.round((100 * (1 - probability)) / probability);
  }
}

/**
 * Calculate expected value of a bet
 */
export function calculateExpectedValue(
  winProbability: number,
  americanOdds: number,
  betAmount: number
): number {
  const decimalOdds = americanOddsToDecimal(americanOdds);
  const potentialProfit = betAmount * (decimalOdds - 1);
  const ev = (winProbability * potentialProfit) - ((1 - winProbability) * betAmount);
  return ev;
}

/**
 * Calculate break-even win rate needed for profitability
 */
export function calculateBreakEvenRate(americanOdds: number): number {
  const impliedProb = americanOddsToImpliedProbability(americanOdds);
  return impliedProb * 100;
}

/**
 * Calculate CLV (Closing Line Value) - measure of bet quality
 */
export interface CLVInput {
  betOdds: number;      // Odds when bet was placed
  closingOdds: number;  // Odds at game start
}

export interface CLVOutput {
  clv: number;          // CLV in percentage
  beatClosing: boolean; // Whether bet beat closing line
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Calculate closing line value
 */
export function calculateCLV(input: CLVInput): CLVOutput {
  const { betOdds, closingOdds } = input;
  
  const betImplied = americanOddsToImpliedProbability(betOdds);
  const closeImplied = americanOddsToImpliedProbability(closingOdds);
  
  const clv = ((1 / closeImplied) - (1 / betImplied)) / (1 / betImplied) * 100;
  const beatClosing = clv > 0;
  
  let quality: CLVOutput['quality'];
  if (clv > 5) {
    quality = 'excellent';
  } else if (clv > 2) {
    quality = 'good';
  } else if (clv > -2) {
    quality = 'fair';
  } else {
    quality = 'poor';
  }
  
  return {
    clv,
    beatClosing,
    quality,
  };
}

logger.info('[OddsAnalytics] Advanced analytics module loaded');
