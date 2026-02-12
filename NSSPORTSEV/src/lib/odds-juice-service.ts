/**
 * Odds Adjustment Service - INDUSTRY STANDARD IMPLEMENTATION
 * 
 * Professional-grade odds adjustment system based on real sportsbook practices
 * 
 * How Real Sportsbooks Work:
 * 1. Start with MARKET CONSENSUS (bookOdds) - what other sharp books are offering
 * 2. Apply COMPETITIVE ADJUSTMENTS - not synthetic margins
 * 3. Consider market position, liability, and sharp action
 * 4. Maintain competitive odds to attract action on both sides
 * 
 * Key Differences from Amateur Systems:
 * ✅ Uses bookOdds (real market) as base, NOT fairOdds (mathematical)
 * ✅ Applies point-based adjustments (±10-20 points), NOT percentage margins
 * ✅ Asymmetric output (reflects real market imbalance)
 * ✅ Competitive with major sportsbooks
 * 
 * Industry Benchmarks:
 * - Spreads/Totals: Typically -110/-110 (4.55% total hold, ~2.3% per side)
 * - Moneylines: Variable based on line (favorites have higher juice)
 * - Props: Higher margins (5-10%) due to lower liquidity
 */

import { prisma } from './prisma';
import { logger } from './logger';

export interface JuiceConfig {
  // Point-based adjustments (not percentages!)
  // How many points to ADD to odds to make them slightly worse for bettors
  spreadAdjustment: number;      // Typical: 5-10 points (e.g., -110 → -115)
  moneylineAdjustment: number;   // Typical: 5-15 points depending on line
  totalAdjustment: number;       // Typical: 5-10 points (e.g., -110 → -115)
  playerPropsAdjustment: number; // Typical: 10-20 points (higher margin)
  gamePropsAdjustment: number;   // Typical: 10-20 points (higher margin)
  
  // Legacy percentage fields (kept for database compatibility, but converted to points)
  spreadMargin: number;
  moneylineMargin: number;
  totalMargin: number;
  playerPropsMargin: number;
  gamePropsMargin: number;
  
  roundingMethod: 'nearest5' | 'nearest10' | 'ceiling';
  minOdds: number;
  maxOdds: number;
  liveGameMultiplier: number;
  leagueOverrides?: Record<string, Partial<JuiceConfig>>;
}

export interface OddsInput {
  bookOdds: number;          // REAL market consensus (e.g., -900, +525)
  fairOdds?: number;         // Optional: symmetric odds (NOT used as base)
  marketType: 'spread' | 'moneyline' | 'total' | 'player_prop' | 'game_prop';
  league?: string;
  isLive?: boolean;
}

export interface OddsOutput {
  adjustedOdds: number;      // Final odds shown to user
  marketOdds: number;        // Original market consensus (bookOdds)
  adjustment: number;        // Points added (e.g., +10 means -110 → -120)
  impliedHold: number;       // Estimated house edge %
}

/**
 * Singleton class to manage odds juice configuration
 */
class OddsJuiceService {
  private cachedConfig: JuiceConfig | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL = 60000; // Cache TTL in milliseconds

