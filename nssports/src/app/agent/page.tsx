"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Users, 
  CurrencyDollar, 
  ChartBar, 
  UserPlus,
  Eye,
  ArrowsClockwise,
  CheckCircle
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui";

/**
 * Agent Dashboard - Mobile-First Design
 * 
 * Features:
 * - Player management
 * - Balance adjustments  
 * - Performance metrics
 * - Activity monitoring
 */

export default function AgentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Redirect non-agents
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user) {
      router.push("/auth/login?callbackUrl=/agent");
      return;
    }

    if (!session.user.isAgent && !session.user.isAdmin) {
      router.push("/");
      return;
    }

    setIsLoading(false);
  }, [session, status, router]);

  if (isLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-foreground">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header - Using app's accent color instead of hardcoded blue */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border-b border-border p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agent Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome, {session?.user?.username}</p>
          </div>
          <Badge className="bg-accent/10 text-accent border-accent/20 font-semibold">
            {session?.user?.userType === 'client_admin' ? 'ADMIN' : 'AGENT'}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-accent/5 border border-accent/10 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Users size={20} weight="bold" className="text-accent" />
              <span className="text-xs font-medium text-muted-foreground">Total Players</span>
            </div>
            <div className="text-2xl font-bold text-foreground">0</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-accent/5 border border-accent/10 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <ChartBar size={20} weight="bold" className="text-accent" />
              <span className="text-xs font-medium text-muted-foreground">Active Today</span>
            </div>
            <div className="text-2xl font-bold text-foreground">0</div>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              className="h-auto py-4 flex flex-col items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => router.push("/agent/register-player")}
            >
              <UserPlus size={24} weight="bold" />
              <span className="text-sm font-medium">Register Player</span>
            </Button>

            <Button 
              className="h-auto py-4 flex flex-col items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => router.push("/agent/adjust-balance")}
            >
              <CurrencyDollar size={24} weight="bold" />
              <span className="text-sm font-medium">Adjust Balance</span>
            </Button>

            <Button 
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => router.push("/agent/players")}
            >
              <Eye size={24} weight="bold" />
              <span className="text-sm font-medium">View Players</span>
            </Button>

            <Button 
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => router.push("/agent/reports")}
            >
              <ChartBar size={24} weight="bold" />
              <span className="text-sm font-medium">Reports</span>
            </Button>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <Button variant="ghost" size="sm">
              <ArrowsClockwise size={16} />
            </Button>
          </div>

          {/* Empty State */}
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Users size={32} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">Start by registering your first player</p>
          </div>
        </motion.div>

        {/* Daily Limits */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Daily Limits</h2>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Balance Adjustments</span>
                <span className="font-medium text-foreground">$0 / $5,000</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: "0%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Max Single Adjustment</span>
                <span className="font-medium text-foreground">$1,000</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-accent">
                <CheckCircle size={14} weight="fill" />
                <span>Within limits</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-accent/10 border border-accent/30 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle size={20} weight="fill" className="text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">All Systems Operational</h3>
              <p className="text-sm text-muted-foreground">
                Your account is active and ready to manage players
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
