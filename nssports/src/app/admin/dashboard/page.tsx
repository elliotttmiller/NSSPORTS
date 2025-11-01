"use client";

import { useEffect, useState } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { 
  MetricCard, 
  MetricCardSection, 
  SystemHealthItem 
} from "@/components/ui/metric-card";
import { 
  Users, 
  UserCheck, 
  Activity, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Clock
} from "lucide-react";

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
      <div className="space-y-3 w-full">
        {/* Header - Sleek & Compact */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Dashboard Overview</h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <Clock size={13} />
              <span className="hidden sm:inline">Last updated:</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Real-time platform performance and activity
          </p>
        </div>

        {/* Platform Activity Metrics */}
        <MetricCardSection title="Platform Activity">
          <MetricCard
            icon={Users}
            label="Total Active Players"
            value={metrics?.platformActivity.totalActivePlayers.toLocaleString() || "0"}
            iconColor="text-accent"
            bgColor="bg-accent/10"
          />
          <MetricCard
            icon={UserCheck}
            label="Online Players Now"
            value={metrics?.platformActivity.onlinePlayersNow.toLocaleString() || "0"}
            iconColor="text-emerald-500"
            bgColor="bg-emerald-500/10"
            trend="live"
          />
          <MetricCard
            icon={Activity}
            label="Active Bets"
            value={metrics?.platformActivity.activeBets.toLocaleString() || "0"}
            iconColor="text-accent"
            bgColor="bg-accent/10"
          />
          <MetricCard
            icon={DollarSign}
            label="Today's GGR"
            value={`$${metrics?.platformActivity.todayGGR.toLocaleString() || "0"}`}
            iconColor="text-emerald-600"
            bgColor="bg-emerald-500/10"
            trend="up"
          />
        </MetricCardSection>

        {/* Agent Performance */}
        <MetricCardSection title="Agent Performance">
          <MetricCard
            icon={UserCheck}
            label="Total Agents"
            value={metrics?.agentPerformance.totalAgents.toString() || "0"}
            iconColor="text-foreground"
            bgColor="bg-foreground/5"
          />
          <MetricCard
            icon={Activity}
            label="Active Agents Today"
            value={metrics?.agentPerformance.activeAgentsToday.toString() || "0"}
            iconColor="text-emerald-600"
            bgColor="bg-emerald-500/10"
          />
          <MetricCard
            icon={Users}
            label="New Players (Today)"
            value={metrics?.agentPerformance.newPlayersToday.toString() || "0"}
            iconColor="text-accent"
            bgColor="bg-accent/10"
            trend="up"
          />
          <MetricCard
            icon={TrendingUp}
            label="Agent Activity Score"
            value={`${metrics?.agentPerformance.agentActivityScore || 0}%`}
            iconColor="text-accent"
            bgColor="bg-accent/10"
          />
        </MetricCardSection>

        {/* Financial Summary */}
        <MetricCardSection title="Financial Summary">
          <MetricCard
            icon={DollarSign}
            label="Total Balance"
            value={`$${metrics?.financialSummary.totalBalance.toLocaleString() || "0"}`}
            iconColor="text-foreground"
            bgColor="bg-foreground/5"
          />
          <MetricCard
            icon={TrendingUp}
            label="Today's Deposits"
            value={`$${metrics?.financialSummary.todayDeposits.toLocaleString() || "0"}`}
            iconColor="text-emerald-600"
            bgColor="bg-emerald-500/10"
          />
          <MetricCard
            icon={TrendingDown}
            label="Today's Withdrawals"
            value={`$${metrics?.financialSummary.todayWithdrawals.toLocaleString() || "0"}`}
            iconColor="text-red-600"
            bgColor="bg-red-500/10"
          />
          <MetricCard
            icon={Activity}
            label="Net Movement"
            value={`$${metrics?.financialSummary.netMovement.toLocaleString() || "0"}`}
            iconColor={metrics && metrics.financialSummary.netMovement >= 0 ? "text-emerald-600" : "text-red-600"}
            bgColor={metrics && metrics.financialSummary.netMovement >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
            trend={metrics && metrics.financialSummary.netMovement >= 0 ? "up" : "down"}
          />
        </MetricCardSection>

        {/* System Health & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* System Health - Compact Horizontal */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-2">
              System Health
            </h2>
            <Card className="p-3">
              <div className="grid grid-cols-2 gap-2.5">
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

          {/* Recent Activity Feed - Sleek Compact */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-2">
              Recent Activity Feed
            </h2>
            <Card className="p-3">
              <div className="space-y-1 max-h-[200px] overflow-y-auto virtual-scrollbar seamless-scroll" data-mobile-scroll>
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <ActivityFeedItem key={activity.id} activity={activity} />
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground/60">
                    <Activity className="w-5 h-5 mx-auto mb-2 opacity-40" />
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

// Activity Feed Item - Sleek Compact
function ActivityFeedItem({ activity }: { activity: ActivityItem }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[10px] text-muted-foreground/60 mt-0.5 min-w-10 shrink-0">
        {activity.time}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground/90 truncate leading-relaxed">{activity.message}</p>
      </div>
    </div>
  );
}
