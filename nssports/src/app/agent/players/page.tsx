"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  MagnifyingGlass, 
  Users, 
  CurrencyDollar,
  UserPlus,
  ArrowsClockwise
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui";

/**
 * View Players Page
 * Agent can view all registered players with search and filters
 */

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

export default function ViewPlayersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [players, setPlayers] = useState<AgentUser[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<AgentUser[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "balance-high" | "balance-low">("newest");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalBalance: 0,
    activeUsers: 0,
  });

  // Fetch players
  const fetchPlayers = useCallback(async () => {
    if (!session?.user?.isAgent && !session?.user?.isAdmin) return;
    
    setLoadingPlayers(true);
    try {
      const response = await fetch('/api/agent/users');
      if (response.ok) {
        const result = await response.json();
        const data: AgentUsersResponse = result.data;
        setPlayers(data.users);
        setSummary(data.summary);
      } else {
        console.error('Failed to load players');
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  }, [session?.user?.isAgent, session?.user?.isAdmin]);

  // Redirect non-agents
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user) {
      router.push("/auth/login?callbackUrl=/agent/players");
      return;
    }

    if (!session.user.isAgent && !session.user.isAdmin) {
      router.push("/");
      return;
    }

    setIsLoading(false);
  }, [session, status, router]);

  // Fetch players when component mounts
  useEffect(() => {
    if (!isLoading && session?.user && (session.user.isAgent || session.user.isAdmin)) {
      fetchPlayers();
    }
  }, [isLoading, session, fetchPlayers]);

  // Filter and sort players
  useEffect(() => {
    let filtered = [...players];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (player) =>
          player.username.toLowerCase().includes(query) ||
          player.name?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus === "active") {
      filtered = filtered.filter((player) => {
        if (!player.lastLogin) return false;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(player.lastLogin) > sevenDaysAgo;
      });
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((player) => {
        if (!player.lastLogin) return true;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(player.lastLogin) <= sevenDaysAgo;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "balance-high":
          return b.balance - a.balance;
        case "balance-low":
          return a.balance - b.balance;
        default:
          return 0;
      }
    });

    setFilteredPlayers(filtered);
  }, [players, searchQuery, filterStatus, sortBy]);

  const isPlayerActive = (player: AgentUser) => {
    if (!player.lastLogin) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(player.lastLogin) > sevenDaysAgo;
  };

  const toggleCard = (playerId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  if (isLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-6">
      {/* Header - Mobile Optimized */}
      <div className="bg-card border-b border-border p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-8 w-8 p-0 touch-action-manipulation active:scale-95"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Your Players</h1>
              <p className="text-xs text-muted-foreground">Manage and view all registered players</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPlayers}
            disabled={loadingPlayers}
            className="touch-action-manipulation active:scale-95"
          >
            <ArrowsClockwise 
              size={18} 
              className={loadingPlayers ? "animate-spin" : ""}
            />
          </Button>
        </div>

        {/* Summary Stats - Horizontal Scroll with Modern Cards */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory px-1 -mx-1">
          <div className="snap-start shrink-0 bg-linear-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-xl p-4 min-w-[140px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <Users size={18} weight="bold" className="text-accent" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Total Players</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{summary.totalUsers}</div>
          </div>
          
          <div className="snap-start shrink-0 bg-linear-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4 min-w-[140px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CurrencyDollar size={18} weight="bold" className="text-green-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Total Balance</span>
            </div>
            <div className="text-2xl font-bold text-green-500">${summary.totalBalance.toFixed(2)}</div>
          </div>
          
          <div className="snap-start shrink-0 bg-linear-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 min-w-[140px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <UserPlus size={18} weight="bold" className="text-blue-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Active (7d)</span>
            </div>
            <div className="text-2xl font-bold text-blue-500">{summary.activeUsers}</div>
          </div>
        </div>
      </div>

      {/* Search and Filters - Mobile Optimized */}
      <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlass 
            size={18} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder="Search by username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 touch-action-manipulation"
          />
        </div>

        {/* Filters - Scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-3 py-2 text-xs sm:text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent touch-action-manipulation whitespace-nowrap"
          >
            <option value="all">All Players</option>
            <option value="active">Active (7d)</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 text-xs sm:text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent touch-action-manipulation whitespace-nowrap"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="balance-high">Highest Balance</option>
            <option value="balance-low">Lowest Balance</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          Showing {filteredPlayers.length} of {players.length} players
        </div>
      </div>

      {/* Players List - Mobile Optimized */}
      <div className="px-3 sm:px-4 space-y-3">
        {loadingPlayers && players.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading players...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {searchQuery || filterStatus !== "all" 
                ? "No players match your filters" 
                : "No players registered yet"}
            </p>
            {!searchQuery && filterStatus === "all" && (
              <p className="text-xs text-muted-foreground mb-4">
                Start by registering your first player
              </p>
            )}
            {!searchQuery && filterStatus === "all" && (
              <Button
                onClick={() => router.push("/agent/register-player")}
                className="bg-accent hover:bg-accent/90 touch-action-manipulation active:scale-95"
              >
                <UserPlus size={18} className="mr-2" />
                Register Player
              </Button>
            )}
          </motion.div>
        ) : (
          filteredPlayers.map((player, index) => {
            const isExpanded = expandedCards.has(player.id);
            
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-linear-to-br from-card to-card/50 border border-border/50 rounded-2xl overflow-hidden hover:border-accent/30 hover:shadow-lg transition-all duration-300"
              >
                {/* Collapsed View - Professionally Structured */}
                <div className="p-4 space-y-3">
                  {/* Top Section: Name + Balance */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Player Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-foreground truncate">
                        {player.name || player.username}
                      </h3>
                      <p className="text-sm text-muted-foreground">@{player.username}</p>
                      {isPlayerActive(player) && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-xs text-green-500 font-medium">Active</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Main Balance */}
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground mb-1">Balance</div>
                      <div className="text-xl font-bold text-accent">
                        ${player.balance.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Scrollable Balance Details */}
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
                    {/* Available Balance */}
                    <div className="snap-start shrink-0 bg-card rounded-lg p-3 min-w-[130px] border border-border">
                      <div className="text-xs text-muted-foreground mb-1.5">Available</div>
                      <div className="text-lg font-bold text-foreground">${player.balance.toFixed(2)}</div>
                    </div>
                    
                    {/* At Risk */}
                    <div className="snap-start shrink-0 bg-card rounded-lg p-3 min-w-[130px] border border-border">
                      <div className="text-xs text-muted-foreground mb-1.5">At Risk</div>
                      <div className="text-lg font-bold text-foreground">$0.00</div>
                    </div>
                    
                    {/* Win/Loss */}
                    <div className="snap-start shrink-0 bg-card rounded-lg p-3 min-w-[130px] border border-border">
                      <div className="text-xs text-muted-foreground mb-1.5">Win/Loss</div>
                      <div className="text-lg font-bold text-foreground">$0.00</div>
                    </div>
                    
                    {/* Total Bets */}
                    <div className="snap-start shrink-0 bg-card rounded-lg p-3 min-w-[130px] border border-border">
                      <div className="text-xs text-muted-foreground mb-1.5">Total Bets</div>
                      <div className="text-lg font-bold text-foreground">0</div>
                    </div>
                  </div>

                  {/* Expand Button */}
                  <button
                    onClick={() => toggleCard(player.id)}
                    className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors touch-action-manipulation active:scale-95"
                  >
                    <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                        <path d="M4 6l4 4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.div>
                  </button>
                </div>

                {/* Expanded Section - Additional Info */}
                <motion.div
                  initial={false}
                  animate={{
                    height: isExpanded ? "auto" : 0,
                    opacity: isExpanded ? 1 : 0
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {/* Account Details */}
                    <div className="bg-card rounded-lg p-3 border border-border">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Registered</div>
                          <div className="text-sm font-semibold text-foreground">
                            {new Date(player.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Last Login</div>
                          <div className="text-sm font-semibold text-foreground">
                            {player.lastLogin 
                              ? new Date(player.lastLogin).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : "Never"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 text-sm font-medium touch-action-manipulation active:scale-95 transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/agent/adjust-balance`);
                        }}
                      >
                        <CurrencyDollar size={16} className="mr-1.5" weight="bold" />
                        Adjust Balance
                      </Button>
                      <Button
                        size="sm"
                        className="h-10 text-sm font-medium touch-action-manipulation active:scale-95 transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/agent/players/${player.id}`);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
