"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Users, 
  CurrencyDollar, 
  ChartBar, 
  UserPlus,
  ArrowsClockwise
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui";

// Types for the API response
interface AgentUser {
  id: string;
  username: string;
  name: string | null;
  balance: number;
  lastBalanceUpdate: string | null;
  createdAt: string;
  lastLogin: string | null;
  isActive: boolean;
}

interface AgentUsersResponse {
  users: AgentUser[];
  summary: {
    totalUsers: number;
    totalBalance: number;
    activeUsers: number;
  };
}

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
  const [agentUsers, setAgentUsers] = useState<AgentUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSummary, setUsersSummary] = useState({
    totalUsers: 0,
    totalBalance: 0,
    activeUsers: 0,
  });

  // Fetch agent users
  const fetchAgentUsers = useCallback(async () => {
    if (!session?.user?.isAgent && !session?.user?.isAdmin) return;
    
    setUsersLoading(true);
    try {
      const response = await fetch('/api/agent/users');
      if (response.ok) {
        const result = await response.json();
        const data: AgentUsersResponse = result.data;
        setAgentUsers(data.users);
        setUsersSummary(data.summary);
      } else {
        console.error('Failed to fetch agent users');
      }
    } catch (error) {
      console.error('Error fetching agent users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [session?.user?.isAgent, session?.user?.isAdmin]);

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

  // Fetch users when component mounts and user is authenticated
  useEffect(() => {
    if (!isLoading && session?.user && (session.user.isAgent || session.user.isAdmin)) {
      fetchAgentUsers();
    }
  }, [isLoading, session, fetchAgentUsers]);

  if (isLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-foreground">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      {/* Header - Using app's accent color instead of hardcoded blue */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border-b border-border p-6"
      >
        <h1 className="text-2xl font-bold text-foreground mb-4">Agent Dashboard</h1>

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
              className="h-auto py-2.5 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => router.push("/agent/register-player")}
            >
              <UserPlus size={20} weight="bold" />
              <span className="text-sm font-medium">Register Player</span>
            </Button>

            <Button 
              className="h-auto py-2.5 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => router.push("/agent/adjust-balance")}
            >
              <CurrencyDollar size={20} weight="bold" />
              <span className="text-sm font-medium">Adjust Balance</span>
            </Button>
          </div>
        </motion.div>

        {/* Agent Users List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Your Players</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={fetchAgentUsers}
              disabled={usersLoading}
            >
              <ArrowsClockwise 
                size={16} 
                className={usersLoading ? "animate-spin" : ""}
              />
            </Button>
          </div>

          {/* Users List or Empty State */}
          {usersLoading && agentUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading players...</p>
            </div>
          ) : agentUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Users size={32} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No players registered</p>
              <p className="text-xs text-muted-foreground mt-1">Start by registering your first player</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-accent/5 border border-accent/10 rounded-lg">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Total Players</div>
                  <div className="text-lg font-bold text-foreground">{usersSummary.totalUsers}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Total Balance</div>
                  <div className="text-lg font-bold text-accent">${usersSummary.totalBalance.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Active (7d)</div>
                  <div className="text-lg font-bold text-foreground">{usersSummary.activeUsers}</div>
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {agentUsers.map((user) => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:border-accent/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.name || user.username}
                        </p>
                        {user.lastLogin && new Date().getTime() - new Date(user.lastLogin).getTime() < 7 * 24 * 60 * 60 * 1000 && (
                          <Badge variant="secondary" className="text-xs py-0 px-1.5">Active</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-bold text-accent">${user.balance.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Balance</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
