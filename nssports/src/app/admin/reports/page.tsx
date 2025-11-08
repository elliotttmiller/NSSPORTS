"use client";

import { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/ui/metric-card";
import {
  FileText,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Trophy,
  UserPlus,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Agent Performance Interface - matches API response structure
interface AgentPerformance {
  agentId: string;
  username: string;
  displayName: string | null;
  status: string;
  tier: "platinum" | "gold" | "silver" | "bronze" | "inactive";
  performanceScore: number;
  rank: number;
  players: {
    total: number;
    active: number;
    newInPeriod: number;
    retained: number;
    retentionRate: number;
  };
  financials: {
    totalAdjustments: number;
    adjustmentsCount: number;
    deposits: number;
    withdrawals: number;
    corrections: number;
    grossRevenue: number;
    commission: number;
    commissionRate: number;
  };
  playerMetrics: {
    totalBalance: number;
    totalWagered: number;
    totalWinnings: number;
    totalBets: number;
    avgPlayerValue: number;
    avgPlayerWagered: number;
  };
  activity: {
    lastLogin: string | null;
    daysSinceActivity: number;
    dailyAdjustmentUsage: number;
    dailyAdjustmentLimit: number;
    usagePercentage: number;
  };
  limits: {
    maxSingleAdjustment: number;
    dailyAdjustmentLimit: number;
    canSuspendPlayers: boolean;
  };
  createdAt: string;
}

interface PlayerReportData {
  totalPlayers: number;
  activePlayers: number;
  totalBetsPlaced: number;
  avgBetAmount: number;
  engagementRate: number;
  avgBetsPerPlayer: number;
}

interface SystemReportData {
  uptime: number;
  avgResponseTime: number;
  apiCalls: number;
  recentApiCalls: number;
  errorRate: number;
  totalAgents: number;
  totalPlayers: number;
}

interface FinancialReportData {
  totalRevenue: number;
  totalPayouts: number;
  netProfit: number;
  totalWagered: number;
  totalBets: number;
  totalAgents: number;
  totalPlayers: number;
  revenueGrowth: number;
  payoutsGrowth: number;
  profitGrowth: number;
}

export default function ReportsPage() {
  // Set default date range: last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<"financial" | "agents" | "players" | "system">("financial");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Agent analytics state
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [agentPeriod, setAgentPeriod] = useState(30);

  // Players report state
  const [playerReport, setPlayerReport] = useState<PlayerReportData | null>(null);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);

  // System report state
  const [systemReport, setSystemReport] = useState<SystemReportData | null>(null);
  const [isLoadingSystem, setIsLoadingSystem] = useState(false);

  // Financial report state
  const [financialReport, setFinancialReport] = useState<FinancialReportData | null>(null);
  const [isLoadingFinancial, setIsLoadingFinancial] = useState(false);

  // Fetch agent performance data
  const fetchAgentPerformance = async () => {
    setIsLoadingAgents(true);
    try {
      const response = await fetch(`/api/admin/agent-performance?period=${agentPeriod}`);
      if (!response.ok) throw new Error("Failed to fetch agent performance");
      const data = await response.json();
      setAgentPerformance(data.agents || []);
    } catch (error) {
      toast.error("Failed to load agent analytics");
      console.error(error);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  // Fetch player report data
  const fetchPlayerReport = async () => {
    setIsLoadingPlayers(true);
    try {
      const response = await fetch("/api/admin/reports?type=players");
      if (!response.ok) throw new Error("Failed to fetch player report");
      const result = await response.json();
      
      // Calculate derived metrics
      const engagementRate = result.data.totalPlayers > 0 
        ? (result.data.activePlayers / result.data.totalPlayers) * 100 
        : 0;
      const avgBetsPerPlayer = result.data.totalPlayers > 0
        ? Math.round(result.data.totalBetsPlaced / result.data.totalPlayers)
        : 0;

      setPlayerReport({
        ...result.data,
        engagementRate,
        avgBetsPerPlayer,
      });
    } catch (error) {
      toast.error("Failed to load player report");
      console.error(error);
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  // Fetch system report data
  const fetchSystemReport = async () => {
    setIsLoadingSystem(true);
    try {
      const response = await fetch("/api/admin/reports?type=system");
      if (!response.ok) throw new Error("Failed to fetch system report");
      const result = await response.json();
      setSystemReport(result.data);
    } catch (error) {
      toast.error("Failed to load system report");
      console.error(error);
    } finally {
      setIsLoadingSystem(false);
    }
  };

  // Fetch financial report data
  const fetchFinancialReport = async () => {
    setIsLoadingFinancial(true);
    try {
      const response = await fetch("/api/admin/reports?type=financial");
      if (!response.ok) throw new Error("Failed to fetch financial report");
      const result = await response.json();
      setFinancialReport(result.data);
    } catch (error) {
      toast.error("Failed to load financial report");
      console.error(error);
    } finally {
      setIsLoadingFinancial(false);
    }
  };

  useEffect(() => {
    if (reportType === "agents") {
      fetchAgentPerformance();
    } else if (reportType === "players") {
      fetchPlayerReport();
    } else if (reportType === "system") {
      fetchSystemReport();
    } else if (reportType === "financial") {
      fetchFinancialReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, agentPeriod]);

  const getTierColor = (tier: string) => {
    const lowerTier = tier.toLowerCase();
    switch (lowerTier) {
      case "platinum": return "text-purple-500 bg-purple-500/10 border-purple-500/20";
      case "gold": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "silver": return "text-gray-400 bg-gray-400/10 border-gray-400/20";
      case "bronze": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      default: return "text-gray-500 bg-gray-500/10 border-gray-500/20";
    }
  };

  const getTierIcon = (tier: string) => {
    const lowerTier = tier.toLowerCase();
    switch (lowerTier) {
      case "platinum":
      case "gold":
        return <Trophy size={14} />;
      case "silver":
        return <Target size={14} />;
      default:
        return <AlertTriangle size={14} />;
    }
  };

  const reportTypes = [
    { id: "financial" as const, label: "Financial", icon: DollarSign, color: "text-accent" },
    { id: "agents" as const, label: "Agents", icon: Users, color: "text-emerald-600" },
    { id: "players" as const, label: "Players", icon: Activity, color: "text-accent" },
    { id: "system" as const, label: "System", icon: TrendingUp, color: "text-foreground" },
  ];

  const handleExportReport = async (format: "csv" | "pdf") => {
    if (!dateFrom || !dateTo) {
      toast.error("Please select date range first");
      return;
    }
    
    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          dateFrom,
          dateTo,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const _data = await response.json();
      toast.success(`Report generated successfully! Downloading ${format.toUpperCase()}...`);
      
      // In a real implementation, you'd download the file here
      // window.open(_data.downloadUrl, '_blank');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export report");
    }
  };

  const handleGenerateReport = async () => {
    if (!dateFrom || !dateTo) {
      toast.error("Please select date range");
      return;
    }
    setIsGenerating(true);
    toast.success("Generating report...");
    
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
      toast.success("Report generated successfully!");
    }, 1500);
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-3 w-full">
        {/* Header with Compact Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate and export comprehensive platform reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportReport("csv")}
              className="gap-1.5 h-8 text-xs touch-action-manipulation active:scale-95"
            >
              <Download size={13} />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportReport("pdf")}
              className="gap-1.5 h-8 text-xs touch-action-manipulation active:scale-95"
            >
              <Download size={13} />
              PDF
            </Button>
          </div>
        </div>

        {/* Compact Filter Bar */}
        <Card className="p-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Report Type Tabs - Horizontal Scroll */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-accent/40 scrollbar-track-transparent scroll-smooth pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
              <Filter size={14} className="text-muted-foreground mr-1 shrink-0" />
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setReportType(type.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all touch-action-manipulation active:scale-95 shrink-0 whitespace-nowrap",
                      reportType === type.id
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <Icon size={13} className={reportType === type.id ? type.color : ""} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Date Range - Compact */}
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 min-w-0">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-xs h-8"
                  placeholder="From"
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">to</span>
              <div className="flex-1 min-w-0">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-xs h-8"
                  placeholder="To"
                />
              </div>
              <Button
                onClick={handleGenerateReport}
                size="sm"
                disabled={isGenerating}
                className="bg-accent hover:bg-accent/90 gap-1.5 h-8 text-xs touch-action-manipulation active:scale-95 shrink-0"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span className="hidden sm:inline">Generating</span>
                  </>
                ) : (
                  <>
                    <FileText size={13} />
                    <span className="hidden sm:inline">Generate</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>        {/* Report Preview - Sleek Horizontal Cards */}
        <Card className="p-3">
          {/* Financial Report */}
          {reportType === "financial" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-accent" />
                <h3 className="text-sm font-semibold text-foreground">Financial Overview</h3>
              </div>
              {isLoadingFinancial ? (
                <div className="text-center py-8">
                  <RefreshCw className="mx-auto animate-spin text-muted-foreground mb-2" size={28} />
                  <p className="text-xs text-muted-foreground">Loading financial data...</p>
                </div>
              ) : financialReport ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <MetricCard
                    icon={TrendingUp}
                    label="Total Revenue"
                    value={`$${financialReport.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    iconColor="text-emerald-600"
                    bgColor="bg-emerald-500/10"
                    trend="up"
                  />
                  <MetricCard
                    icon={TrendingDown}
                    label="Total Payouts"
                    value={`$${financialReport.totalPayouts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    iconColor="text-red-600"
                    bgColor="bg-red-500/10"
                    trend="down"
                  />
                  <MetricCard
                    icon={DollarSign}
                    label="Net Profit"
                    value={`$${financialReport.netProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    iconColor="text-accent"
                    bgColor="bg-accent/10"
                    trend={financialReport.profitGrowth > 0 ? "up" : "down"}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto text-muted-foreground/50 mb-2" size={28} />
                  <p className="text-xs text-muted-foreground">No financial data available</p>
                </div>
              )}
            </div>
          )}

          {/* Agents Report - Comprehensive Analytics */}
          {reportType === "agents" && (
            <div className="space-y-3">
              {/* Header with Period Selector */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Agent Performance Analytics</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-muted-foreground" />
                  <select
                    value={agentPeriod}
                    onChange={(e) => setAgentPeriod(Number(e.target.value))}
                    className="text-xs bg-muted border border-border rounded px-2 py-1 h-7"
                  >
                    <option value={7}>Last 7 Days</option>
                    <option value={30}>Last 30 Days</option>
                    <option value={90}>Last 90 Days</option>
                    <option value={365}>Last Year</option>
                  </select>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <MetricCard
                  icon={Users}
                  label="Total Agents"
                  value={agentPerformance.length}
                  iconColor="text-accent"
                  bgColor="bg-accent/10"
                />
                <MetricCard
                  icon={CheckCircle}
                  label="Active Agents"
                  value={agentPerformance.filter(a => a.tier !== "inactive").length}
                  iconColor="text-emerald-600"
                  bgColor="bg-emerald-500/10"
                  trend="live"
                />
                <MetricCard
                  icon={Users}
                  label="Total Players"
                  value={agentPerformance.reduce((sum, a) => sum + a.players.total, 0)}
                  iconColor="text-accent"
                  bgColor="bg-accent/10"
                />
                <MetricCard
                  icon={Activity}
                  label="Avg Performance"
                  value={agentPerformance.length > 0
                    ? Math.round(agentPerformance.reduce((sum, a) => sum + a.performanceScore, 0) / agentPerformance.length)
                    : 0}
                  iconColor="text-foreground"
                  bgColor="bg-foreground/5"
                />
              </div>

              {/* Loading State */}
              {isLoadingAgents ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : agentPerformance.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={40} className="mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">No agent data available</p>
                </div>
              ) : (
                /* Agent List with Expandable Details */
                <div className="space-y-2">
                  {agentPerformance.map((agent) => (
                    <Card key={agent.agentId} className="overflow-hidden">
                      {/* Collapsed View - Summary Row */}
                      <button
                        onClick={() => setExpandedAgent(expandedAgent === agent.agentId ? null : agent.agentId)}
                        className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {/* Expand Icon */}
                          {expandedAgent === agent.agentId ? (
                            <ChevronDown size={18} className="text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                          )}

                          {/* Agent Name & Tier */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground text-sm truncate">{agent.displayName || agent.username}</p>
                              <p className="text-xs text-muted-foreground truncate">@{agent.username}</p>
                            </div>
                            <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md border shrink-0", getTierColor(agent.tier))}>
                              {getTierIcon(agent.tier)}
                              <span className="text-xs font-semibold capitalize">{agent.tier}</span>
                            </div>
                          </div>

                          {/* Key Metrics - Horizontal Layout */}
                          <div className="hidden md:flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Score</p>
                              <p className="text-sm font-bold text-foreground">{Math.round(agent.performanceScore)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Players</p>
                              <p className="text-sm font-bold text-accent">{agent.players.total}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Active</p>
                              <p className="text-sm font-bold text-emerald-600">{agent.players.active}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Commission</p>
                              <p className="text-sm font-bold text-accent">
                                ${agent.financials.commission.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded View - Comprehensive Details */}
                      {expandedAgent === agent.agentId && (
                        <div className="border-t border-border bg-muted/20 p-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Player Metrics */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                <Users size={14} />
                                Player Metrics
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 rounded bg-background">
                                  <span className="text-xs text-muted-foreground">Total Players</span>
                                  <span className="text-sm font-semibold text-foreground">{agent.players.total}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-background">
                                  <span className="text-xs text-muted-foreground">Active Players</span>
                                  <span className="text-sm font-semibold text-emerald-600">{agent.players.active}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-background">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <UserPlus size={12} />
                                    New This Period
                                  </span>
                                  <span className="text-sm font-semibold text-accent">{agent.players.newInPeriod}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-background">
                                  <span className="text-xs text-muted-foreground">Avg Balance</span>
                                  <span className="text-sm font-semibold text-foreground">
                                    ${agent.playerMetrics.avgPlayerValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Performance Scores */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                <Target size={14} />
                                Performance Scores
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 rounded bg-background">
                                  <span className="text-xs text-muted-foreground">Overall Score</span>
                                  <span className="text-sm font-semibold text-accent">{Math.round(agent.performanceScore)}/100</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-background">
                                  <span className="text-xs text-muted-foreground">Retention Rate</span>
                                  <span className="text-sm font-semibold text-emerald-600">{agent.players.retentionRate.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-background">
                                  <span className="text-xs text-muted-foreground">Total Wagered</span>
                                  <span className="text-sm font-semibold text-accent">
                                    ${agent.playerMetrics.totalWagered.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-background">
                                  <span className="text-xs text-muted-foreground">Gross Revenue</span>
                                  <span className="text-sm font-semibold text-emerald-600">
                                    ${agent.financials.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Financial Activity */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                <DollarSign size={14} />
                                Financial Activity
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 rounded bg-background">
                                  <span className="text-xs text-muted-foreground">Total Adjustments</span>
                                  <span className="text-sm font-semibold text-foreground">{agent.financials.adjustmentsCount}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-background">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <TrendingUp size={12} className="text-emerald-600" />
                                    Deposits
                                  </span>
                                  <span className="text-sm font-semibold text-emerald-600">
                                    ${agent.financials.deposits.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-background">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <TrendingDown size={12} className="text-red-600" />
                                    Withdrawals
                                  </span>
                                  <span className="text-sm font-semibold text-red-600">
                                    ${agent.financials.withdrawals.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded bg-background">
                                  <span className="text-xs text-muted-foreground">Total Commission</span>
                                  <span className="text-sm font-semibold text-accent">
                                    ${agent.financials.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Status Indicators */}
                          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <CheckCircle size={14} className="text-emerald-500" />
                                <span className="text-muted-foreground">Registered:</span>
                                <span className="font-medium text-foreground">
                                  {new Date(agent.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              {agent.activity.lastLogin && (
                              <div className="flex items-center gap-1">
                                <Activity size={14} className="text-accent" />
                                <span className="text-muted-foreground">Last Active:</span>
                                <span className="font-medium text-foreground">
                                  {new Date(agent.activity.lastLogin).toLocaleDateString()}
                                </span>
                              </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar size={14} className="text-muted-foreground" />
                                <span className="text-muted-foreground">Days Since Active:</span>
                                <span className="font-medium text-foreground">
                                  {agent.activity.daysSinceActivity}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground">Commission Rate:</span>
                              <span className="font-semibold text-foreground">{agent.financials.commissionRate}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Players Report */}
          {reportType === "players" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-accent" />
                <h3 className="text-sm font-semibold text-foreground">Player Activity</h3>
              </div>
              {isLoadingPlayers ? (
                <div className="text-center py-8">
                  <RefreshCw className="mx-auto animate-spin text-muted-foreground mb-2" size={28} />
                  <p className="text-xs text-muted-foreground">Loading player data...</p>
                </div>
              ) : playerReport ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <MetricCard
                    icon={Users}
                    label="Total Players"
                    value={playerReport.totalPlayers.toLocaleString()}
                    iconColor="text-accent"
                    bgColor="bg-accent/10"
                  />
                  <MetricCard
                    icon={CheckCircle}
                    label="Active Players"
                    value={playerReport.activePlayers.toLocaleString()}
                    iconColor="text-emerald-600"
                    bgColor="bg-emerald-500/10"
                    trend="live"
                  />
                  <MetricCard
                    icon={Activity}
                    label="Total Bets Placed"
                    value={playerReport.totalBetsPlaced.toLocaleString()}
                    iconColor="text-accent"
                    bgColor="bg-accent/10"
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto text-muted-foreground/50 mb-2" size={28} />
                  <p className="text-xs text-muted-foreground">No player data available</p>
                </div>
              )}
            </div>
          )}

          {/* System Report */}
          {reportType === "system" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">System Health</h3>
              </div>
              {isLoadingSystem ? (
                <div className="text-center py-8">
                  <RefreshCw className="mx-auto animate-spin text-muted-foreground mb-2" size={28} />
                  <p className="text-xs text-muted-foreground">Loading system metrics...</p>
                </div>
              ) : systemReport ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <MetricCard
                    icon={CheckCircle}
                    label="System Uptime"
                    value={`${systemReport.uptime.toFixed(2)}%`}
                    iconColor="text-emerald-600"
                    bgColor="bg-emerald-500/10"
                    trend="up"
                  />
                  <MetricCard
                    icon={Activity}
                    label="Avg Response Time"
                    value={`${systemReport.avgResponseTime}ms`}
                    iconColor="text-accent"
                    bgColor="bg-accent/10"
                  />
                  <MetricCard
                    icon={TrendingUp}
                    label="API Calls"
                    value={systemReport.apiCalls >= 1000000 
                      ? `${(systemReport.apiCalls / 1000000).toFixed(1)}M` 
                      : systemReport.apiCalls >= 1000 
                      ? `${(systemReport.apiCalls / 1000).toFixed(1)}K`
                      : systemReport.apiCalls.toLocaleString()
                    }
                    iconColor="text-foreground"
                    bgColor="bg-foreground/5"
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto text-muted-foreground/50 mb-2" size={28} />
                  <p className="text-xs text-muted-foreground">No system data available</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Quick Actions & Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-3">
            <h3 className="text-sm font-semibold mb-2">Report History</h3>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-accent" />
                  <div>
                    <p className="text-xs font-medium">Financial Report</p>
                    <p className="text-xs text-muted-foreground">Jan 1 - Jan 31, 2025</p>
                  </div>
                </div>
                <Download size={13} className="text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-emerald-600" />
                  <div>
                    <p className="text-xs font-medium">Agents Report</p>
                    <p className="text-xs text-muted-foreground">Dec 1 - Dec 31, 2024</p>
                  </div>
                </div>
                <Download size={13} className="text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-accent" />
                  <div>
                    <p className="text-xs font-medium">Players Report</p>
                    <p className="text-xs text-muted-foreground">Nov 1 - Nov 30, 2024</p>
                  </div>
                </div>
                <Download size={13} className="text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <h3 className="text-sm font-semibold mb-2">Export Options</h3>
            <div className="space-y-2">
              <div className="p-2.5 rounded bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Download size={13} className="text-emerald-600" />
                  <p className="text-xs font-medium">CSV Export</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Download report data in comma-separated format for spreadsheet analysis
                </p>
              </div>
              <div className="p-2.5 rounded bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Download size={13} className="text-red-600" />
                  <p className="text-xs font-medium">PDF Export</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Generate professionally formatted PDF report for presentations and records
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
