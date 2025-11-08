# Custom Odds/Line Juice Configuration System - Implementation Guide

## 🎯 Overview

Implement a comprehensive juice/margin configuration system that allows admins to:
- Apply custom juice/margins to real-time odds from SportsGameOdds API
- Configure different margins per market type (spread, moneyline, totals)
- Set league-specific margin rules
- Adjust odds dynamically in real-time


---

## 📋 Implementation Steps

### Phase 1: Database Schema
Add odds configuration models to track juice settings

### Phase 2: Juice Calculation Service
Core service to apply juice/margins to fair odds

### Phase 3: Admin Configuration UI
Dashboard interface for managing juice settings

### Phase 4: API Integration
Wire up juice application to all odds endpoints

### Phase 5: Real-time Updates
Ensure WebSocket streaming includes juiced odds

---

## 🗄️ Phase 1: Database Schema

### Add to `prisma/schema.prisma`:

```prisma
// Odds Configuration - Admin Juice/Margin Settings
model OddsConfiguration {
  id                String   @id @default(cuid())
  
  // Global settings
  isActive          Boolean  @default(true)
  lastModified      DateTime @default(now())
  modifiedBy        String   // AdminUser ID
  
  // Margin percentages (in decimal form, e.g., 0.05 = 5%)
  spreadMargin      Float    @default(0.045)    // 4.5% typical
  moneylineMargin   Float    @default(0.05)     // 5% typical
  totalMargin       Float    @default(0.045)    // 4.5% typical
  
  // Props margins (typically higher)
  playerPropsMargin Float    @default(0.08)     // 8% typical
  gamePropsMargin   Float    @default(0.08)     // 8% typical
  
  // Advanced settings
  roundingMethod    String   @default("nearest10") // 'nearest5', 'nearest10', 'ceiling'
  minOdds           Int      @default(-10000)   // Minimum odds allowed
  maxOdds           Int      @default(10000)    // Maximum odds allowed
  
  // League-specific overrides (JSON)
  leagueOverrides   Json?    // { "NBA": { "spreadMargin": 0.05 }, "NFL": { ... } }
  
  // Time-based adjustments (optional)
  liveGameMultiplier Float   @default(1.0)     // Increase margins for live games
  
  // Audit trail
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  modifiedByAdmin   AdminUser @relation(fields: [modifiedBy], references: [id])
  changeHistory     OddsConfigHistory[]
  
  @@index([isActive])
  @@index([lastModified])
  @@map("odds_configuration")
}

// Track all configuration changes for audit
model OddsConfigHistory {
  id              String           @id @default(cuid())
  configId        String
  adminUserId     String
  changedFields   Json             // What changed
  previousValues  Json             // Old values
  newValues       Json             // New values
  reason          String?          // Optional reason for change
  ipAddress       String?
  createdAt       DateTime         @default(now())
  
  config          OddsConfiguration @relation(fields: [configId], references: [id], onDelete: Cascade)
  admin           AdminUser         @relation(fields: [adminUserId], references: [id])
  
  @@index([configId])
  @@index([adminUserId])
  @@index([createdAt])
  @@map("odds_config_history")
}

// Update AdminUser model to include new relations
model AdminUser {
  // ... existing fields ...
  oddsConfigs        OddsConfiguration[]
  oddsConfigHistory  OddsConfigHistory[]
}
```

### Migration Command:
```bash
npx prisma migrate dev --name add-odds-configuration
npx prisma generate
```

---

## 💼 Phase 2: Juice Calculation Service

### Create `src/lib/odds-juice-service.ts`:

```typescript
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
   */
  async getConfig(): Promise<JuiceConfig> {
    const now = Date.now();
    
    // Return cached config if still fresh
    if (this.cachedConfig && (now - this.lastFetchTime) < this.CACHE_TTL) {
      return this.cachedConfig;
    }

    try {
      const config = await prisma.oddsConfiguration.findFirst({
        where: { isActive: true },
        orderBy: { lastModified: 'desc' },
      });

      if (!config) {
        // Return default config if none exists
        logger.warn('[OddsJuice] No active configuration found, using defaults');
        return this.getDefaultConfig();
      }

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
      return this.cachedConfig;
    } catch (error) {
      logger.error('[OddsJuice] Failed to fetch configuration', { error });
      return this.getDefaultConfig();
    }
  }

  /**
   * Default juice configuration (industry standard)
   */
  private getDefaultConfig(): JuiceConfig {
    return {
      spreadMargin: 0.045,      // 4.5%
      moneylineMargin: 0.05,    // 5%
      totalMargin: 0.045,       // 4.5%
      playerPropsMargin: 0.08,  // 8%
      gamePropsMargin: 0.08,    // 8%
      roundingMethod: 'nearest10',
      minOdds: -10000,
      maxOdds: 10000,
      liveGameMultiplier: 1.0,
    };
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
   */
  async applyJuice(input: OddsInput): Promise<OddsOutput> {
    const config = await this.getConfig();
    
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
```