  /**
   * Fetch active juice configuration from database
   * Returns null if juice is disabled
   */
  async getConfig(): Promise<JuiceConfig | null> {
    const now = Date.now();
    
    // Return cached config if still fresh (no logging for cache hits)
    if ((now - this.lastFetchTime) < this.CACHE_TTL) {
      return this.cachedConfig;
    }

    try {
      const config = await prisma.oddsConfiguration.findFirst({
        where: { isActive: true },
        orderBy: { lastModified: 'desc' },
      });

      if (!config) {
        // No active config found - juice is DISABLED
        // Only log once when cache refreshes, not on every call
        const wasEnabled = this.cachedConfig !== null;
        this.cachedConfig = null;
        this.lastFetchTime = now;
        
        if (wasEnabled) {
          logger.info('[OddsJuice] 🚫 Juice/Margins DISABLED - Using SDK consensus odds without house margins');
        }
        return null;
      }

      // Check if this is a new config or state change
      const isStateChange = this.cachedConfig === null || 
                           this.cachedConfig.spreadMargin !== config.spreadMargin ||
                           this.cachedConfig.moneylineMargin !== config.moneylineMargin;

      // Convert percentage margins to point-based adjustments (industry standard)
      // Industry standard: 4.5% margin ≈ 10 points (e.g., -110 → -120)
      // Formula: points = margin * 200 (approximate conversion)
      this.cachedConfig = {
        spreadMargin: config.spreadMargin,
        moneylineMargin: config.moneylineMargin,
        totalMargin: config.totalMargin,
        playerPropsMargin: config.playerPropsMargin,
        gamePropsMargin: config.gamePropsMargin,
        spreadAdjustment: Math.round(config.spreadMargin * 200),         // 4.5% → 9 points
        moneylineAdjustment: Math.round(config.moneylineMargin * 200),   // 5% → 10 points
        totalAdjustment: Math.round(config.totalMargin * 200),           // 4.5% → 9 points
        playerPropsAdjustment: Math.round(config.playerPropsMargin * 200), // 8% → 16 points
        gamePropsAdjustment: Math.round(config.gamePropsMargin * 200),   // 8% → 16 points
        roundingMethod: config.roundingMethod as 'nearest5' | 'nearest10' | 'ceiling',
        minOdds: config.minOdds,
        maxOdds: config.maxOdds,
        liveGameMultiplier: config.liveGameMultiplier,
        leagueOverrides: config.leagueOverrides as Record<string, Partial<JuiceConfig>> | undefined,
      };
      
      this.lastFetchTime = now;
      
      // Only log when juice is enabled for the first time or config changes
      if (isStateChange) {
        logger.info('[OddsJuice] ✅ Juice/Margins ENABLED - Loaded active configuration', {
          configId: config.id,
          margins: {
            spread: `${(config.spreadMargin * 100).toFixed(2)}%`,
            moneyline: `${(config.moneylineMargin * 100).toFixed(2)}%`,
            total: `${(config.totalMargin * 100).toFixed(2)}%`,
            playerProps: `${(config.playerPropsMargin * 100).toFixed(2)}%`,
            gameProps: `${(config.gamePropsMargin * 100).toFixed(2)}%`,
          },
          liveMultiplier: config.liveGameMultiplier,
        });
      }
      
      return this.cachedConfig;
    } catch (error) {
      logger.error('[OddsJuice] Failed to fetch configuration', { error });
      // On error, disable juice (safer than using defaults)
      return null;
    }
  }

  /**
   * Clear cached configuration (call when config is updated)
   */
  invalidateCache(): void {
    this.cachedConfig = null;
    this.lastFetchTime = 0;
    logger.info('[OddsJuice] Configuration cache invalidated');
  }

  /**
   * Apply competitive odds adjustment using INDUSTRY STANDARD methodology
   * 
   * PROFESSIONAL APPROACH:
   * 1. Start with bookOdds (real market consensus) - NOT fairOdds
   * 2. Apply point-based adjustments to make odds slightly less favorable
   * 3. Maintain market competitiveness while ensuring house edge
   * 
   * Example:
   * - Market: -110 (bookOdds)
   * - Adjustment: +10 points
   * - Final: -120 (your odds)
   * 
   * This creates ~2-3% hold per side, which is industry standard for spreads/totals
   */
  async applyJuice(input: OddsInput): Promise<OddsOutput> {
    const config = await this.getConfig();
    
    // ✅ If juice is disabled (no active config), return market odds unchanged
    if (!config) {
      return {
        adjustedOdds: input.bookOdds,
        marketOdds: input.bookOdds,
        adjustment: 0,
        impliedHold: 0,
      };
    }
    
    // Get adjustment for this market type (in points, not percentage)
    let adjustment = this.getAdjustmentForMarket(input.marketType, config);
    
    // Apply league-specific override if exists
    if (input.league && config.leagueOverrides?.[input.league]) {
      const override = config.leagueOverrides[input.league];
      const overrideAdjustment = this.getAdjustmentForMarket(input.marketType, override as JuiceConfig);
      if (overrideAdjustment !== undefined) {
        adjustment = overrideAdjustment;
      }
    }
    
    // Apply live game multiplier (increase adjustment for live markets)
    if (input.isLive) {
      adjustment = Math.round(adjustment * config.liveGameMultiplier);
    }

    // INDUSTRY STANDARD: Apply point-based adjustment to market odds
    let adjustedOdds = this.applyPointAdjustment(input.bookOdds, adjustment);
    
    // Apply rounding (industry standard: nearest 5 or 10)
    adjustedOdds = this.roundOdds(adjustedOdds, config.roundingMethod);
    
    // Enforce min/max limits (safety bounds)
    adjustedOdds = Math.max(config.minOdds, Math.min(config.maxOdds, adjustedOdds));
    
    // Calculate implied hold (house edge estimation)
    const impliedHold = this.calculateHoldFromAdjustment(adjustment);

    return {
      adjustedOdds,
      marketOdds: input.bookOdds,
      adjustment,
      impliedHold,
    };
  }

