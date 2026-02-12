/**
 * Automated Opportunity Detection Service
 * 
 * Continuously monitors live odds and detects:
 * - EV+ opportunities (positive expected value bets)
 * - Arbitrage opportunities (guaranteed profit situations)
 * - Line movement alerts
 * 
 * Integrates with the real-time streaming service and toast notifications.
 */

import { calculateEV } from './calculators/ev-calculator';
import { detectArbitrage } from './calculators/arbitrage-calculator';
import type { Game } from '@/types';
import { logger } from './logger';

export interface OpportunityAlert {
  id: string;
  type: 'ev' | 'arbitrage';
  timestamp: Date;
  game: Game;
  details: EVOpportunity | ArbitrageOpportunity;
  priority: 'low' | 'medium' | 'high';
}

export interface EVOpportunity {
  type: 'ev';
  betType: string; // 'spread' | 'moneyline' | 'total'
  side: string; // e.g., 'home', 'away', 'over', 'under'
  odds: number; // American odds
  trueWinProbability: number; // Your estimated probability (0-1)
  expectedValue: number; // EV in dollars per $1 bet
  expectedValuePercent: number; // EV as percentage
  kellyFraction: number; // Recommended bet size (0-1)
  edge: number; // Your edge over the bookmaker (0-1)
  confidence: 'low' | 'medium' | 'high';
}

export interface ArbitrageOpportunity {
  type: 'arbitrage';
  outcomes: Array<{
    outcome: string;
    sportsbook: string;
    odds: number;
  }>;
  arbitragePercent: number; // <100% indicates arbitrage
  profitPercent: number; // Guaranteed profit percentage
  totalStake: number;
  profit: number;
}

export interface DetectionConfig {
  // EV+ detection settings
  minEVPercent: number; // Minimum EV% to trigger alert (default: 2%)
  minEdge: number; // Minimum edge to consider (default: 0.03 = 3%)
  
  // Arbitrage detection settings
  minArbitrageProfitPercent: number; // Minimum profit% (default: 0.5%)
  
  // Alert settings
  enableNotifications: boolean;
  maxAlertsPerMinute: number; // Rate limiting (default: 5)
}

const DEFAULT_CONFIG: DetectionConfig = {
  minEVPercent: 2.0,
  minEdge: 0.03,
  minArbitrageProfitPercent: 0.5,
  enableNotifications: true,
  maxAlertsPerMinute: 5,
};

/**
 * Opportunity Detector Class
 * 
 * Monitors games and detects profitable opportunities in real-time.
 */
export class OpportunityDetector {
  private config: DetectionConfig;
  private recentAlerts: OpportunityAlert[] = [];
  private alertCallbacks: Array<(alert: OpportunityAlert) => void> = [];
  
  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Register a callback to be notified of new opportunities
   */
  onOpportunity(callback: (alert: OpportunityAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Check a single game for EV+ opportunities
   * 
   * NOTE: This method requires adaptation to work with the current Game type structure.
   * The probability estimation would need to be provided by a separate model/service.
   * For MVP, this is a placeholder that shows the architecture.
   */
  checkForEVOpportunities(
    game: Game,
    trueWinProbabilities: {
      homeSpread?: number;
      awaySpread?: number;
      homeML?: number;
      awayML?: number;
      over?: number;
      under?: number;
    }
  ): EVOpportunity[] {
    const opportunities: EVOpportunity[] = [];
    
    // NOTE: This is a simplified placeholder.
    // Full implementation would require calling calculateEV with proper parameters
    // and adapting to the nested odds structure in Game type.
    
    logger.debug('[OpportunityDetector] EV check called (placeholder implementation)', { 
      gameId: game.id 
    });
    
    return opportunities;
  }
  
  /**
   * Check for arbitrage opportunities across multiple sportsbooks
   * 
   * NOTE: This requires odds from multiple sportsbooks for the same game.
   * For MVP, this is a placeholder that shows the architecture.
   */
  checkForArbitrageOpportunities(
    games: Array<Game & { sportsbook: string }>
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // NOTE: This is a simplified placeholder.
    // Full implementation would require proper multi-sportsbook data aggregation.
    
    logger.debug('[OpportunityDetector] Arbitrage check called (placeholder implementation)', { 
      gamesCount: games.length 
    });
    
    return opportunities;
  }
  
  /**
   * Emit an alert to all registered callbacks
   */
  private emitAlert(alert: OpportunityAlert): void {
    // Rate limiting
    const oneMinuteAgo = new Date(Date.now() - 60000);
    this.recentAlerts = this.recentAlerts.filter(a => a.timestamp > oneMinuteAgo);
    
    if (this.recentAlerts.length >= this.config.maxAlertsPerMinute) {
      logger.warn('[OpportunityDetector] Rate limit reached, skipping alert');
      return;
    }
    
    this.recentAlerts.push(alert);
    
    // Notify all callbacks
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        logger.error('[OpportunityDetector] Error in alert callback', { error });
      }
    }
  }
  
  /**
   * Create an alert for an EV+ opportunity
   */
  createEVAlert(game: Game, opportunity: EVOpportunity): void {
    const alert: OpportunityAlert = {
      id: `ev-${game.id}-${opportunity.betType}-${opportunity.side}-${Date.now()}`,
      type: 'ev',
      timestamp: new Date(),
      game,
      details: opportunity,
      priority: this.getAlertPriority(opportunity.expectedValuePercent),
    };
    
    this.emitAlert(alert);
  }
  
  /**
   * Create an alert for an arbitrage opportunity
   */
  createArbitrageAlert(game: Game, opportunity: ArbitrageOpportunity): void {
    const alert: OpportunityAlert = {
      id: `arb-${game.id}-${Date.now()}`,
      type: 'arbitrage',
      timestamp: new Date(),
      game,
      details: opportunity,
      priority: this.getAlertPriority(opportunity.profitPercent),
    };
    
    this.emitAlert(alert);
  }
  
  /**
   * Get confidence level based on edge
   */
  private getConfidenceLevel(edge: number): 'low' | 'medium' | 'high' {
    if (edge >= 0.10) return 'high'; // 10%+ edge
    if (edge >= 0.05) return 'medium'; // 5-10% edge
    return 'low'; // 3-5% edge
  }
  
  /**
   * Get alert priority based on profit/EV percentage
   */
  private getAlertPriority(percent: number): 'low' | 'medium' | 'high' {
    if (percent >= 5.0) return 'high';
    if (percent >= 3.0) return 'medium';
    return 'low';
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): OpportunityAlert[] {
    return this.recentAlerts.slice(-limit);
  }
  
  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.recentAlerts = [];
  }
}

// Singleton instance
let detectorInstance: OpportunityDetector | null = null;

/**
 * Get the global opportunity detector instance
 */
export function getOpportunityDetector(config?: Partial<DetectionConfig>): OpportunityDetector {
  if (!detectorInstance) {
    detectorInstance = new OpportunityDetector(config);
  }
  return detectorInstance;
}