---

## 🎨 Phase 3: Admin Configuration UI

### Create `src/app/admin/odds-config/page.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, TrendingUp, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

interface JuiceConfig {
  spreadMargin: number;
  moneylineMargin: number;
  totalMargin: number;
  playerPropsMargin: number;
  gamePropsMargin: number;
  roundingMethod: string;
  liveGameMultiplier: number;
  minOdds: number;
  maxOdds: number;
  isActive: boolean;
}

interface LeagueOverride {
  league: string;
  spreadMargin?: number;
  moneylineMargin?: number;
  totalMargin?: number;
}

export default function OddsConfigPage() {
  const [config, setConfig] = useState<JuiceConfig>({
    spreadMargin: 4.5,
    moneylineMargin: 5.0,
    totalMargin: 4.5,
    playerPropsMargin: 8.0,
    gamePropsMargin: 8.0,
    roundingMethod: 'nearest10',
    liveGameMultiplier: 1.0,
    minOdds: -10000,
    maxOdds: 10000,
    isActive: true,
  });

  const [leagueOverrides, setLeagueOverrides] = useState<LeagueOverride[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/odds-config');
      if (res.ok) {
        const data = await res.json();
        setConfig({
          ...data,
          spreadMargin: data.spreadMargin * 100,
          moneylineMargin: data.moneylineMargin * 100,
          totalMargin: data.totalMargin * 100,
          playerPropsMargin: data.playerPropsMargin * 100,
          gamePropsMargin: data.gamePropsMargin * 100,
        });
        setLeagueOverrides(data.leagueOverrides || []);
      }
    } catch (error) {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...config,
        spreadMargin: config.spreadMargin / 100,
        moneylineMargin: config.moneylineMargin / 100,
        totalMargin: config.totalMargin / 100,
        playerPropsMargin: config.playerPropsMargin / 100,
        gamePropsMargin: config.gamePropsMargin / 100,
        leagueOverrides,
      };

      const res = await fetch('/api/admin/odds-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Juice configuration saved successfully!');
        await fetchConfig();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl font-bold text-foreground">Odds Juice Configuration</h1>
          </div>
          <p className="text-muted-foreground">
            Configure custom margins (juice/vig) applied to real-time odds from your sportsbook feed.
          </p>
        </div>

        {/* Info Banner */}
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">How Juice Works</p>
              <p>
                Fair odds come from the SportsGameOdds API with juice removed. Your configured margins
                are applied to adjust these odds, creating your house edge. Higher margins = more revenue
                but less competitive odds. Standard sports books use 4-5% margins.
              </p>
            </div>
          </div>
        </Card>

        {/* Status Toggle */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Juice System Status</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {config.isActive ? 'Custom margins are currently active' : 'System is using default odds'}
              </p>
            </div>
            <Button
              variant={config.isActive ? "default" : "outline"}
              onClick={() => setConfig({ ...config, isActive: !config.isActive })}
              className="w-32"
            >
              {config.isActive ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </Card>

        {/* Main Markets Configuration */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Main Markets Margins</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Set profit margins for standard bet types. Values are in percentage (e.g., 4.5 = 4.5% margin).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Spread */}
            <div>
              <Label htmlFor="spreadMargin" className="flex items-center gap-2">
                Spread Margin (%)
                <span className="text-xs text-muted-foreground">Standard: 4-5%</span>
              </Label>
              <Input
                id="spreadMargin"
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={config.spreadMargin}
                onChange={(e) => setConfig({ ...config, spreadMargin: parseFloat(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Applied to point spread bets (e.g., -7.5 points)
              </p>
            </div>

            {/* Moneyline */}
            <div>
              <Label htmlFor="moneylineMargin" className="flex items-center gap-2">
                Moneyline Margin (%)
                <span className="text-xs text-muted-foreground">Standard: 5-6%</span>
              </Label>
              <Input
                id="moneylineMargin"
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={config.moneylineMargin}
                onChange={(e) => setConfig({ ...config, moneylineMargin: parseFloat(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Applied to win/loss bets (no point spread)
              </p>
            </div>

            {/* Total */}
            <div>
              <Label htmlFor="totalMargin" className="flex items-center gap-2">
                Total (Over/Under) Margin (%)
                <span className="text-xs text-muted-foreground">Standard: 4-5%</span>
              </Label>
              <Input
                id="totalMargin"
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={config.totalMargin}
                onChange={(e) => setConfig({ ...config, totalMargin: parseFloat(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Applied to over/under total score bets
              </p>
            </div>

            {/* Live Game Multiplier */}
            <div>
              <Label htmlFor="liveMultiplier" className="flex items-center gap-2">
                Live Game Multiplier
                <span className="text-xs text-muted-foreground">Standard: 1.0-1.2</span>
              </Label>
              <Input
                id="liveMultiplier"
                type="number"
                step="0.1"
                min="1"
                max="2"
                value={config.liveGameMultiplier}
                onChange={(e) => setConfig({ ...config, liveGameMultiplier: parseFloat(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Multiply margins for live/in-progress games (higher risk)
              </p>
            </div>
          </div>
        </Card>

        {/* Props Markets */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Props Markets Margins</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Props typically have higher margins due to increased complexity and risk.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player Props */}
            <div>
              <Label htmlFor="playerPropsMargin" className="flex items-center gap-2">
                Player Props Margin (%)
                <span className="text-xs text-muted-foreground">Standard: 7-10%</span>
              </Label>
              <Input
                id="playerPropsMargin"
                type="number"
                step="0.5"
                min="0"
                max="30"
                value={config.playerPropsMargin}
                onChange={(e) => setConfig({ ...config, playerPropsMargin: parseFloat(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Applied to player stats bets (points, rebounds, etc.)
              </p>
            </div>

            {/* Game Props */}
            <div>
              <Label htmlFor="gamePropsMargin" className="flex items-center gap-2">
                Game Props Margin (%)
                <span className="text-xs text-muted-foreground">Standard: 7-10%</span>
              </Label>
              <Input
                id="gamePropsMargin"
                type="number"
                step="0.5"
                min="0"
                max="30"
                value={config.gamePropsMargin}
                onChange={(e) => setConfig({ ...config, gamePropsMargin: parseFloat(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Applied to game props (team totals, quarters, etc.)
              </p>
            </div>
          </div>
        </Card>

        {/* Advanced Settings (Collapsible) */}
        <Card className="p-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-xl font-semibold">Advanced Settings</h2>
            <Settings className={`w-5 h-5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="mt-6 space-y-6">
              {/* Rounding Method */}
              <div>
                <Label htmlFor="roundingMethod">Odds Rounding Method</Label>
                <select
                  id="roundingMethod"
                  value={config.roundingMethod}
                  onChange={(e) => setConfig({ ...config, roundingMethod: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border rounded-md"
                >
                  <option value="nearest5">Round to Nearest 5</option>
                  <option value="nearest10">Round to Nearest 10 (Standard)</option>
                  <option value="ceiling">Round Up (Ceiling)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  How to round adjusted odds values
                </p>
              </div>

              {/* Min/Max Odds */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minOdds">Minimum Odds</Label>
                  <Input
                    id="minOdds"
                    type="number"
                    value={config.minOdds}
                    onChange={(e) => setConfig({ ...config, minOdds: parseInt(e.target.value) })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="maxOdds">Maximum Odds</Label>
                  <Input
                    id="maxOdds"
                    type="number"
                    value={config.maxOdds}
                    onChange={(e) => setConfig({ ...config, maxOdds: parseInt(e.target.value) })}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* League-Specific Overrides */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">League-Specific Overrides</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set custom margins for specific leagues (overrides global settings).
          </p>
          
          <div className="text-sm text-muted-foreground">
            Coming soon: Configure margins per league (NBA, NFL, NHL, etc.)
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex gap-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 px-8"
            size="lg"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
          
          <Button
            onClick={fetchConfig}
            variant="outline"
            disabled={saving}
          >
            Reset to Saved
          </Button>
        </div>

        {/* Warning */}
        <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 dark:text-amber-100">
              <p className="font-semibold mb-1">Important</p>
              <p>
                Configuration changes take effect immediately for new odds fetches. Existing open bets
                maintain their original odds. Higher margins increase revenue but may make odds less
                competitive compared to other sportsbooks.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
```

---

## 🔌 Phase 4: API Integration

### Create `src/app/api/admin/odds-config/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/adminAuth";
import { oddsJuiceService } from "@/lib/odds-juice-service";

/**
 * GET /api/admin/odds-config
 * Fetch current odds juice configuration
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.oddsConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { lastModified: 'desc' },
    });

    if (!config) {
      // Return defaults if no config exists
      return NextResponse.json({
        spreadMargin: 0.045,
        moneylineMargin: 0.05,
        totalMargin: 0.045,
        playerPropsMargin: 0.08,
        gamePropsMargin: 0.08,
        roundingMethod: 'nearest10',
        liveGameMultiplier: 1.0,
        minOdds: -10000,
        maxOdds: 10000,
        isActive: false,
        leagueOverrides: null,
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching odds config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/odds-config
 * Update odds juice configuration
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      spreadMargin,
      moneylineMargin,
      totalMargin,
      playerPropsMargin,
      gamePropsMargin,
      roundingMethod,
      liveGameMultiplier,
      minOdds,
      maxOdds,
      isActive,
      leagueOverrides,
    } = body;

    // Fetch current config for history
    const currentConfig = await prisma.oddsConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { lastModified: 'desc' },
    });

    // Deactivate all existing configs
    await prisma.oddsConfiguration.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new config
    const newConfig = await prisma.oddsConfiguration.create({
      data: {
        spreadMargin,
        moneylineMargin,
        totalMargin,
        playerPropsMargin,
        gamePropsMargin,
        roundingMethod,
        liveGameMultiplier,
        minOdds,
        maxOdds,
        isActive,
        leagueOverrides: leagueOverrides || null,
        modifiedBy: admin.id,
      },
    });

    // Log the change in history
    if (currentConfig) {
      await prisma.oddsConfigHistory.create({
        data: {
          configId: newConfig.id,
          adminUserId: admin.id,
          changedFields: {
            spreadMargin: currentConfig.spreadMargin !== spreadMargin,
            moneylineMargin: currentConfig.moneylineMargin !== moneylineMargin,
            totalMargin: currentConfig.totalMargin !== totalMargin,
            playerPropsMargin: currentConfig.playerPropsMargin !== playerPropsMargin,
            gamePropsMargin: currentConfig.gamePropsMargin !== gamePropsMargin,
            liveGameMultiplier: currentConfig.liveGameMultiplier !== liveGameMultiplier,
          },
          previousValues: {
            spreadMargin: currentConfig.spreadMargin,
            moneylineMargin: currentConfig.moneylineMargin,
            totalMargin: currentConfig.totalMargin,
          },
          newValues: {
            spreadMargin,
            moneylineMargin,
            totalMargin,
          },
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        },
      });
    }

    // Log admin activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: admin.id,
        action: 'ODDS_CONFIG_UPDATE',
        resource: 'OddsConfiguration',
        resourceId: newConfig.id,
        details: {
          margins: { spreadMargin, moneylineMargin, totalMargin },
          isActive,
        },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    // Invalidate juice service cache
    oddsJuiceService.invalidateCache();

    return NextResponse.json({
      success: true,
      config: newConfig,
      message: 'Odds configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating odds config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
```

---

## 🔄 Phase 5: Integrate Juice Into Odds Transformer

### Update `src/lib/transformers/sportsgameodds-sdk.ts`:

Add juice application to the odds transformation:

```typescript
import { oddsJuiceService } from '../odds-juice-service';

// In transformSDKEvents function, after extracting fair odds:

async function applyJuiceToGameOdds(gameOdds: any, league: string, isLive: boolean) {
  // Apply juice to spread
  if (gameOdds.spread?.home && gameOdds.spread?.away) {
    const homeResult = await oddsJuiceService.applyJuice({
      fairOdds: gameOdds.spread.home.odds,
      marketType: 'spread',
      league,
      isLive,
    });
    const awayResult = await oddsJuiceService.applyJuice({
      fairOdds: gameOdds.spread.away.odds,
      marketType: 'spread',
      league,
      isLive,
    });
    
    gameOdds.spread.home.odds = homeResult.juicedOdds;
    gameOdds.spread.away.odds = awayResult.juicedOdds;
    gameOdds.spread.home.fairOdds = homeResult.fairOdds; // Keep fair odds for reference
    gameOdds.spread.away.fairOdds = awayResult.fairOdds;
  }

  // Apply juice to moneyline
  if (gameOdds.moneyline?.home && gameOdds.moneyline?.away) {
    const homeResult = await oddsJuiceService.applyJuice({
      fairOdds: gameOdds.moneyline.home.odds,
      marketType: 'moneyline',
      league,
      isLive,
    });
    const awayResult = await oddsJuiceService.applyJuice({
      fairOdds: gameOdds.moneyline.away.odds,
      marketType: 'moneyline',
      league,
      isLive,
    });
    
    gameOdds.moneyline.home.odds = homeResult.juicedOdds;
    gameOdds.moneyline.away.odds = awayResult.juicedOdds;
  }

  // Apply juice to totals
  if (gameOdds.total?.over && gameOdds.total?.under) {
    const overResult = await oddsJuiceService.applyJuice({
      fairOdds: gameOdds.total.over.odds,
      marketType: 'total',
      league,
      isLive,
    });
    const underResult = await oddsJuiceService.applyJuice({
      fairOdds: gameOdds.total.under.odds,
      marketType: 'total',
      league,
      isLive,
    });
    
    gameOdds.total.over.odds = overResult.juicedOdds;
    gameOdds.total.under.odds = underResult.juicedOdds;
  }

  return gameOdds;
}

// Call this function for each game's odds during transformation
```

---

## 📊 Benefits of This Architecture

### ✅ **Centralized Control**
- Single source of truth for all juice/margin configuration
- Admin can adjust margins in real-time without code changes

### ✅ **Granular Configuration**
- Different margins per market type (spread, ML, totals, props)
- League-specific overrides (e.g., higher margins for niche sports)
- Live game multipliers for dynamic adjustment

### ✅ **Complete Audit Trail**
- Every configuration change is logged
- Track who changed what and when
- Roll back to previous configurations if needed

### ✅ **Performance Optimized**
- Configuration caching with TTL
- Batch processing for multiple odds
- Minimal database queries

### ✅ **Flexible & Extensible**
- Easy to add time-based margins (e.g., weekends vs weekdays)
- Can add player-tier based margins (VIP vs regular players)
- Support for promotional periods (reduced margins)

---

## 📈 Revenue Impact Example

**Scenario: NBA Game with -110/-110 fair odds on spread**

Without juice (fair): -110 / -110 = 0% house edge  
With 4.5% margin: -115 / -115 = ~4.5% house edge

**Expected Value:**
- $100,000 wagered on each side ($200k total)
- Without juice: $0 net (pays out $190,909 to each side)
- With 4.5% juice: ~$9,000 profit (pays out $186,956 to winners)

---

## 🚀 Next Steps

1. **Add migration and seed data**
2. **Test juice calculations with sample odds**
3. **Add admin navigation link to odds config page**
4. **Integrate with WebSocket streaming for real-time updates**
5. **Add revenue analytics dashboard showing juice impact**

---

## 📝 Testing Checklist

- [ ] Test margin application with various odds (-110, +150, -200, etc.)
- [ ] Verify rounding methods work correctly
- [ ] Test league-specific overrides
- [ ] Test live game multiplier
- [ ] Verify configuration caching works
- [ ] Test min/max odds enforcement
- [ ] Verify audit logs are created correctly
- [ ] Test batch processing performance

---

## 🎯 Future Enhancements

1. **Dynamic Margins** - Adjust based on betting patterns
2. **Risk Management** - Auto-adjust margins when liability is high
3. **A/B Testing** - Test different margin strategies
4. **Player Segmentation** - Different margins for VIP vs regular players
5. **Promotional Periods** - Scheduled margin reductions for marketing
6. **Analytics Dashboard** - Track revenue from juice application