  /**
   * Apply juice to both sides of a two-way market (spread, total)
   * Uses bookOdds for both sides
   */
  async applyJuiceToTwoWayMarket(
    side1BookOdds: number,
    side2BookOdds: number,
    marketType: 'spread' | 'total',
    league?: string,
    isLive?: boolean
  ): Promise<{ side1: OddsOutput; side2: OddsOutput }> {
    const side1 = await this.applyJuice({
      bookOdds: side1BookOdds,
      marketType,
      league,
      isLive,
    });
    
    const side2 = await this.applyJuice({
      bookOdds: side2BookOdds,
      marketType,
      league,
      isLive,
    });

    return { side1, side2 };
  }

  /**
   * Get point-based adjustment for specific market type
   * Returns adjustment in American odds points (e.g., 10 means add 10 points)
   */
  private getAdjustmentForMarket(
    marketType: OddsInput['marketType'],
    config: Partial<JuiceConfig>
  ): number {
    switch (marketType) {
      case 'spread':
        return config.spreadAdjustment ?? 10; // Default: 10 points (industry standard)
      case 'moneyline':
        return config.moneylineAdjustment ?? 10;
      case 'total':
        return config.totalAdjustment ?? 10;
      case 'player_prop':
        return config.playerPropsAdjustment ?? 15; // Higher margin for props
      case 'game_prop':
        return config.gamePropsAdjustment ?? 15;
      default:
        return 10;
    }
  }

  /**
   * INDUSTRY STANDARD: Apply point-based adjustment to odds
   * 
   * How it works:
   * - Favorites (negative odds): Make MORE negative (worse for bettor)
   * - Underdogs (positive odds): Make LESS positive (worse for bettor)
   * 
   * Examples:
   * - -110 + 10 points = -120 (worse for bettor)
   * - +150 + 10 points = +140 (worse for bettor)
   */
  private applyPointAdjustment(odds: number, points: number): number {
    if (odds < 0) {
      // Favorite: Make more negative
      // -110 with +10 adjustment → -120
      return odds - points;
    } else {
      // Underdog: Make less positive
      // +150 with +10 adjustment → +140
      return odds - points;
    }
  }

  /**
   * Calculate implied house hold from point adjustment
   * Rough estimate: 10 points ≈ 2-3% hold
   */
  private calculateHoldFromAdjustment(points: number): number {
    // Approximate formula: points / 4 = hold percentage
    // 10 points ≈ 2.5% hold
    return points / 4;
  }

  /**
   * Convert American odds to implied probability
   */
  private americanOddsToProbability(americanOdds: number): number {
    if (americanOdds > 0) {
      return 100 / (americanOdds + 100);
    } else {
      return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
    }
  }

  /**
   * Convert probability to American odds
   */
  private probabilityToAmericanOdds(probability: number): number {
    if (probability >= 0.5) {
      // Favorite (negative odds)
      return Math.round((-100 * probability) / (1 - probability));
    } else {
      // Underdog (positive odds)
      return Math.round((100 * (1 - probability)) / probability);
    }
  }

  /**
   * Round odds according to specified method
   */
  private roundOdds(odds: number, method: JuiceConfig['roundingMethod']): number {
    const absOdds = Math.abs(odds);
    const sign = odds >= 0 ? 1 : -1;
    let rounded: number;

    switch (method) {
      case 'nearest5':
        rounded = Math.round(absOdds / 5) * 5;
        break;
      case 'nearest10':
        rounded = Math.round(absOdds / 10) * 10;
        break;
      case 'ceiling':
        rounded = Math.ceil(absOdds / 10) * 10;
        break;
      default:
        rounded = Math.round(absOdds / 10) * 10;
    }

    return sign * rounded;
  }

  /**
   * Calculate house hold percentage
   */
  private calculateHoldPercentage(fairOdds: number, juicedOdds: number): number {
    const fairProb = this.americanOddsToProbability(fairOdds);
    const juicedProb = this.americanOddsToProbability(juicedOdds);
    return ((juicedProb - fairProb) / fairProb) * 100;
  }

  /**
   * Batch process multiple odds (for game cards with multiple markets)
   */
  async applyJuiceBatch(inputs: OddsInput[]): Promise<OddsOutput[]> {
    // Get config once for all odds
    await this.getConfig();
    
    // Process all odds in parallel
    return Promise.all(inputs.map(input => this.applyJuice(input)));
  }
}

// Export singleton instance
export const oddsJuiceService = new OddsJuiceService();

/**
 * Helper function for quick odds adjustment
 * Uses bookOdds as input (industry standard)
 */
export async function applyCustomJuice(
  bookOdds: number,
  marketType: OddsInput['marketType'],
  league?: string,
  isLive?: boolean
): Promise<number> {
  const result = await oddsJuiceService.applyJuice({
    bookOdds,
    marketType,
    league,
    isLive,
  });
  return result.adjustedOdds;
}
