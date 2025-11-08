"use client";

import { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, TrendingUp, AlertCircle, Info, Plus, Trash2, X } from "lucide-react";
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
  playerPropsMargin?: number;
  gamePropsMargin?: number;
}

// Available leagues from the system
const AVAILABLE_LEAGUES = [
  { id: 'NBA', name: 'NBA', sport: 'Basketball' },
  { id: 'WNBA', name: 'WNBA', sport: 'Basketball' },
  { id: 'NCAAB', name: 'NCAA Basketball', sport: 'Basketball' },
  { id: 'NFL', name: 'NFL', sport: 'Football' },
  { id: 'NCAAF', name: 'NCAA Football', sport: 'Football' },
  { id: 'NHL', name: 'NHL', sport: 'Hockey' },
  { id: 'MLB', name: 'MLB', sport: 'Baseball' },
  { id: 'EPL', name: 'English Premier League', sport: 'Soccer' },
  { id: 'LALIGA', name: 'La Liga', sport: 'Soccer' },
  { id: 'BUNDESLIGA', name: 'Bundesliga', sport: 'Soccer' },
  { id: 'MLS', name: 'MLS', sport: 'Soccer' },
  { id: 'UFC', name: 'UFC', sport: 'MMA' },
  { id: 'ATP', name: 'ATP Tennis', sport: 'Tennis' },
  { id: 'WTA', name: 'WTA Tennis', sport: 'Tennis' },
  { id: 'PGA', name: 'PGA Golf', sport: 'Golf' },
];

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
  const [showLeagueOverrides, setShowLeagueOverrides] = useState(false);
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
        
        // Convert league overrides from stored format to UI format
        if (data.leagueOverrides) {
          const overridesArray = Object.entries(data.leagueOverrides).map(([league, values]: [string, any]) => ({
            league,
            spreadMargin: values.spreadMargin ? values.spreadMargin * 100 : undefined,
            moneylineMargin: values.moneylineMargin ? values.moneylineMargin * 100 : undefined,
            totalMargin: values.totalMargin ? values.totalMargin * 100 : undefined,
            playerPropsMargin: values.playerPropsMargin ? values.playerPropsMargin * 100 : undefined,
            gamePropsMargin: values.gamePropsMargin ? values.gamePropsMargin * 100 : undefined,
          }));
          setLeagueOverrides(overridesArray);
        }
      }
    } catch {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert league overrides array to object format for storage
      const leagueOverridesObject = leagueOverrides.reduce((acc, override) => {
        acc[override.league] = {
          ...(override.spreadMargin !== undefined && { spreadMargin: override.spreadMargin / 100 }),
          ...(override.moneylineMargin !== undefined && { moneylineMargin: override.moneylineMargin / 100 }),
          ...(override.totalMargin !== undefined && { totalMargin: override.totalMargin / 100 }),
          ...(override.playerPropsMargin !== undefined && { playerPropsMargin: override.playerPropsMargin / 100 }),
          ...(override.gamePropsMargin !== undefined && { gamePropsMargin: override.gamePropsMargin / 100 }),
        };
        return acc;
      }, {} as Record<string, any>);

      const payload = {
        ...config,
        spreadMargin: config.spreadMargin / 100,
        moneylineMargin: config.moneylineMargin / 100,
        totalMargin: config.totalMargin / 100,
        playerPropsMargin: config.playerPropsMargin / 100,
        gamePropsMargin: config.gamePropsMargin / 100,
        leagueOverrides: Object.keys(leagueOverridesObject).length > 0 ? leagueOverridesObject : null,
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
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // League override management functions
  const addLeagueOverride = () => {
    const usedLeagues = leagueOverrides.map(o => o.league);
    const availableLeague = AVAILABLE_LEAGUES.find(l => !usedLeagues.includes(l.id));
    
    if (availableLeague) {
      setLeagueOverrides([...leagueOverrides, {
        league: availableLeague.id,
        spreadMargin: undefined,
        moneylineMargin: undefined,
        totalMargin: undefined,
      }]);
    } else {
      toast.error('All leagues already have overrides configured');
    }
  };

  const removeLeagueOverride = (index: number) => {
    setLeagueOverrides(leagueOverrides.filter((_, i) => i !== index));
  };

  const updateLeagueOverride = (index: number, field: keyof LeagueOverride, value: string | number | undefined) => {
    const updated = [...leagueOverrides];
    if (field === 'league') {
      updated[index][field] = value as string;
    } else {
      updated[index][field] = value === '' || value === undefined ? undefined : Number(value);
    }
    setLeagueOverrides(updated);
  };

  const getAvailableLeaguesForOverride = (currentLeague: string) => {
    const usedLeagues = leagueOverrides.map(o => o.league).filter(l => l !== currentLeague);
    return AVAILABLE_LEAGUES.filter(l => !usedLeagues.includes(l.id));
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">League-Specific Overrides</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set custom margins for specific leagues (overrides global settings).
              </p>
            </div>
            <Button
              onClick={() => setShowLeagueOverrides(!showLeagueOverrides)}
              variant="outline"
              size="sm"
            >
              {showLeagueOverrides ? 'Hide' : 'Show'}
            </Button>
          </div>

          {showLeagueOverrides && (
            <div className="space-y-4">
              {leagueOverrides.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    No league-specific overrides configured
                  </p>
                  <Button onClick={addLeagueOverride} size="sm" className="gap-2">
                    <Plus size={16} />
                    Add League Override
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {leagueOverrides.map((override, index) => {
                      const leagueInfo = AVAILABLE_LEAGUES.find(l => l.id === override.league);
                      const availableLeagues = getAvailableLeaguesForOverride(override.league);
                      
                      return (
                        <Card key={index} className="p-4 bg-muted/50">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <Label htmlFor={`league-${index}`} className="text-base font-semibold">
                                League
                              </Label>
                              <select
                                id={`league-${index}`}
                                value={override.league}
                                onChange={(e) => updateLeagueOverride(index, 'league', e.target.value)}
                                className="mt-2 w-full px-3 py-2 border rounded-md bg-background"
                              >
                                {availableLeagues.map(league => (
                                  <option key={league.id} value={league.id}>
                                    {league.name} ({league.sport})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <Button
                              onClick={() => removeLeagueOverride(index)}
                              variant="ghost"
                              size="sm"
                              className="ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`spread-${index}`} className="flex items-center gap-2">
                                Spread Margin (%)
                                <span className="text-xs text-muted-foreground">
                                  {override.spreadMargin === undefined && '(using global)'}
                                </span>
                              </Label>
                              <div className="flex gap-2 mt-2">
                                <Input
                                  id={`spread-${index}`}
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="20"
                                  value={override.spreadMargin ?? ''}
                                  onChange={(e) => updateLeagueOverride(index, 'spreadMargin', e.target.value)}
                                  placeholder={`Global: ${config.spreadMargin}%`}
                                />
                                {override.spreadMargin !== undefined && (
                                  <Button
                                    onClick={() => updateLeagueOverride(index, 'spreadMargin', undefined)}
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0"
                                    title="Clear override"
                                  >
                                    <X size={16} />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div>
                              <Label htmlFor={`moneyline-${index}`} className="flex items-center gap-2">
                                Moneyline Margin (%)
                                <span className="text-xs text-muted-foreground">
                                  {override.moneylineMargin === undefined && '(using global)'}
                                </span>
                              </Label>
                              <div className="flex gap-2 mt-2">
                                <Input
                                  id={`moneyline-${index}`}
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="20"
                                  value={override.moneylineMargin ?? ''}
                                  onChange={(e) => updateLeagueOverride(index, 'moneylineMargin', e.target.value)}
                                  placeholder={`Global: ${config.moneylineMargin}%`}
                                />
                                {override.moneylineMargin !== undefined && (
                                  <Button
                                    onClick={() => updateLeagueOverride(index, 'moneylineMargin', undefined)}
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0"
                                    title="Clear override"
                                  >
                                    <X size={16} />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div>
                              <Label htmlFor={`total-${index}`} className="flex items-center gap-2">
                                Total Margin (%)
                                <span className="text-xs text-muted-foreground">
                                  {override.totalMargin === undefined && '(using global)'}
                                </span>
                              </Label>
                              <div className="flex gap-2 mt-2">
                                <Input
                                  id={`total-${index}`}
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="20"
                                  value={override.totalMargin ?? ''}
                                  onChange={(e) => updateLeagueOverride(index, 'totalMargin', e.target.value)}
                                  placeholder={`Global: ${config.totalMargin}%`}
                                />
                                {override.totalMargin !== undefined && (
                                  <Button
                                    onClick={() => updateLeagueOverride(index, 'totalMargin', undefined)}
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0"
                                    title="Clear override"
                                  >
                                    <X size={16} />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div>
                              <Label htmlFor={`player-props-${index}`} className="flex items-center gap-2">
                                Player Props Margin (%)
                                <span className="text-xs text-muted-foreground">
                                  {override.playerPropsMargin === undefined && '(using global)'}
                                </span>
                              </Label>
                              <div className="flex gap-2 mt-2">
                                <Input
                                  id={`player-props-${index}`}
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="30"
                                  value={override.playerPropsMargin ?? ''}
                                  onChange={(e) => updateLeagueOverride(index, 'playerPropsMargin', e.target.value)}
                                  placeholder={`Global: ${config.playerPropsMargin}%`}
                                />
                                {override.playerPropsMargin !== undefined && (
                                  <Button
                                    onClick={() => updateLeagueOverride(index, 'playerPropsMargin', undefined)}
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0"
                                    title="Clear override"
                                  >
                                    <X size={16} />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div>
                              <Label htmlFor={`game-props-${index}`} className="flex items-center gap-2">
                                Game Props Margin (%)
                                <span className="text-xs text-muted-foreground">
                                  {override.gamePropsMargin === undefined && '(using global)'}
                                </span>
                              </Label>
                              <div className="flex gap-2 mt-2">
                                <Input
                                  id={`game-props-${index}`}
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="30"
                                  value={override.gamePropsMargin ?? ''}
                                  onChange={(e) => updateLeagueOverride(index, 'gamePropsMargin', e.target.value)}
                                  placeholder={`Global: ${config.gamePropsMargin}%`}
                                />
                                {override.gamePropsMargin !== undefined && (
                                  <Button
                                    onClick={() => updateLeagueOverride(index, 'gamePropsMargin', undefined)}
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0"
                                    title="Clear override"
                                  >
                                    <X size={16} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {leagueOverrides.length < AVAILABLE_LEAGUES.length && (
                    <Button onClick={addLeagueOverride} variant="outline" size="sm" className="gap-2 w-full">
                      <Plus size={16} />
                      Add Another League Override
                    </Button>
                  )}
                </>
              )}

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  <strong>Tip:</strong> Leave fields empty to use the global margin values. Only set overrides for margins you want to customize per league.
                </p>
              </div>
            </div>
          )}
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
