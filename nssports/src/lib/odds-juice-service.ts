/**
 * Odds Juice/Margin Application Service
 * 
 * Applies custom house margins (juice/vig) to fair odds from SportsGameOdds API
 * 
 * How it works:
 * 1. Receive fair odds (juice-free consensus from SDK)
 * 2. Apply configured margin percentage
 * 3. Convert back to American odds format
 * 4. Apply rounding rules
 * 5. Return juiced odds for display
 */

import { prisma } from './prisma';
import { logger } from './logger';

export interface JuiceConfig {
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
  fairOdds: number;          // American odds (e.g., -110, +150)
  marketType: 'spread' | 'moneyline' | 'total' | 'player_prop' | 'game_prop';
  league?: string;           // e.g., 'NBA', 'NFL'
  isLive?: boolean;
}

export interface OddsOutput {
  juicedOdds: number;        // Adjusted American odds
  fairOdds: number;          // Original fair odds
  marginApplied: number;     // Actual margin % applied
  holdPercentage: number;    // House edge %
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

      this.cachedConfig = {
        spreadMargin: config.spreadMargin,
        moneylineMargin: config.moneylineMargin,
        totalMargin: config.totalMargin,
        playerPropsMargin: config.playerPropsMargin,
        gamePropsMargin: config.gamePropsMargin,
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
   * Apply juice to fair odds
   * Returns original fair odds if juice is disabled
   */
  async applyJuice(input: OddsInput): Promise<OddsOutput> {
    const config = await this.getConfig();
    
    // ✅ If juice is disabled (no active config), return fair odds unchanged
    if (!config) {
      return {
        juicedOdds: input.fairOdds,
        fairOdds: input.fairOdds,
        marginApplied: 0,
        holdPercentage: 0,
      };
    }
    
    // Get margin for this market type
    let margin = this.getMarginForMarket(input.marketType, config);
    
    // Apply league-specific override if exists
    if (input.league && config.leagueOverrides?.[input.league]) {
      const override = config.leagueOverrides[input.league];
      const overrideMargin = this.getMarginForMarket(input.marketType, override as JuiceConfig);
      if (overrideMargin !== undefined) {
        margin = overrideMargin;
      }
    }
    
    // Apply live game multiplier
    if (input.isLive) {
      margin *= config.liveGameMultiplier;
    }

    // Convert American odds to probability
    const fairProbability = this.americanOddsToProbability(input.fairOdds);
    
    // Apply juice by adjusting implied probability
    const juicedProbability = fairProbability * (1 + margin);
    
    // Convert back to American odds
    let juicedOdds = this.probabilityToAmericanOdds(juicedProbability);
    
    // Apply rounding
    juicedOdds = this.roundOdds(juicedOdds, config.roundingMethod);
    
    // Enforce min/max limits
    juicedOdds = Math.max(config.minOdds, Math.min(config.maxOdds, juicedOdds));
    
    // Calculate hold percentage (house edge)
    const holdPercentage = this.calculateHoldPercentage(input.fairOdds, juicedOdds);

    return {
      juicedOdds,
      fairOdds: input.fairOdds,
      marginApplied: margin,
      holdPercentage,
    };
  }

  /**
   * Apply juice to both sides of a two-way market (spread, total)
   */
  async applyJuiceToTwoWayMarket(
    side1FairOdds: number,
    side2FairOdds: number,
    marketType: 'spread' | 'total',
    league?: string,
    isLive?: boolean
  ): Promise<{ side1: OddsOutput; side2: OddsOutput }> {
    const side1 = await this.applyJuice({
      fairOdds: side1FairOdds,
      marketType,
      league,
      isLive,
    });
    
    const side2 = await this.applyJuice({
      fairOdds: side2FairOdds,
      marketType,
      league,
      isLive,
    });

    return { side1, side2 };
  }

  /**
   * Get margin for specific market type
   */
  private getMarginForMarket(
    marketType: OddsInput['marketType'],
    config: Partial<JuiceConfig>
  ): number {
    switch (marketType) {
      case 'spread':
        return config.spreadMargin ?? 0.045;
      case 'moneyline':
        return config.moneylineMargin ?? 0.05;
      case 'total':
        return config.totalMargin ?? 0.045;
      case 'player_prop':
        return config.playerPropsMargin ?? 0.08;
      case 'game_prop':
        return config.gamePropsMargin ?? 0.08;
      default:
        return 0.05; // Default 5%
    }
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
 * Helper function for quick juice application
 */
export async function applyCustomJuice(
  fairOdds: number,
  marketType: OddsInput['marketType'],
  league?: string,
  isLive?: boolean
): Promise<number> {
  const result = await oddsJuiceService.applyJuice({
    fairOdds,
    marketType,
    league,
    isLive,
  });
  return result.juicedOdds;
}
