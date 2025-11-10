"use client";

import { useState, useEffect, useMemo } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Save, 
  TrendingUp, 
  AlertCircle, 
  Info, 
  Plus, 
  Trash2, 
  X,
  ArrowRight,
  Search,
  Shield,
  Target,
  Flame,
  Eye,
  RefreshCw,
  Calculator
} from "lucide-react";
import { toast } from "sonner";

interface LeagueOverride {
  league: string;
  spreadMargin?: number;
  moneylineMargin?: number;
  totalMargin?: number;
  playerPropsMargin?: number;
  gamePropsMargin?: number;
}

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

// Preset templates
const PRESET_TEMPLATES = {
  conservative: {
    name: "Conservative",
    icon: Shield,
    description: "Lower margins, more competitive odds",
    color: "blue",
    config: {
      spreadMargin: 3.5,
      moneylineMargin: 4.0,
      totalMargin: 3.5,
      playerPropsMargin: 6.0,
      gamePropsMargin: 6.0,
      liveGameMultiplier: 1.0,
    }
  },
  standard: {
    name: "Standard",
    icon: Target,
    description: "Industry standard margins",
    color: "emerald",
    config: {
      spreadMargin: 4.5,
      moneylineMargin: 5.0,
      totalMargin: 4.5,
      playerPropsMargin: 8.0,
      gamePropsMargin: 8.0,
      liveGameMultiplier: 1.0,
    }
  },
  aggressive: {
    name: "Aggressive",
    icon: Flame,
    description: "Higher margins, maximum revenue",
    color: "red",
    config: {
      spreadMargin: 6.0,
      moneylineMargin: 7.0,
      totalMargin: 6.0,
      playerPropsMargin: 10.0,
      gamePropsMargin: 10.0,
      liveGameMultiplier: 1.2,
    }
  }
};

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

// Helper to convert American odds to probability
const americanOddsToProbability = (odds: number): number => {
  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
};

// Helper to convert probability to American odds
const probabilityToAmericanOdds = (probability: number): number => {
  if (probability >= 0.5) {
    return Math.round(-(probability * 100) / (1 - probability));
  } else {
    return Math.round(((1 - probability) * 100) / probability);
  }
};

// Helper to apply juice to odds
const applyJuiceToOdds = (fairOdds: number, marginPercent: number): number => {
  const fairProbability = americanOddsToProbability(fairOdds);
  const juicedProbability = fairProbability * (1 + marginPercent / 100);
  return probabilityToAmericanOdds(juicedProbability);
};

