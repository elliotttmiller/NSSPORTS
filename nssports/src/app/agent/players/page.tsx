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
import { Badge } from "@/components/ui";
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header - Mobile Optimized */}
      <div className="bg-card border-b border-border p-3 sm:p-4">
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

        {/* Summary Stats - Responsive Text Sizing */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-accent/5 border border-accent/10 rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Users size={14} className="text-accent" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Total</span>
            </div>
            <div className="text-base sm:text-lg md:text-xl font-bold text-foreground">{summary.totalUsers}</div>
          </div>
          <div className="bg-accent/5 border border-accent/10 rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CurrencyDollar size={14} className="text-accent" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Balance</span>
            </div>
            <div className="text-base sm:text-lg md:text-xl font-bold text-accent">${summary.totalBalance.toFixed(2)}</div>
          </div>
          <div className="bg-accent/5 border border-accent/10 rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <UserPlus size={14} className="text-accent" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Active</span>
            </div>
            <div className="text-base sm:text-lg md:text-xl font-bold text-foreground">{summary.activeUsers}</div>
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
          filteredPlayers.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card border border-border rounded-xl p-3 sm:p-4 hover:border-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {player.name || player.username}
                    </h3>
                    {isPlayerActive(player) && (
                      <Badge variant="secondary" className="text-xs py-0 px-1.5">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">@{player.username}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Registered:</span>
                      <span className="ml-1 text-foreground">
                        {new Date(player.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Login:</span>
                      <span className="ml-1 text-foreground">
                        {player.lastLogin 
                          ? new Date(player.lastLogin).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-accent mb-1">
                    ${player.balance.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">Balance</div>
                </div>
              </div>

              {/* Quick Actions - Touch Optimized */}
              <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs touch-action-manipulation active:scale-95"
                  onClick={() => {
                    router.push(`/agent/adjust-balance`);
                  }}
                >
                  Adjust Balance
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs touch-action-manipulation active:scale-95"
                  onClick={() => {
                    router.push(`/agent/players/${player.id}`);
                  }}
                >
                  View Details
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
