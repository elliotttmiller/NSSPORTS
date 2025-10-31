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
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
            <p className="text-muted-foreground mt-1">
              Real-time platform performance and activity
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={16} />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Platform Activity Metrics */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Platform Activity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={Users}
              label="Total Active Players"
              value={metrics?.platformActivity.totalActivePlayers.toLocaleString() || "0"}
              iconColor="text-blue-600"
              bgColor="bg-blue-500/10"
            />
            <MetricCard
              icon={UserCheck}
              label="Online Players Now"
              value={metrics?.platformActivity.onlinePlayersNow.toLocaleString() || "0"}
              iconColor="text-green-600"
              bgColor="bg-green-500/10"
              trend="live"
            />
            <MetricCard
              icon={Activity}
              label="Active Bets"
              value={metrics?.platformActivity.activeBets.toLocaleString() || "0"}
              iconColor="text-purple-600"
              bgColor="bg-purple-500/10"
            />
            <MetricCard
              icon={DollarSign}
              label="Today's GGR"
              value={`$${metrics?.platformActivity.todayGGR.toLocaleString() || "0"}`}
              iconColor="text-emerald-600"
              bgColor="bg-emerald-500/10"
              trend="up"
            />
          </div>
        </div>

        {/* Agent Performance */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Agent Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={UserCheck}
              label="Total Agents"
              value={metrics?.agentPerformance.totalAgents.toString() || "0"}
              iconColor="text-indigo-600"
              bgColor="bg-indigo-500/10"
            />
            <MetricCard
              icon={Activity}
              label="Active Agents Today"
              value={metrics?.agentPerformance.activeAgentsToday.toString() || "0"}
              iconColor="text-cyan-600"
              bgColor="bg-cyan-500/10"
            />
            <MetricCard
              icon={Users}
              label="New Players (Today)"
              value={metrics?.agentPerformance.newPlayersToday.toString() || "0"}
              iconColor="text-orange-600"
              bgColor="bg-orange-500/10"
              trend="up"
            />
            <MetricCard
              icon={TrendingUp}
              label="Agent Activity Score"
              value={`${metrics?.agentPerformance.agentActivityScore || 0}%`}
              iconColor="text-teal-600"
              bgColor="bg-teal-500/10"
            />
          </div>
        </div>

        {/* Financial Summary */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Financial Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={DollarSign}
              label="Total Balance"
              value={`$${metrics?.financialSummary.totalBalance.toLocaleString() || "0"}`}
              iconColor="text-blue-600"
              bgColor="bg-blue-500/10"
            />
            <MetricCard
              icon={TrendingUp}
              label="Today's Deposits"
              value={`$${metrics?.financialSummary.todayDeposits.toLocaleString() || "0"}`}
              iconColor="text-green-600"
              bgColor="bg-green-500/10"
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
          </div>
        </div>

        {/* System Health & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <div className="lg:col-span-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              System Health
            </h2>
            <Card className="p-6 space-y-4">
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
            </Card>
          </div>

          {/* Recent Activity Feed */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Recent Activity Feed
            </h2>
            <Card className="p-6">
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <ActivityFeedItem key={activity.id} activity={activity} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
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

// Metric Card Component
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
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", bgColor)}>
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trend === "up" && "bg-green-500/10 text-green-600",
            trend === "down" && "bg-red-500/10 text-red-600",
            trend === "live" && "bg-blue-500/10 text-blue-600 animate-pulse"
          )}>
            {trend === "up" && <TrendingUp size={12} />}
            {trend === "down" && <TrendingDown size={12} />}
            {trend === "live" && <Activity size={12} />}
            {trend === "live" && "LIVE"}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

// System Health Item
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
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          status === "good" && "bg-green-500",
          status === "warning" && "bg-yellow-500",
          status === "error" && "bg-red-500"
        )} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

// Activity Feed Item
function ActivityFeedItem({ activity }: { activity: ActivityItem }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground mt-0.5 min-w-[50px]">
        {activity.time}
      </span>
      <div className="flex-1">
        <p className="text-sm text-foreground">{activity.message}</p>
      </div>
    </div>
  );
}