export default function OddsConfigPage() {
  const [config, setConfig] = useState<JuiceConfig | null>(null);
  const [leagueOverrides, setLeagueOverrides] = useState<LeagueOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("markets");
  const [leagueSearch, setLeagueSearch] = useState("");
  const [dailyHandle, setDailyHandle] = useState(10000);

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
          const overridesArray = Object.entries(data.leagueOverrides).map(([league, values]) => ({
            league,
            spreadMargin: (values as Record<string, number>).spreadMargin ? (values as Record<string, number>).spreadMargin * 100 : undefined,
            moneylineMargin: (values as Record<string, number>).moneylineMargin ? (values as Record<string, number>).moneylineMargin * 100 : undefined,
            totalMargin: (values as Record<string, number>).totalMargin ? (values as Record<string, number>).totalMargin * 100 : undefined,
            playerPropsMargin: (values as Record<string, number>).playerPropsMargin ? (values as Record<string, number>).playerPropsMargin * 100 : undefined,
            gamePropsMargin: (values as Record<string, number>).gamePropsMargin ? (values as Record<string, number>).gamePropsMargin * 100 : undefined,
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
    if (!config) {
      toast.error('No configuration to save');
      return;
    }
    
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
      }, {} as Record<string, Record<string, number>>);

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

  // Apply preset template
  const applyPreset = (presetKey: keyof typeof PRESET_TEMPLATES) => {
    if (!config) return;
    const preset = PRESET_TEMPLATES[presetKey];
    setConfig({
      ...config,
      ...preset.config,
    });
    toast.success(`${preset.name} template applied`);
  };

  // Calculate average margin
  const averageMargin = useMemo(() => {
    if (!config) return 0;
    return (config.spreadMargin + config.moneylineMargin + config.totalMargin) / 3;
  }, [config]);

  // Calculate projected revenue
  const projectedRevenue = useMemo(() => {
    const daily = dailyHandle * (averageMargin / 100);
    const monthly = daily * 30;
    const yearly = daily * 365;
    return { daily, monthly, yearly };
  }, [dailyHandle, averageMargin]);

  // Check for warnings
  const hasWarnings = useMemo(() => {
    if (!config) return [];
    const warnings = [];
    if (config.spreadMargin > 8) warnings.push('Spread margin is very high (>8%)');
    if (config.moneylineMargin > 10) warnings.push('Moneyline margin is very high (>10%)');
    if (config.playerPropsMargin > 15) warnings.push('Player props margin is very high (>15%)');
    if (averageMargin < 2) warnings.push('Average margin is very low (<2%)');
    return warnings;
  }, [config, averageMargin]);

  // Example odds preview
  const oddsPreview = useMemo(() => {
    if (!config) return [];
    return [
      { 
        type: 'Spread',
        fair: -110,
        juiced: applyJuiceToOdds(-110, config.spreadMargin),
        margin: config.spreadMargin
      },
      { 
        type: 'Moneyline (Fav)',
        fair: -200,
        juiced: applyJuiceToOdds(-200, config.moneylineMargin),
        margin: config.moneylineMargin
      },
      { 
        type: 'Moneyline (Dog)',
        fair: +150,
        juiced: applyJuiceToOdds(+150, config.moneylineMargin),
        margin: config.moneylineMargin
      },
      { 
        type: 'Total',
        fair: -105,
        juiced: applyJuiceToOdds(-105, config.totalMargin),
        margin: config.totalMargin
      },
    ];
  }, [config]);

  // League override management
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

  // Filter leagues by search
  const filteredLeagues = useMemo(() => {
    if (!leagueSearch) return leagueOverrides;
    return leagueOverrides.filter(override => {
      const league = AVAILABLE_LEAGUES.find(l => l.id === override.league);
      return league?.name.toLowerCase().includes(leagueSearch.toLowerCase()) ||
             league?.sport.toLowerCase().includes(leagueSearch.toLowerCase());
    });
  }, [leagueOverrides, leagueSearch]);

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className="space-y-4 md:space-y-6 max-w-7xl" style={{ padding: '15px' }}>
          {/* Header Skeleton */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-muted rounded animate-pulse" />
              <div className="h-6 sm:h-8 w-48 sm:w-64 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-3 sm:h-4 w-full sm:w-96 bg-muted rounded animate-pulse" />
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-3 md:p-4">
                <div className="h-3 w-16 sm:w-24 bg-muted rounded animate-pulse mb-2" />
                <div className="h-6 sm:h-8 w-12 sm:w-20 bg-muted rounded animate-pulse" />
              </Card>
            ))}
          </div>

          {/* Content Skeleton */}
          <Card className="p-4 md:p-6">
            <div className="space-y-3 md:space-y-4">
              <div className="h-5 sm:h-6 w-32 sm:w-48 bg-muted rounded animate-pulse" />
              <div className="h-3 sm:h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-3 sm:h-4 w-3/4 bg-muted rounded animate-pulse" />
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <div className="space-y-3 md:space-y-4">
              <div className="h-5 sm:h-6 w-32 sm:w-48 bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 sm:h-24 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </AdminDashboardLayout>
    );
  }

  if (!config) {
    return (
      <AdminDashboardLayout>
        <div className="max-w-7xl" style={{ padding: '15px' }}>
          <Card className="p-8 md:p-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 md:w-16 md:h-16 mx-auto text-amber-600 mb-3 md:mb-4" />
              <h2 className="text-xl md:text-2xl font-bold mb-2">No Configuration Found</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Unable to load odds configuration. This might be a temporary issue.
              </p>
              <Button onClick={fetchConfig} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-4 md:space-y-6 max-w-7xl" style={{ padding: '15px' }}>
        {/* Header */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-accent shrink-0" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Odds Juice Configuration</h1>
            </div>
            
            {/* Sleek Status Indicator with Toggle */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-card border border-border w-fit">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Status:</span>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex items-center justify-center">
                    {config.isActive ? (
                      <>
                        {/* Green Active Indicator with Glow */}
                        <div className="absolute w-4 h-4 bg-green-500/30 rounded-full animate-ping" 
                             style={{ animationDuration: '2s' }}></div>
                        <div className="absolute w-3 h-3 bg-green-500/50 rounded-full blur-sm"></div>
                        <div className="relative w-2 h-2 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></div>
                      </>
                    ) : (
                      <>
                        {/* Red Inactive Indicator */}
                        <div className="relative w-2 h-2 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></div>
                      </>
                    )}
                  </div>
                  <span className={`text-xs font-semibold ${
                    config.isActive 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {config.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="w-px h-5 bg-border"></div>

              {/* Toggle Switch */}
              <button
                onClick={async () => {
                  const newActiveState = !config.isActive;
                  setConfig({ ...config, isActive: newActiveState });
                  
                  // Auto-save when toggling
                  try {
                    const payload = {
                      ...config,
                      isActive: newActiveState,
                      spreadMargin: config.spreadMargin / 100,
                      moneylineMargin: config.moneylineMargin / 100,
                      totalMargin: config.totalMargin / 100,
                      playerPropsMargin: config.playerPropsMargin / 100,
                      gamePropsMargin: config.gamePropsMargin / 100,
                      leagueOverrides: leagueOverrides.length > 0 ? leagueOverrides.reduce((acc, override) => {
                        acc[override.league] = {
                          ...(override.spreadMargin !== undefined && { spreadMargin: override.spreadMargin / 100 }),
                          ...(override.moneylineMargin !== undefined && { moneylineMargin: override.moneylineMargin / 100 }),
                          ...(override.totalMargin !== undefined && { totalMargin: override.totalMargin / 100 }),
                          ...(override.playerPropsMargin !== undefined && { playerPropsMargin: override.playerPropsMargin / 100 }),
                          ...(override.gamePropsMargin !== undefined && { gamePropsMargin: override.gamePropsMargin / 100 }),
                        };
                        return acc;
                      }, {} as Record<string, Record<string, number>>) : null,
                    };

                    const res = await fetch('/api/admin/odds-config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    });

                    if (res.ok) {
                      toast.success(newActiveState ? 'Juice/Margins enabled!' : 'Juice/Margins disabled - using fair odds');
                      await fetchConfig();
                    } else {
                      throw new Error('Failed to save');
                    }
                  } catch {
                    toast.error('Failed to update status');
                    // Revert state on error
                    setConfig({ ...config, isActive: !newActiveState });
                  }
                }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                  config.isActive ? 'bg-green-500' : 'bg-muted'
                }`}
                role="switch"
                aria-checked={config.isActive}
                title={config.isActive ? 'Click to disable' : 'Click to enable'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    config.isActive ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Configure custom margins (juice/vig) applied to real-time odds from your sportsbook feed.
          </p>
        </div>

        {/* Warnings */}
        {hasWarnings.length > 0 && (
          <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 dark:text-amber-100">
                <p className="font-semibold mb-1">Configuration Warnings</p>
                <ul className="list-disc list-inside space-y-1">
                  {hasWarnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}



        {/* Tabs */}
        <Tabs className="w-full">
          <TabsList
            className="flex w-full flex-row gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-accent/40 scrollbar-track-transparent scroll-smooth px-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <TabsTrigger 
              onClick={() => setActiveTab("markets")}
              data-state={activeTab === "markets" ? "active" : "inactive"}
              className="gap-1 md:gap-2 text-xs md:text-sm"
            >
              <Target className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Main </span>Markets
            </TabsTrigger>
            <TabsTrigger 
              onClick={() => setActiveTab("props")}
              data-state={activeTab === "props" ? "active" : "inactive"}
              className="gap-1 md:gap-2 text-xs md:text-sm"
            >
              <Flame className="w-3 h-3 md:w-4 md:h-4" />
              Props
            </TabsTrigger>
            <TabsTrigger 
              onClick={() => setActiveTab("leagues")}
              data-state={activeTab === "leagues" ? "active" : "inactive"}
              className="gap-1 md:gap-2 text-xs md:text-sm"
            >
              <Settings className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">League </span>Overrides
            </TabsTrigger>
            <TabsTrigger 
              onClick={() => setActiveTab("analytics")}
              data-state={activeTab === "analytics" ? "active" : "inactive"}
              className="gap-1 md:gap-2 text-xs md:text-sm"
            >
              <Eye className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Preview & </span>Analytics
            </TabsTrigger>
          </TabsList>

          {/* Main Markets Tab */}
          {activeTab === "markets" && (
            <TabsContent className="space-y-4 md:space-y-6 mt-4 md:mt-6">
            {/* Preset Templates */}
            <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
              <Label htmlFor="presetSelect" className="text-sm font-medium whitespace-nowrap">Quick Preset:</Label>
              <select
                id="presetSelect"
                onChange={(e) => {
                  if (e.target.value) {
                    applyPreset(e.target.value as keyof typeof PRESET_TEMPLATES);
                    e.target.value = '';
                  }
                }}
                className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background cursor-pointer"
              >
                <option value="">Select a template...</option>
                {Object.entries(PRESET_TEMPLATES).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.name} - {preset.description}
                  </option>
                ))}
              </select>
            </div>

            {/* ...existing code... */}

            {/* Main Markets Configuration */}
            <Card className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Main Markets Margins</h2>
              <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
                Fine-tune profit margins for standard bet types using sliders or direct input.
              </p>

              <div className="flex flex-row flex-wrap gap-4 items-center justify-between">
                {/* Spread Margin */}
                <div className="flex flex-col items-center min-w-[120px]">
                  <Label htmlFor="spreadMargin" className="text-xs font-medium mb-1">Spread</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={config.spreadMargin}
                    onChange={(e) => setConfig({ ...config, spreadMargin: parseFloat(e.target.value) || 0 })}
                    className="w-14 text-center font-semibold h-7 mb-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.1"
                    value={config.spreadMargin}
                    onChange={(e) => setConfig({ ...config, spreadMargin: parseFloat(e.target.value) })}
                    className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                </div>
                {/* Moneyline Margin */}
                <div className="flex flex-col items-center min-w-[120px]">
                  <Label htmlFor="moneylineMargin" className="text-xs font-medium mb-1">Moneyline</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={config.moneylineMargin}
                    onChange={(e) => setConfig({ ...config, moneylineMargin: parseFloat(e.target.value) || 0 })}
                    className="w-14 text-center font-semibold h-7 mb-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.1"
                    value={config.moneylineMargin}
                    onChange={(e) => setConfig({ ...config, moneylineMargin: parseFloat(e.target.value) })}
                    className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                </div>
                {/* Total Margin */}
                <div className="flex flex-col items-center min-w-[120px]">
                  <Label htmlFor="totalMargin" className="text-xs font-medium mb-1">Total</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={config.totalMargin}
                    onChange={(e) => setConfig({ ...config, totalMargin: parseFloat(e.target.value) || 0 })}
                    className="w-14 text-center font-semibold h-7 mb-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.1"
                    value={config.totalMargin}
                    onChange={(e) => setConfig({ ...config, totalMargin: parseFloat(e.target.value) })}
                    className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                </div>
                {/* Live Multiplier */}
                <div className="flex flex-col items-center min-w-[120px]">
                  <Label htmlFor="liveMultiplier" className="text-xs font-medium mb-1">Live Mult</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="2"
                    value={config.liveGameMultiplier}
                    onChange={(e) => setConfig({ ...config, liveGameMultiplier: parseFloat(e.target.value) || 1 })}
                    className="w-14 text-center font-semibold h-7 mb-1"
                  />
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.01"
                    value={config.liveGameMultiplier}
                    onChange={(e) => setConfig({ ...config, liveGameMultiplier: parseFloat(e.target.value) })}
                    className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                </div>
              </div>
            </Card>

            {/* Advanced Settings */}
            <Card className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Advanced Settings</h2>
              
              <div className="space-y-4 md:space-y-6">
                {/* Rounding Method */}
                <div>
                  <Label htmlFor="roundingMethod" className="text-sm md:text-base">Odds Rounding Method</Label>
                  <select
                    id="roundingMethod"
                    value={config.roundingMethod}
                    onChange={(e) => setConfig({ ...config, roundingMethod: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border rounded-md bg-background text-sm md:text-base"
                  >
                    <option value="nearest5">Round to Nearest 5</option>
                    <option value="nearest10">Round to Nearest 10 (Standard)</option>
                    <option value="ceiling">Round Up (Ceiling)</option>
                  </select>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-2">
                    How to round adjusted odds values
                  </p>
                </div>

                {/* Min/Max Odds */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="minOdds" className="text-sm md:text-base">Minimum Odds</Label>
                    <Input
                      id="minOdds"
                      type="number"
                      value={config.minOdds}
                      onChange={(e) => setConfig({ ...config, minOdds: parseInt(e.target.value) || -10000 })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxOdds" className="text-sm md:text-base">Maximum Odds</Label>
                    <Input
                      id="maxOdds"
                      type="number"
                      value={config.maxOdds}
                      onChange={(e) => setConfig({ ...config, maxOdds: parseInt(e.target.value) || 10000 })}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
          )}

          {/* Props Tab */}
          {activeTab === "props" && (
            <TabsContent className="space-y-4 md:space-y-6 mt-4 md:mt-6">
            <Card className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Props Markets Margins</h2>
              <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
                Props typically have higher margins due to increased complexity and risk.
              </p>

              <div className="space-y-6 md:space-y-8">
                {/* Player Props */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between mb-3">
                    <Label htmlFor="playerPropsMargin" className="flex flex-wrap items-center gap-2 text-sm md:text-base">
                      Player Props Margin
                      <Badge variant="outline" className="text-[10px] md:text-xs">Standard: 7-10%</Badge>
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={config.playerPropsMargin}
                      onChange={(e) => setConfig({ ...config, playerPropsMargin: parseFloat(e.target.value) || 0 })}
                      className="w-full sm:w-24 text-center font-semibold"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={config.playerPropsMargin}
                    onChange={(e) => setConfig({ ...config, playerPropsMargin: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-2">
                    Applied to player stats bets (points, rebounds, assists, etc.)
                  </p>
                </div>

                <Separator />

                {/* Game Props */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between mb-3">
                    <Label htmlFor="gamePropsMargin" className="flex flex-wrap items-center gap-2 text-sm md:text-base">
                      Game Props Margin
                      <Badge variant="outline" className="text-[10px] md:text-xs">Standard: 7-10%</Badge>
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={config.gamePropsMargin}
                      onChange={(e) => setConfig({ ...config, gamePropsMargin: parseFloat(e.target.value) || 0 })}
                      className="w-full sm:w-24 text-center font-semibold"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={config.gamePropsMargin}
                    onChange={(e) => setConfig({ ...config, gamePropsMargin: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-2">
                    Applied to game props (team totals, quarters, halves, etc.)
                  </p>
                </div>
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-3 md:p-4 bg-accent/5 border-accent/20">
              <div className="flex gap-2 md:gap-3">
                <Info className="w-4 h-4 md:w-5 md:h-5 text-accent shrink-0 mt-0.5" />
                <div className="text-xs md:text-sm text-foreground">
                  <p className="font-semibold mb-1">Why Higher Margins for Props?</p>
                  <p>
                    Player and game props have inherently higher variance and less liquidity than main markets.
                    Industry standard is 7-12% margins to compensate for increased risk and modeling difficulty.
                    Props also tend to attract sharper action, requiring additional protection.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
          )}

          {/* League Overrides Tab */}
          {activeTab === "leagues" && (
            <TabsContent className="space-y-4 md:space-y-6 mt-4 md:mt-6">
            <Card className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 sm:justify-between mb-3 md:mb-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-semibold">League-Specific Overrides</h2>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">
                    Set custom margins for specific leagues (overrides global settings).
                  </p>
                </div>
                <Button
                  onClick={addLeagueOverride}
                  size="sm"
                  className="gap-2 w-full sm:w-auto shrink-0"
                  disabled={leagueOverrides.length >= AVAILABLE_LEAGUES.length}
                >
                  <Plus size={16} />
                  Add Override
                </Button>
              </div>

              {leagueOverrides.length > 0 && (
                <div className="mb-3 md:mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search leagues..."
                      value={leagueSearch}
                      onChange={(e) => setLeagueSearch(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                </div>
              )}

              {leagueOverrides.length === 0 ? (
                <div className="text-center py-8 md:py-12 border-2 border-dashed border-border rounded-lg">
                  <Settings className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground mb-2 md:mb-3" />
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                    No league-specific overrides configured
                  </p>
                  <Button onClick={addLeagueOverride} size="sm" className="gap-2">
                    <Plus size={16} />
                    Add Your First Override
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {filteredLeagues.map((override) => {
                    const actualIndex = leagueOverrides.findIndex(o => o.league === override.league);
                    const availableLeagues = getAvailableLeaguesForOverride(override.league);
                    
                    return (
                      <Card key={actualIndex} className="p-3 md:p-5 bg-muted/30">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 sm:justify-between mb-3 md:mb-4">
                          <div className="flex-1 min-w-0">
                            <Label htmlFor={`league-${actualIndex}`} className="text-sm md:text-base font-semibold mb-2 block">
                              League
                            </Label>
                            <select
                              id={`league-${actualIndex}`}
                              value={override.league}
                              onChange={(e) => updateLeagueOverride(actualIndex, 'league', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            >
                              {availableLeagues.map(league => (
                                <option key={league.id} value={league.id}>
                                  {league.name} ({league.sport})
                                </option>
                              ))}
                            </select>
                          </div>
                          <Button
                            onClick={() => removeLeagueOverride(actualIndex)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto shrink-0"
                          >
                            <Trash2 size={16} className="sm:mr-0 mr-2" />
                            <span className="sm:hidden">Remove</span>
                          </Button>
                        </div>

                        <Separator className="my-3 md:my-4" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          {/* Spread Override */}
                          <div>
                            <Label htmlFor={`spread-${actualIndex}`} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs md:text-sm mb-2">
                              <span>Spread Margin (%)</span>
                              {override.spreadMargin === undefined && (
                                <span className="text-[10px] md:text-xs text-muted-foreground">(using global: {config.spreadMargin}%)</span>
                              )}
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id={`spread-${actualIndex}`}
                                type="number"
                                step="0.1"
                                min="0"
                                max="20"
                                value={override.spreadMargin ?? ''}
                                onChange={(e) => updateLeagueOverride(actualIndex, 'spreadMargin', e.target.value)}
                                placeholder={`${config.spreadMargin}%`}
                                className="text-sm"
                              />
                              {override.spreadMargin !== undefined && (
                                <Button
                                  onClick={() => updateLeagueOverride(actualIndex, 'spreadMargin', undefined)}
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 px-2"
                                  title="Use global value"
                                >
                                  <X size={16} />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Moneyline Override */}
                          <div>
                            <Label htmlFor={`moneyline-${actualIndex}`} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs md:text-sm mb-2">
                              <span>Moneyline Margin (%)</span>
                              {override.moneylineMargin === undefined && (
                                <span className="text-[10px] md:text-xs text-muted-foreground">(using global: {config.moneylineMargin}%)</span>
                              )}
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id={`moneyline-${actualIndex}`}
                                type="number"
                                step="0.1"
                                min="0"
                                max="20"
                                value={override.moneylineMargin ?? ''}
                                onChange={(e) => updateLeagueOverride(actualIndex, 'moneylineMargin', e.target.value)}
                                placeholder={`${config.moneylineMargin}%`}
                                className="text-sm"
                              />
                              {override.moneylineMargin !== undefined && (
                                <Button
                                  onClick={() => updateLeagueOverride(actualIndex, 'moneylineMargin', undefined)}
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 px-2"
                                  title="Use global value"
                                >
                                  <X size={16} />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Total Override */}
                          <div>
                            <Label htmlFor={`total-${actualIndex}`} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs md:text-sm mb-2">
                              <span>Total Margin (%)</span>
                              {override.totalMargin === undefined && (
                                <span className="text-[10px] md:text-xs text-muted-foreground">(using global: {config.totalMargin}%)</span>
                              )}
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id={`total-${actualIndex}`}
                                type="number"
                                step="0.1"
                                min="0"
                                max="20"
                                value={override.totalMargin ?? ''}
                                onChange={(e) => updateLeagueOverride(actualIndex, 'totalMargin', e.target.value)}
                                placeholder={`${config.totalMargin}%`}
                                className="text-sm"
                              />
                              {override.totalMargin !== undefined && (
                                <Button
                                  onClick={() => updateLeagueOverride(actualIndex, 'totalMargin', undefined)}
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 px-2"
                                  title="Use global value"
                                >
                                  <X size={16} />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Player Props Override */}
                          <div>
                            <Label htmlFor={`player-props-${actualIndex}`} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs md:text-sm mb-2">
                              <span>Player Props (%)</span>
                              {override.playerPropsMargin === undefined && (
                                <span className="text-[10px] md:text-xs text-muted-foreground">(using global: {config.playerPropsMargin}%)</span>
                              )}
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id={`player-props-${actualIndex}`}
                                type="number"
                                step="0.5"
                                min="0"
                                max="30"
                                value={override.playerPropsMargin ?? ''}
                                onChange={(e) => updateLeagueOverride(actualIndex, 'playerPropsMargin', e.target.value)}
                                placeholder={`${config.playerPropsMargin}%`}
                                className="text-sm"
                              />
                              {override.playerPropsMargin !== undefined && (
                                <Button
                                  onClick={() => updateLeagueOverride(actualIndex, 'playerPropsMargin', undefined)}
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 px-2"
                                  title="Use global value"
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
              )}

              {leagueOverrides.length > 0 && (
                <Card className="p-2 md:p-3 bg-accent/5 border-accent/20 mt-3 md:mt-4">
                  <p className="text-[10px] md:text-xs text-foreground">
                    <strong>💡 Tip:</strong> Leave fields empty to use global margins. Only override margins you want to customize per league.
                  </p>
                </Card>
              )}
            </Card>
          </TabsContent>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <TabsContent className="space-y-4 md:space-y-6 mt-4 md:mt-6">
            {/* Inactive Warning in Analytics */}
            {!config.isActive && (
              <Card className="p-4 md:p-6 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm md:text-base text-amber-900 dark:text-amber-100 mb-1">
                      Preview Mode - Configuration Not Active
                    </p>
                    <p className="text-xs md:text-sm text-amber-900 dark:text-amber-100">
                      The calculations below show <strong>potential revenue</strong> if this configuration were enabled.
                      Currently, players see fair odds without juice.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Revenue Calculator */}
            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Calculator className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                <h2 className="text-lg md:text-xl font-semibold">Revenue Calculator</h2>
              </div>
              
              <div className="mb-4 md:mb-6">
                <Label htmlFor="dailyHandle" className="text-sm md:text-base mb-2 block">
                  Estimated Daily Handle ($)
                </Label>
                <Input
                  id="dailyHandle"
                  type="number"
                  step="1000"
                  min="0"
                  value={dailyHandle}
                  onChange={(e) => setDailyHandle(parseInt(e.target.value) || 0)}
                  className="text-base md:text-lg font-semibold"
                  placeholder="10000"
                />
                <p className="text-[10px] md:text-xs text-muted-foreground mt-2">
                  Total amount wagered per day across all markets
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <Card className={`p-3 md:p-4 bg-accent/10 border-accent/30 ${!config.isActive ? 'opacity-60' : ''}`}>
                  <p className="text-[10px] md:text-xs font-semibold text-foreground uppercase mb-2">
                    Daily Profit {!config.isActive && '(Potential)'}
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-accent">
                    ${projectedRevenue.daily.toFixed(2)}
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    {averageMargin.toFixed(2)}% avg margin
                  </p>
                  {!config.isActive && (
                    <Badge variant="secondary" className="mt-2 text-[10px] md:text-xs bg-amber-100 text-amber-800">
                      Not Currently Applied
                    </Badge>
                  )}
                </Card>

                <Card className={`p-3 md:p-4 bg-accent/10 border-accent/30 ${!config.isActive ? 'opacity-60' : ''}`}>
                  <p className="text-[10px] md:text-xs font-semibold text-foreground uppercase mb-2">
                    Monthly Profit {!config.isActive && '(Potential)'}
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-accent">
                    ${(projectedRevenue.monthly / 1000).toFixed(1)}K
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    30-day projection
                  </p>
                  {!config.isActive && (
                    <Badge variant="secondary" className="mt-2 text-[10px] md:text-xs bg-amber-100 text-amber-800">
                      Not Currently Applied
                    </Badge>
                  )}
                </Card>

                <Card className={`p-3 md:p-4 bg-accent/10 border-accent/30 ${!config.isActive ? 'opacity-60' : ''}`}>
                  <p className="text-[10px] md:text-xs font-semibold text-foreground uppercase mb-2">
                    Yearly Profit {!config.isActive && '(Potential)'}
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-accent">
                    ${(projectedRevenue.yearly / 1000).toFixed(0)}K
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    365-day projection
                  </p>
                  {!config.isActive && (
                    <Badge variant="secondary" className="mt-2 text-[10px] md:text-xs bg-amber-100 text-amber-800">
                      Not Currently Applied
                    </Badge>
                  )}
                </Card>
              </div>
            </Card>

            {/* Odds Preview */}
            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Eye className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                <h2 className="text-lg md:text-xl font-semibold">
                  Live Odds Preview
                  {!config.isActive && (
                    <span className="text-xs md:text-sm text-amber-600 ml-2 block sm:inline">(Not Currently Applied)</span>
                  )}
                </h2>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
                {config.isActive 
                  ? 'See how your margin configuration transforms fair odds into juiced odds.'
                  : 'Preview how margins would transform fair odds if enabled. Currently showing fair odds to players.'}
              </p>

              <div className="space-y-3">
                {oddsPreview.map((preview, idx) => {
                  const change = preview.juiced - preview.fair;
                  return (
                    <Card key={idx} className="p-3 md:p-4 bg-muted/30">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm md:text-base mb-1">{preview.type}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground">
                              {preview.margin.toFixed(1)}% margin applied
                            </p>
                          </div>
                          <Badge 
                            variant={change < 0 ? "destructive" : "default"}
                            className="font-mono text-xs md:text-sm shrink-0"
                          >
                            {change > 0 ? '+' : ''}{change}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-start">
                          <div className="flex-1 sm:flex-none">
                            <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Fair Odds</p>
                            <Badge variant="outline" className="text-sm md:text-base font-mono px-2 md:px-3 py-1 w-full justify-center">
                              {preview.fair > 0 ? '+' : ''}{preview.fair}
                            </Badge>
                          </div>
                          
                          <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0" />
                          
                          <div className="flex-1 sm:flex-none">
                            <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Juiced Odds</p>
                            <Badge className="text-sm md:text-base font-mono px-2 md:px-3 py-1 bg-accent w-full justify-center">
                              {preview.juiced > 0 ? '+' : ''}{preview.juiced}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <Card className="p-2 md:p-3 bg-accent/5 border-accent/20 mt-3 md:mt-4">
                <div className="flex gap-2">
                  <Info className="w-3 h-3 md:w-4 md:h-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-[10px] md:text-xs text-foreground">
                    <strong>How to read:</strong> Negative odds becoming more negative (e.g., -110 → -120) and positive odds becoming less positive (e.g., +150 → +140) means worse odds for players, better margins for the house.
                  </p>
                </div>
              </Card>
            </Card>

            {/* Comparison by Market */}
            <Card className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Margin Comparison by Market</h2>
              
              <div className="space-y-3">
                {[
                  { name: 'Spread', value: config.spreadMargin },
                  { name: 'Moneyline', value: config.moneylineMargin },
                  { name: 'Total', value: config.totalMargin },
                  { name: 'Player Props', value: config.playerPropsMargin },
                  { name: 'Game Props', value: config.gamePropsMargin },
                ].map((market, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs md:text-sm font-medium">{market.name}</span>
                      <span className="text-xs md:text-sm font-bold">{market.value.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 md:h-3">
                      <div
                        className="bg-accent h-2 md:h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(market.value / 15) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
          )}
        </Tabs>

        {/* Save/Reset Actions */}
        <Card className="p-4 md:p-6">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-accent hover:bg-accent/90 gap-2 px-6 md:px-8 flex-1 sm:flex-none"
                size="lg"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
              
              <Button
                onClick={fetchConfig}
                variant="outline"
                disabled={saving}
                className="gap-2 flex-1 sm:flex-none"
                size="lg"
              >
                <RefreshCw size={18} />
                Reset to Saved
              </Button>
            </div>

            <Button
              onClick={() => applyPreset('standard')}
              variant="outline"
              className="gap-2 w-full"
              size="lg"
            >
              <Target size={18} />
              Reset to Standard
            </Button>
          </div>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
