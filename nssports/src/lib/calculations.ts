/**
 * Betting calculation utilities
 */

/**
 * Convert American odds to decimal odds
 */
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return americanOdds / 100 + 1;
  } else {
    return 100 / Math.abs(americanOdds) + 1;
  }
}

/**
 * Convert decimal odds to American odds
 */
export function decimalToAmerican(decimalOdds: number): number {
  if (decimalOdds >= 2) {
    return Math.round((decimalOdds - 1) * 100);
  } else {
    return Math.round(-100 / (decimalOdds - 1));
  }
}

/**
 * Calculate payout from stake and American odds
 */
export function calculatePayout(stake: number, americanOdds: number): number {
  const decimalOdds = americanToDecimal(americanOdds);
  return stake * decimalOdds;
}

/**
 * Calculate profit from stake and American odds
 */
export function calculateProfit(stake: number, americanOdds: number): number {
  return calculatePayout(stake, americanOdds) - stake;
}

/**
 * Calculate parlay odds from multiple American odds
 */
export function calculateParlayOdds(odds: number[]): number {
  const decimalOdds = odds.map(americanToDecimal);
  const parlayDecimal = decimalOdds.reduce((acc, odd) => acc * odd, 1);
  return decimalToAmerican(parlayDecimal);
}

/**
 * Calculate parlay payout
 */
export function calculateParlayPayout(stake: number, odds: number[]): number {
  const parlayOdds = calculateParlayOdds(odds);
  return calculatePayout(stake, parlayOdds);
}
