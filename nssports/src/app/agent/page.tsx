"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  CurrencyDollar,  
  UserPlus,
  ArrowsClockwise,
  CaretDown,
  CaretUp,
  ArrowDown,
  ArrowUp,
  Minus
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui";

// Types for the API response
interface AgentUser {
  id: string;
  username: string;
  name: string | null;
  balance: number;
  available: number;
  risk: number;
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

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string | null;
  createdAt: string;
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
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Record<string, Transaction[]>>({});
  const [loadingTransactions, setLoadingTransactions] = useState<Record<string, boolean>>({});

  // Fetch transactions for a specific user
  const fetchUserTransactions = useCallback(async (userId: string) => {
    setLoadingTransactions(prev => {
      // Prevent duplicate requests
      if (prev[userId]) return prev;
      return { ...prev, [userId]: true };
    });

    try {
      const response = await fetch(`/api/agent/users/${userId}/transactions?limit=5`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(prev => ({ ...prev, [userId]: data.transactions }));
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(prev => ({ ...prev, [userId]: false }));
    }
  }, []); // Empty deps - always fetches fresh data

  // Toggle player card expansion
  const toggleExpanded = useCallback((userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
      fetchUserTransactions(userId);
    }
  }, [expandedUserId, fetchUserTransactions]);

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
        
        // If a user is expanded, refresh their transactions too
        if (expandedUserId) {
          fetchUserTransactions(expandedUserId);
        }
      } else {
        console.error('Failed to fetch agent users');
      }
    } catch (error) {
      console.error('Error fetching agent users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [session?.user?.isAgent, session?.user?.isAdmin, expandedUserId, fetchUserTransactions]);

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
    <div className="bg-background min-h-screen" style={{ paddingTop: 'calc(4rem + 1rem)' }}>
      {/* Header - Mobile Optimized */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border-b border-border p-3 sm:p-4 sticky z-40 shadow-sm"
        style={{ top: 'calc(4rem + 0.5rem)' }}
      >
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Agent Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-1">Manage your players and balances</p>
      </motion.div>

      {/* Main Content - Responsive Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Quick Actions - Mobile Optimized */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-3 sm:p-4"
        >
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              className="h-auto py-3 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground touch-action-manipulation active:scale-95 transition-transform"
              onClick={() => router.push("/agent/register-player")}
            >
              <UserPlus size={20} weight="bold" />
              <span className="text-sm font-medium">Register Player</span>
            </Button>

            <Button 
              className="h-auto py-3 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground touch-action-manipulation active:scale-95 transition-transform"
              onClick={() => router.push("/agent/adjust-balance")}
            >
              <CurrencyDollar size={20} weight="bold" />
              <span className="text-sm font-medium">Adjust Balance</span>
            </Button>
          </div>
        </motion.div>

        {/* Agent Users List - Mobile Optimized */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-xl p-3 sm:p-4"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">Your Players</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={fetchAgentUsers}
              disabled={usersLoading}
              className="touch-action-manipulation active:scale-95"
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
                {agentUsers.map((user) => {
                  const isExpanded = expandedUserId === user.id;
                  const userTransactions = transactions[user.id] || [];
                  const isLoadingTxn = loadingTransactions[user.id];

                  return (
                    <div key={user.id} className="bg-background border border-border rounded-lg overflow-hidden">
                      {/* Player Header - Clickable */}
                      <button
                        onClick={() => toggleExpanded(user.id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex-1 min-w-0 text-left">
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
                        <div className="flex items-center gap-1.5 ml-2">
                          {/* Available */}
                          <div className="text-right min-w-[70px]">
                            <p className="text-xs font-bold text-accent leading-tight">${user.available.toFixed(2)}</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wide leading-tight mt-0.5">Available</p>
                          </div>
                          
                          {/* Divider */}
                          <div className="h-8 w-px bg-border mx-0.5"></div>
                          
                          {/* Risk */}
                          <div className="text-right min-w-[70px]">
                            <p className="text-xs font-bold text-destructive leading-tight">${user.risk.toFixed(2)}</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wide leading-tight mt-0.5">Risk</p>
                          </div>
                          
                          {/* Divider */}
                          <div className="h-8 w-px bg-border mx-0.5"></div>
                          
                          {/* Balance */}
                          <div className="text-right min-w-[70px]">
                            <p className="text-xs font-bold text-foreground leading-tight">${user.balance.toFixed(2)}</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wide leading-tight mt-0.5">Balance</p>
                          </div>
                          
                          {/* Expand/Collapse Icon */}
                          <div className="ml-2">
                            {isExpanded ? (
                              <CaretUp size={16} className="text-muted-foreground" />
                            ) : (
                              <CaretDown size={16} className="text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expanded Transactions Section */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-border"
                          >
                            <div className="p-3 bg-muted/20">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Recent Transactions</h4>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchUserTransactions(user.id);
                                  }}
                                  disabled={isLoadingTxn}
                                >
                                  <ArrowsClockwise 
                                    size={12} 
                                    className={isLoadingTxn ? "animate-spin" : ""}
                                  />
                                </Button>
                              </div>
                              
                              {isLoadingTxn ? (
                                <div className="text-center py-4">
                                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                                </div>
                              ) : userTransactions.length === 0 ? (
                                <div className="text-center py-4">
                                  <p className="text-xs text-muted-foreground">No transactions yet</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {userTransactions.map((txn) => {
                                    const isPositive = txn.type === 'deposit' || txn.type === 'bet_won' || txn.type === 'adjustment' && txn.amount > 0;
                                    const isNegative = txn.type === 'withdrawal' || txn.type === 'bet_placed' || txn.type === 'adjustment' && txn.amount < 0;
                                    
                                    return (
                                      <div 
                                        key={txn.id}
                                        className="flex items-center justify-between p-2 bg-background rounded border border-border"
                                      >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <div className={`
                                            w-6 h-6 rounded-full flex items-center justify-center shrink-0
                                            ${isPositive ? 'bg-green-500/10' : isNegative ? 'bg-red-500/10' : 'bg-muted'}
                                          `}>
                                            {isPositive && <ArrowUp size={14} className="text-green-500" weight="bold" />}
                                            {isNegative && <ArrowDown size={14} className="text-red-500" weight="bold" />}
                                            {!isPositive && !isNegative && <Minus size={14} className="text-muted-foreground" />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-foreground capitalize">
                                              {txn.type.replace('_', ' ')}
                                            </p>
                                            {txn.reason && (
                                              <p className="text-xs text-muted-foreground truncate">{txn.reason}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                              {new Date(txn.createdAt).toLocaleString()}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="text-right ml-2">
                                          <p className={`text-sm font-bold ${
                                            isPositive ? 'text-green-500' :
                                            isNegative ? 'text-red-500' :
                                            'text-foreground'
                                          }`}>
                                            {isPositive ? '+' : isNegative ? '-' : ''}${Math.abs(txn.amount).toFixed(2)}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            ${txn.balanceAfter.toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
