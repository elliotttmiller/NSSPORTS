"use client";

import { useEffect, useState } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { 
  Users, 
  UserCheck, 
  Activity, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardMetrics {
  platformActivity: {
    totalActivePlayers: number;
    onlinePlayersNow: number;
    activeBets: number;
    todayGGR: number;
  };
  agentPerformance: {
    totalAgents: number;
    activeAgentsToday: number;
    newPlayersToday: number;
    agentActivityScore: number;
  };
  financialSummary: {
    totalBalance: number;
    todayDeposits: number;
    todayWithdrawals: number;
    netMovement: number;
  };
  systemHealth: {
    platformUptime: number;
    apiResponseTime: number;
    activeSessions: number;
    systemLoad: number;
  };
}

interface ActivityItem {
  id: string;
  time: string;
  type: "agent" | "player" | "system" | "bet";
  message: string;
  icon: string;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, activityRes] = await Promise.all([
        fetch("/api/admin/dashboard/metrics"),
        fetch("/api/admin/dashboard/activity"),
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivities(activityData.activities || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-4 w-full max-w-7xl mx-auto">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <Clock size={14} />
              <span className="hidden sm:inline">Last updated:</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Real-time platform performance and activity
          </p>
        </div>

        {/* Platform Activity Metrics */}
        <div>
          <h2 className="text-[10px] sm:text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-1.5 sm:mb-2">
            Platform Activity
          </h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <MetricCard
              icon={Users}
              label="Total Active Players"
              value={metrics?.platformActivity.totalActivePlayers.toLocaleString() || "0"}
              iconColor="text-blue-500"
              bgColor="bg-blue-500/10"
            />
            <MetricCard
              icon={UserCheck}
              label="Online Players Now"
              value={metrics?.platformActivity.onlinePlayersNow.toLocaleString() || "0"}
              iconColor="text-green-500"
              bgColor="bg-green-500/10"
              trend="live"
            />
            <MetricCard
              icon={Activity}
              label="Active Bets"
              value={metrics?.platformActivity.activeBets.toLocaleString() || "0"}
              iconColor="text-purple-500"
              bgColor="bg-purple-500/10"
            />
            <MetricCard
              icon={DollarSign}
              label="Today's GGR"
              value={`$${metrics?.platformActivity.todayGGR.toLocaleString() || "0"}`}
              iconColor="text-emerald-500"
              bgColor="bg-emerald-500/10"
              trend="up"
            />
          </div>
        </div>

        {/* Agent Performance */}
        <div>
          <h2 className="text-[10px] sm:text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-1.5 sm:mb-2">
            Agent Performance
          </h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <MetricCard
              icon={UserCheck}
              label="Total Agents"
              value={metrics?.agentPerformance.totalAgents.toString() || "0"}
              iconColor="text-indigo-500"
              bgColor="bg-indigo-500/10"
            />
            <MetricCard
              icon={Activity}
              label="Active Agents Today"
              value={metrics?.agentPerformance.activeAgentsToday.toString() || "0"}
              iconColor="text-cyan-500"
              bgColor="bg-cyan-500/10"
            />
            <MetricCard
              icon={Users}
              label="New Players (Today)"
              value={metrics?.agentPerformance.newPlayersToday.toString() || "0"}
              iconColor="text-orange-500"
              bgColor="bg-orange-500/10"
              trend="up"
            />
            <MetricCard
              icon={TrendingUp}
              label="Agent Activity Score"
              value={`${metrics?.agentPerformance.agentActivityScore || 0}%`}
              iconColor="text-teal-500"
              bgColor="bg-teal-500/10"
            />
          </div>
        </div>

        {/* Financial Summary */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-2">
            Financial Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              icon={DollarSign}
              label="Total Balance"
              value={`$${metrics?.financialSummary.totalBalance.toLocaleString() || "0"}`}
              iconColor="text-blue-500"
              bgColor="bg-blue-500/10"
            />
            <MetricCard
              icon={TrendingUp}
              label="Today's Deposits"
              value={`$${metrics?.financialSummary.todayDeposits.toLocaleString() || "0"}`}
              iconColor="text-green-500"
              bgColor="bg-green-500/10"
            />
            <MetricCard
              icon={TrendingDown}
              label="Today's Withdrawals"
              value={`$${metrics?.financialSummary.todayWithdrawals.toLocaleString() || "0"}`}
              iconColor="text-red-500"
              bgColor="bg-red-500/10"
            />
            <MetricCard
              icon={Activity}
              label="Net Movement"
              value={`$${metrics?.financialSummary.netMovement.toLocaleString() || "0"}`}
              iconColor={metrics && metrics.financialSummary.netMovement >= 0 ? "text-emerald-500" : "text-red-500"}
              bgColor={metrics && metrics.financialSummary.netMovement >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
              trend={metrics && metrics.financialSummary.netMovement >= 0 ? "up" : "down"}
            />
          </div>
        </div>

        {/* System Health & Activity Feed - PWA Mobile Optimized */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* System Health - Compact Horizontal */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-2">
              System Health
            </h2>
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <SystemHealthItem
                  label="Platform Uptime"
                  value={`${metrics?.systemHealth.platformUptime.toFixed(2) || "0"}%`}
                  status="good"
                />
                <SystemHealthItem
                  label="API Response Time"
                  value={`${metrics?.systemHealth.apiResponseTime || "0"}ms`}
                  status={metrics && metrics.systemHealth.apiResponseTime < 100 ? "good" : "warning"}
                />
                <SystemHealthItem
                  label="Active Sessions"
                  value={metrics?.systemHealth.activeSessions.toString() || "0"}
                  status="good"
                />
                <SystemHealthItem
                  label="System Load"
                  value={`${metrics?.systemHealth.systemLoad || "0"}%`}
                  status={metrics && metrics.systemHealth.systemLoad < 70 ? "good" : "warning"}
                />
              </div>
            </Card>
          </div>

          {/* Recent Activity Feed - Compact */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-2">
              Recent Activity Feed
            </h2>
            <Card className="p-4">
              <div className="space-y-2 max-h-[200px] overflow-y-auto virtual-scrollbar seamless-scroll" data-mobile-scroll>
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <ActivityFeedItem key={activity.id} activity={activity} />
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground/60">
                    <Activity className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No recent activity</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}

// Metric Card Component - PWA Mobile Optimized
function MetricCard({
  icon: Icon,
  label,
  value,
  iconColor,
  bgColor,
  trend,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  iconColor: string;
  bgColor: string;
  trend?: "up" | "down" | "live";
}) {
  return (
    <Card className="p-3 hover:shadow-md transition-all duration-200 border-border/50 touch-action-manipulation active:scale-98">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", bgColor)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-foreground truncate">{value}</p>
          <p className="text-xs text-muted-foreground/70 truncate">{label}</p>
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0",
            trend === "up" && "bg-green-500/10 text-green-500",
            trend === "down" && "bg-red-500/10 text-red-500",
            trend === "live" && "bg-blue-500/10 text-blue-500 animate-pulse"
          )}>
            {trend === "up" && <TrendingUp size={10} />}
            {trend === "down" && <TrendingDown size={10} />}
            {trend === "live" && <Activity size={10} />}
          </div>
        )}
      </div>
    </Card>
  );
}

// System Health Item - Compact Horizontal
function SystemHealthItem({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "good" | "warning" | "error";
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-card/50 border border-border/30">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          status === "good" && "bg-green-500",
          status === "warning" && "bg-yellow-500",
          status === "error" && "bg-red-500"
        )} />
        <span className="text-xs text-muted-foreground/70 truncate">{label}</span>
      </div>
      <span className="text-xs font-semibold text-foreground shrink-0 ml-2">{value}</span>
    </div>
  );
}

// Activity Feed Item - Compact
function ActivityFeedItem({ activity }: { activity: ActivityItem }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[10px] text-muted-foreground/60 mt-0.5 min-w-10 shrink-0">
        {activity.time}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground/90 truncate">{activity.message}</p>
      </div>
    </div>
  );
}
