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
  DollarSign,
  Zap,
  ArrowRight,
  Search,
  BarChart3,
  Shield,
  Target,
  Flame,
  Eye,
  RefreshCw,
  Calculator
} from "lucide-react";
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
        <div className="p-6 space-y-6 max-w-7xl">
          {/* Header Skeleton */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-muted rounded animate-pulse" />
              <div className="h-8 w-64 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-96 bg-muted rounded animate-pulse" />
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4">
                <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
                <div className="h-8 w-20 bg-muted rounded animate-pulse" />
              </Card>
            ))}
          </div>

          {/* Content Skeleton */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-muted rounded animate-pulse" />
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
        <div className="p-6 max-w-7xl">
          <Card className="p-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-amber-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Configuration Found</h2>
              <p className="text-muted-foreground mb-6">
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
      <div className="p-6 space-y-6 max-w-7xl">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl font-bold text-foreground">Odds Juice Configuration</h1>
            <Badge variant={config.isActive ? "default" : "secondary"} className="ml-2">
              {config.isActive ? '🟢 Active' : '⚫ Inactive'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Configure custom margins (juice/vig) applied to real-time odds from your sportsbook feed.
          </p>
        </div>

        {/* Inactive Warning - Prominent */}
        {!config.isActive && (
          <Card className="p-6 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500 dark:border-amber-700">
            <div className="flex gap-4">
              <AlertCircle className="w-8 h-8 text-amber-600 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">
                  ⚠️ Juice Configuration is Currently INACTIVE
                </h3>
                <p className="text-sm text-amber-900 dark:text-amber-100 mb-3">
                  The margins configured below are <strong>NOT being applied</strong> to live game odds. 
                  Players are currently seeing <strong>fair odds without juice</strong> (0% house margin).
                </p>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => setConfig({ ...config, isActive: true })}
                    className="bg-amber-600 hover:bg-amber-700 gap-2"
                    size="sm"
                  >
                    <Zap className="w-4 h-4" />
                    Enable Juice System
                  </Button>
                  <Button 
                    onClick={() => setActiveTab("analytics")}
                    variant="outline"
                    size="sm"
                    className="border-amber-600 text-amber-900 dark:text-amber-100"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Impact
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className={`p-4 ${!config.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Avg Margin</p>
                <p className="text-2xl font-bold mt-1">{averageMargin.toFixed(2)}%</p>
                {!config.isActive && (
                  <p className="text-xs text-amber-600 mt-1">Not Applied</p>
                )}
              </div>
              <BarChart3 className="w-8 h-8 text-emerald-600 opacity-50" />
            </div>
          </Card>

          <Card className={`p-4 ${!config.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Daily Revenue</p>
                <p className="text-2xl font-bold mt-1">${projectedRevenue.daily.toFixed(0)}</p>
                {!config.isActive && (
                  <p className="text-xs text-amber-600 mt-1">Potential Only</p>
                )}
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
            {config.isActive && (
              <p className="text-xs text-muted-foreground mt-2">
                Based on ${dailyHandle.toLocaleString()} handle
              </p>
            )}
          </Card>

          <Card className={`p-4 ${!config.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Monthly Est.</p>
                <p className="text-2xl font-bold mt-1">${(projectedRevenue.monthly / 1000).toFixed(1)}K</p>
                {!config.isActive && (
                  <p className="text-xs text-amber-600 mt-1">Potential Only</p>
                )}
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </Card>

          <Card className={`p-4 ${!config.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Yearly Est.</p>
                <p className="text-2xl font-bold mt-1">${(projectedRevenue.yearly / 1000).toFixed(0)}K</p>
                {!config.isActive && (
                  <p className="text-xs text-amber-600 mt-1">Potential Only</p>
                )}
              </div>
              <Zap className="w-8 h-8 text-orange-600 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger 
              onClick={() => setActiveTab("markets")}
              data-state={activeTab === "markets" ? "active" : "inactive"}
              className="gap-2"
            >
              <Target className="w-4 h-4" />
              Main Markets
            </TabsTrigger>
            <TabsTrigger 
              onClick={() => setActiveTab("props")}
              data-state={activeTab === "props" ? "active" : "inactive"}
              className="gap-2"
            >
              <Flame className="w-4 h-4" />
              Props
            </TabsTrigger>
            <TabsTrigger 
              onClick={() => setActiveTab("leagues")}
              data-state={activeTab === "leagues" ? "active" : "inactive"}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              League Overrides
            </TabsTrigger>
            <TabsTrigger 
              onClick={() => setActiveTab("analytics")}
              data-state={activeTab === "analytics" ? "active" : "inactive"}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview & Analytics
            </TabsTrigger>
          </TabsList>

          {/* Main Markets Tab */}
          {activeTab === "markets" && (
            <TabsContent className="space-y-6 mt-6">
            {/* Preset Templates */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Presets</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Apply industry-standard margin templates with one click.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(PRESET_TEMPLATES).map(([key, preset]) => {
                  const Icon = preset.icon;
                  return (
                    <Card 
                      key={key}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md border-2 hover:border-${preset.color}-500`}
                      onClick={() => applyPreset(key as keyof typeof PRESET_TEMPLATES)}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-6 h-6 text-${preset.color}-600`} />
                        <div className="flex-1">
                          <h3 className="font-semibold">{preset.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                          <div className="mt-3 text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>Spread:</span>
                              <span className="font-medium">{preset.config.spreadMargin}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Moneyline:</span>
                              <span className="font-medium">{preset.config.moneylineMargin}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>

            {/* Status Toggle */}
            <Card className={`p-6 ${!config.isActive ? 'border-2 border-amber-500' : 'border-2 border-emerald-500'}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    Juice System Status
                    {!config.isActive && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        Revenue Loss
                      </Badge>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {config.isActive 
                      ? '✅ Custom margins are currently being applied to all live odds' 
                      : '❌ System is using fair odds without margins - No revenue generation'}
                  </p>
                  {!config.isActive && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-semibold">
                      💰 Missing ${projectedRevenue.daily.toFixed(0)}/day in potential revenue
                    </p>
                  )}
                </div>
                <Button
                  variant={config.isActive ? "default" : "outline"}
                  onClick={() => setConfig({ ...config, isActive: !config.isActive })}
                  className={`w-32 ${!config.isActive ? 'border-2 border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950' : ''}`}
                  size="lg"
                >
                  {config.isActive ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </Card>

            {/* Main Markets Configuration */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Main Markets Margins</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Fine-tune profit margins for standard bet types using sliders or direct input.
              </p>

              <div className="space-y-8">
                {/* Spread */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor="spreadMargin" className="flex items-center gap-2 text-base">
                      Spread Margin
                      <Badge variant="outline" className="text-xs">Standard: 4-5%</Badge>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={config.spreadMargin}
                      onChange={(e) => setConfig({ ...config, spreadMargin: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-center font-semibold"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.1"
                    value={config.spreadMargin}
                    onChange={(e) => setConfig({ ...config, spreadMargin: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Applied to point spread bets (e.g., -7.5 points)
                  </p>
                </div>

                <Separator />

                {/* Moneyline */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor="moneylineMargin" className="flex items-center gap-2 text-base">
                      Moneyline Margin
                      <Badge variant="outline" className="text-xs">Standard: 5-6%</Badge>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={config.moneylineMargin}
                      onChange={(e) => setConfig({ ...config, moneylineMargin: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-center font-semibold"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.1"
                    value={config.moneylineMargin}
                    onChange={(e) => setConfig({ ...config, moneylineMargin: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Applied to win/loss bets (no point spread)
                  </p>
                </div>

                <Separator />

                {/* Total */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor="totalMargin" className="flex items-center gap-2 text-base">
                      Total (Over/Under) Margin
                      <Badge variant="outline" className="text-xs">Standard: 4-5%</Badge>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={config.totalMargin}
                      onChange={(e) => setConfig({ ...config, totalMargin: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-center font-semibold"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.1"
                    value={config.totalMargin}
                    onChange={(e) => setConfig({ ...config, totalMargin: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Applied to over/under total score bets
                  </p>
                </div>

                <Separator />

                {/* Live Game Multiplier */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor="liveMultiplier" className="flex items-center gap-2 text-base">
                      Live Game Multiplier
                      <Badge variant="outline" className="text-xs">Standard: 1.0-1.2</Badge>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="2"
                      value={config.liveGameMultiplier}
                      onChange={(e) => setConfig({ ...config, liveGameMultiplier: parseFloat(e.target.value) || 1 })}
                      className="w-24 text-center font-semibold"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.1"
                    value={config.liveGameMultiplier}
                    onChange={(e) => setConfig({ ...config, liveGameMultiplier: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Multiply margins for live/in-progress games (higher risk = higher margin)
                  </p>
                </div>
              </div>
            </Card>

            {/* Advanced Settings */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Advanced Settings</h2>
              
              <div className="space-y-6">
                {/* Rounding Method */}
                <div>
                  <Label htmlFor="roundingMethod">Odds Rounding Method</Label>
                  <select
                    id="roundingMethod"
                    value={config.roundingMethod}
                    onChange={(e) => setConfig({ ...config, roundingMethod: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="nearest5">Round to Nearest 5</option>
                    <option value="nearest10">Round to Nearest 10 (Standard)</option>
                    <option value="ceiling">Round Up (Ceiling)</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-2">
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
                      onChange={(e) => setConfig({ ...config, minOdds: parseInt(e.target.value) || -10000 })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxOdds">Maximum Odds</Label>
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
            <TabsContent className="space-y-6 mt-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Props Markets Margins</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Props typically have higher margins due to increased complexity and risk.
              </p>

              <div className="space-y-8">
                {/* Player Props */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor="playerPropsMargin" className="flex items-center gap-2 text-base">
                      Player Props Margin
                      <Badge variant="outline" className="text-xs">Standard: 7-10%</Badge>
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={config.playerPropsMargin}
                      onChange={(e) => setConfig({ ...config, playerPropsMargin: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-center font-semibold"
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
                  <p className="text-xs text-muted-foreground mt-2">
                    Applied to player stats bets (points, rebounds, assists, etc.)
                  </p>
                </div>

                <Separator />

                {/* Game Props */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor="gamePropsMargin" className="flex items-center gap-2 text-base">
                      Game Props Margin
                      <Badge variant="outline" className="text-xs">Standard: 7-10%</Badge>
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={config.gamePropsMargin}
                      onChange={(e) => setConfig({ ...config, gamePropsMargin: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-center font-semibold"
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
                  <p className="text-xs text-muted-foreground mt-2">
                    Applied to game props (team totals, quarters, halves, etc.)
                  </p>
                </div>
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
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
            <TabsContent className="space-y-6 mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">League-Specific Overrides</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set custom margins for specific leagues (overrides global settings).
                  </p>
                </div>
                <Button
                  onClick={addLeagueOverride}
                  size="sm"
                  className="gap-2"
                  disabled={leagueOverrides.length >= AVAILABLE_LEAGUES.length}
                >
                  <Plus size={16} />
                  Add Override
                </Button>
              </div>

              {leagueOverrides.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search leagues..."
                      value={leagueSearch}
                      onChange={(e) => setLeagueSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {leagueOverrides.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                  <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No league-specific overrides configured
                  </p>
                  <Button onClick={addLeagueOverride} size="sm" className="gap-2">
                    <Plus size={16} />
                    Add Your First Override
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLeagues.map((override) => {
                    const actualIndex = leagueOverrides.findIndex(o => o.league === override.league);
                    const availableLeagues = getAvailableLeaguesForOverride(override.league);
                    
                    return (
                      <Card key={actualIndex} className="p-5 bg-muted/30">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <Label htmlFor={`league-${actualIndex}`} className="text-base font-semibold mb-2 block">
                              League
                            </Label>
                            <select
                              id={`league-${actualIndex}`}
                              value={override.league}
                              onChange={(e) => updateLeagueOverride(actualIndex, 'league', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md bg-background"
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
                            className="ml-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>

                        <Separator className="my-4" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Spread Override */}
                          <div>
                            <Label htmlFor={`spread-${actualIndex}`} className="flex items-center gap-2 text-sm mb-2">
                              Spread Margin (%)
                              {override.spreadMargin === undefined && (
                                <span className="text-xs text-muted-foreground">(using global: {config.spreadMargin}%)</span>
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
                              />
                              {override.spreadMargin !== undefined && (
                                <Button
                                  onClick={() => updateLeagueOverride(actualIndex, 'spreadMargin', undefined)}
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0"
                                  title="Use global value"
                                >
                                  <X size={16} />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Moneyline Override */}
                          <div>
                            <Label htmlFor={`moneyline-${actualIndex}`} className="flex items-center gap-2 text-sm mb-2">
                              Moneyline Margin (%)
                              {override.moneylineMargin === undefined && (
                                <span className="text-xs text-muted-foreground">(using global: {config.moneylineMargin}%)</span>
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
                              />
                              {override.moneylineMargin !== undefined && (
                                <Button
                                  onClick={() => updateLeagueOverride(actualIndex, 'moneylineMargin', undefined)}
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0"
                                  title="Use global value"
                                >
                                  <X size={16} />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Total Override */}
                          <div>
                            <Label htmlFor={`total-${actualIndex}`} className="flex items-center gap-2 text-sm mb-2">
                              Total Margin (%)
                              {override.totalMargin === undefined && (
                                <span className="text-xs text-muted-foreground">(using global: {config.totalMargin}%)</span>
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
                              />
                              {override.totalMargin !== undefined && (
                                <Button
                                  onClick={() => updateLeagueOverride(actualIndex, 'totalMargin', undefined)}
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0"
                                  title="Use global value"
                                >
                                  <X size={16} />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Player Props Override */}
                          <div>
                            <Label htmlFor={`player-props-${actualIndex}`} className="flex items-center gap-2 text-sm mb-2">
                              Player Props (%)
                              {override.playerPropsMargin === undefined && (
                                <span className="text-xs text-muted-foreground">(using global: {config.playerPropsMargin}%)</span>
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
                              />
                              {override.playerPropsMargin !== undefined && (
                                <Button
                                  onClick={() => updateLeagueOverride(actualIndex, 'playerPropsMargin', undefined)}
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0"
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
                <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 mt-4">
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    <strong>💡 Tip:</strong> Leave fields empty to use global margins. Only override margins you want to customize per league.
                  </p>
                </Card>
              )}
            </Card>
          </TabsContent>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <TabsContent className="space-y-6 mt-6">
            {/* Inactive Warning in Analytics */}
            {!config.isActive && (
              <Card className="p-6 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500">
                <div className="flex gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Preview Mode - Configuration Not Active
                    </p>
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      The calculations below show <strong>potential revenue</strong> if this configuration were enabled.
                      Currently, players see fair odds without juice.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Revenue Calculator */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-semibold">Revenue Calculator</h2>
              </div>
              
              <div className="mb-6">
                <Label htmlFor="dailyHandle" className="text-base mb-2 block">
                  Estimated Daily Handle ($)
                </Label>
                <Input
                  id="dailyHandle"
                  type="number"
                  step="1000"
                  min="0"
                  value={dailyHandle}
                  onChange={(e) => setDailyHandle(parseInt(e.target.value) || 0)}
                  className="text-lg font-semibold"
                  placeholder="10000"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Total amount wagered per day across all markets
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={`p-4 bg-linear-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border-emerald-200 ${!config.isActive ? 'opacity-60' : ''}`}>
                  <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100 uppercase mb-2">
                    Daily Profit {!config.isActive && '(Potential)'}
                  </p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                    ${projectedRevenue.daily.toFixed(2)}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                    {averageMargin.toFixed(2)}% avg margin
                  </p>
                  {!config.isActive && (
                    <Badge variant="secondary" className="mt-2 text-xs bg-amber-100 text-amber-800">
                      Not Currently Applied
                    </Badge>
                  )}
                </Card>

                <Card className={`p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 ${!config.isActive ? 'opacity-60' : ''}`}>
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase mb-2">
                    Monthly Profit {!config.isActive && '(Potential)'}
                  </p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                    ${(projectedRevenue.monthly / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    30-day projection
                  </p>
                  {!config.isActive && (
                    <Badge variant="secondary" className="mt-2 text-xs bg-amber-100 text-amber-800">
                      Not Currently Applied
                    </Badge>
                  )}
                </Card>

                <Card className={`p-4 bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 ${!config.isActive ? 'opacity-60' : ''}`}>
                  <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 uppercase mb-2">
                    Yearly Profit {!config.isActive && '(Potential)'}
                  </p>
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                    ${(projectedRevenue.yearly / 1000).toFixed(0)}K
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                    365-day projection
                  </p>
                  {!config.isActive && (
                    <Badge variant="secondary" className="mt-2 text-xs bg-amber-100 text-amber-800">
                      Not Currently Applied
                    </Badge>
                  )}
                </Card>
              </div>
            </Card>

            {/* Odds Preview */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold">
                  Live Odds Preview
                  {!config.isActive && (
                    <span className="text-sm text-amber-600 ml-2">(Not Currently Applied)</span>
                  )}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {config.isActive 
                  ? 'See how your margin configuration transforms fair odds into juiced odds.'
                  : 'Preview how margins would transform fair odds if enabled. Currently showing fair odds to players.'}
              </p>

              <div className="space-y-3">
                {oddsPreview.map((preview, idx) => {
                  const change = preview.juiced - preview.fair;
                  return (
                    <Card key={idx} className="p-4 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold mb-1">{preview.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {preview.margin.toFixed(1)}% margin applied
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">Fair Odds</p>
                            <Badge variant="outline" className="text-lg font-mono px-3 py-1">
                              {preview.fair > 0 ? '+' : ''}{preview.fair}
                            </Badge>
                          </div>
                          
                          <ArrowRight className="w-5 h-5 text-muted-foreground" />
                          
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">Juiced Odds</p>
                            <Badge className="text-lg font-mono px-3 py-1 bg-emerald-600">
                              {preview.juiced > 0 ? '+' : ''}{preview.juiced}
                            </Badge>
                          </div>
                          
                          <div className="text-center min-w-20">
                            <p className="text-xs text-muted-foreground mb-1">Change</p>
                            <Badge 
                              variant={change < 0 ? "destructive" : "default"}
                              className="font-mono"
                            >
                              {change > 0 ? '+' : ''}{change}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 mt-4">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    <strong>How to read:</strong> Negative odds becoming more negative (e.g., -110 → -120) and positive odds becoming less positive (e.g., +150 → +140) means worse odds for players, better margins for the house.
                  </p>
                </div>
              </Card>
            </Card>

            {/* Comparison by Market */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Margin Comparison by Market</h2>
              
              <div className="space-y-3">
                {[
                  { name: 'Spread', value: config.spreadMargin, color: 'emerald' },
                  { name: 'Moneyline', value: config.moneylineMargin, color: 'blue' },
                  { name: 'Total', value: config.totalMargin, color: 'purple' },
                  { name: 'Player Props', value: config.playerPropsMargin, color: 'orange' },
                  { name: 'Game Props', value: config.gamePropsMargin, color: 'red' },
                ].map((market, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{market.name}</span>
                      <span className="text-sm font-bold">{market.value.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                      <div
                        className={`bg-${market.color}-600 h-3 rounded-full transition-all duration-300`}
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
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2 px-8 flex-1 sm:flex-none"
              size="lg"
            >
              <Save size={18} />
              {saving ? 'Saving Configuration...' : 'Save Configuration'}
            </Button>
            
            <Button
              onClick={fetchConfig}
              variant="outline"
              disabled={saving}
              className="gap-2"
              size="lg"
            >
              <RefreshCw size={18} />
              Reset to Saved
            </Button>

            <div className="flex-1" />

            <Button
              onClick={() => applyPreset('standard')}
              variant="outline"
              className="gap-2"
              size="lg"
            >
              <Target size={18} />
              Reset to Standard
            </Button>
          </div>
        </Card>

        {/* Important Notice */}
        <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 dark:text-amber-100">
              <p className="font-semibold mb-1">⚠️ Important</p>
              <p>
                Configuration changes take effect immediately for new odds fetches. Existing open bets
                maintain their original odds. Higher margins increase revenue but may make odds less
                competitive compared to other sportsbooks. Always test with conservative margins first.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
