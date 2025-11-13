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
  Minus,
  Trash
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
  freePlay: number;
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
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Delete/deactivate a player
  const handleDeletePlayer = useCallback(async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to deactivate player "${username}"? This action will prevent them from logging in and placing bets.`)) {
      return;
    }

    setDeletingUserId(userId);

    try {
      const response = await fetch(`/api/agent/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate player');
      }

      // Remove player from the list
      setAgentUsers(prev => prev.filter(user => user.id !== userId));
      
      // Update summary
      setUsersSummary(prev => ({
        totalUsers: prev.totalUsers - 1,
        totalBalance: prev.totalBalance - (agentUsers.find(u => u.id === userId)?.balance || 0),
        activeUsers: prev.activeUsers - 1,
      }));

    } catch (error) {
      console.error('Error deactivating player:', error);
      alert('Failed to deactivate player. Please try again.');
    } finally {
      setDeletingUserId(null);
    }
  }, [agentUsers]);

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
    <div className="bg-background h-full min-h-screen pb-20">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 lg:py-6"
      >
        <div className="container mx-auto max-w-[1920px]">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Agent Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your players and balances</p>
        </div>
      </motion.div>

      {/* Main Content - Responsive Container */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 lg:py-8 max-w-[1920px]">
        <div className="space-y-6 lg:space-y-8">
          {/* Quick Actions - Mobile Optimized */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-4 lg:p-6"
          >
            <h2 className="text-lg lg:text-xl font-semibold text-foreground mb-4 lg:mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
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
                    <div key={user.id} className="relative group bg-background border border-border rounded-lg overflow-hidden">
                      {/* Player Header - Clickable */}
                      <button
                        onClick={() => toggleExpanded(user.id)}
                        className="w-full p-3 hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: Name, Username, Active Badge */}
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground whitespace-nowrap">
                                {user.name || user.username}
                              </p>
                              {user.lastLogin && new Date().getTime() - new Date(user.lastLogin).getTime() < 7 * 24 * 60 * 60 * 1000 && (
                                <Badge variant="secondary" className="text-xs py-0 px-1.5">Active</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">@{user.username}</p>
                          </div>
                          
                          {/* Right: Horizontal Scrollable Balance Cards + Expand Icon + Delete */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory flex-1">
                              {/* Available */}
                              <div className="snap-start shrink-0 bg-card rounded-lg p-2 min-w-[90px] border border-border">
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">Available</p>
                                <p className="text-sm font-bold text-accent">${user.available.toFixed(2)}</p>
                              </div>
                              
                              {/* At Risk */}
                              <div className="snap-start shrink-0 bg-card rounded-lg p-2 min-w-[90px] border border-border">
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">At Risk</p>
                                <p className="text-sm font-bold text-destructive">${user.risk.toFixed(2)}</p>
                              </div>
                              
                              {/* Balance */}
                              <div className="snap-start shrink-0 bg-card rounded-lg p-2 min-w-[90px] border border-border">
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">Balance</p>
                                <p className="text-sm font-bold text-foreground">${user.balance.toFixed(2)}</p>
                              </div>
                              
                              {/* Freeplay */}
                              <div className="snap-start shrink-0 bg-card rounded-lg p-2 min-w-[90px] border border-border">
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">Freeplay</p>
                                <p className="text-sm font-bold text-blue-500">${user.freePlay.toFixed(2)}</p>
                              </div>
                            </div>
                            
                            {/* Expand/Collapse Icon */}
                            <div className="shrink-0">
                              {isExpanded ? (
                                <CaretUp size={16} className="text-muted-foreground" />
                              ) : (
                                <CaretDown size={16} className="text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Delete Button - Always visible on mobile, hover on desktop */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlayer(user.id, user.username);
                        }}
                        disabled={deletingUserId === user.id}
                        className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-destructive/10 transition-colors opacity-60 hover:opacity-100 disabled:opacity-30"
                        title="Deactivate player"
                      >
                        <Trash size={16} className="text-muted-foreground hover:text-destructive" />
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
    </div>
  );
}
