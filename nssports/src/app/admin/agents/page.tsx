"use client";

import { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricCard, MetricCardSection } from "@/components/ui/metric-card";
import {
  UserCog,
  Plus,
  Search,
  Eye,
  Ban,
  CheckCircle,
  Users,
  DollarSign,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { PlayerDetailModal } from "@/components/admin/PlayerDetailModal";

interface Player {
  id: string;
  username: string;
  displayName: string | null;
  balance: number;
  available: number;
  risk: number;
  totalPendingBets: number;
  status: string;
  totalBets: number;
  totalWagered: number;
  totalWinnings: number;
  lastBetAt: string | null;
  registeredAt: string;
  lastLogin: string | null;
}

interface Agent {
  id: string;
  username: string;
  displayName: string | null;
  status: string;
  lastLogin: string | null;
  maxSingleAdjustment: number;
  dailyAdjustmentLimit: number;
  playerCount: number;
  totalBalance: number;
  todayAdjustments: number;
  createdAt: string;
  players?: Player[];
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [loadingPlayers, setLoadingPlayers] = useState<Set<string>>(new Set());
  
  // Modal state for player details
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayerUsername, setSelectedPlayerUsername] = useState<string | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/admin/agents");
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
      toast.error("Failed to load agents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (agentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/agents/${agentId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Agent ${newStatus === "active" ? "activated" : "suspended"} successfully`);
        fetchAgents();
      } else {
        throw new Error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update agent status");
    }
  };

  const toggleAgentExpansion = async (agentId: string) => {
    const newExpanded = new Set(expandedAgents);
    
    if (expandedAgents.has(agentId)) {
      // Collapse
      newExpanded.delete(agentId);
      setExpandedAgents(newExpanded);
    } else {
      // Expand and load players if not already loaded
      newExpanded.add(agentId);
      setExpandedAgents(newExpanded);
      
      const agent = agents.find((a) => a.id === agentId);
      if (agent && !agent.players) {
        await fetchAgentPlayers(agentId);
      }
    }
  };

  const fetchAgentPlayers = async (agentId: string) => {
    setLoadingPlayers(new Set(loadingPlayers).add(agentId));
    
    try {
      const response = await fetch(`/api/admin/agents/${agentId}/players`);
      if (response.ok) {
        const data = await response.json();
        
        // Update the agent with players data (totalBalance already comes from backend)
        setAgents((prevAgents) =>
          prevAgents.map((agent) =>
            agent.id === agentId 
              ? { ...agent, players: data.players } 
              : agent
          )
        );
      } else {
        toast.error("Failed to load agent players");
      }
    } catch (error) {
      console.error("Failed to fetch agent players:", error);
      toast.error("Failed to load agent players");
    } finally {
      const newLoading = new Set(loadingPlayers);
      newLoading.delete(agentId);
      setLoadingPlayers(newLoading);
    }
  };

  // Removed unused handlePlayerStatusChange function

  const handlePlayerStatusChangeFromModal = async (playerId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Player ${newStatus === "active" ? "activated" : "suspended"} successfully`);
        // Refresh all agents to update player status in the list
        await fetchAgents();
      } else {
        throw new Error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update player status");
    }
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading agents...</p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-3 w-full">
        {/* Header - Sleek & Compact (matching dashboard) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Agent Management</h1>
            <Link href="/admin/agents/create" className="touch-action-manipulation">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 h-8 active:scale-95 transition-transform">
                <Plus size={14} />
                <span className="hidden sm:inline">Create Agent</span>
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Manage agent accounts, permissions, and performance
          </p>
        </div>

        {/* Stats Cards - Mobile Grid */}
        <MetricCardSection title="Agent Overview">
          <MetricCard
            icon={UserCog}
            label="Total Agents"
            value={agents.length}
            iconColor="text-accent"
            bgColor="bg-accent/10"
          />
          <MetricCard
            icon={Users}
            label="Total Players"
            value={agents.reduce((sum, a) => sum + a.playerCount, 0)}
            iconColor="text-accent"
            bgColor="bg-accent/10"
          />
          <MetricCard
            icon={DollarSign}
            label="Today's Adjustments"
            value={agents.reduce((sum, a) => sum + a.todayAdjustments, 0)}
            iconColor="text-emerald-600"
            bgColor="bg-emerald-500/10"
            trend="up"
          />
        </MetricCardSection>

        {/* Filters - Compact */}
        <Card className="p-2.5">
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm h-8 touch-action-manipulation"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                size="sm"
                className="shrink-0 h-7 px-2.5 text-xs touch-action-manipulation active:scale-95"
              >
                All
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                onClick={() => setStatusFilter("active")}
                size="sm"
                className="shrink-0 h-7 px-2.5 text-xs touch-action-manipulation active:scale-95"
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "idle" ? "default" : "outline"}
                onClick={() => setStatusFilter("idle")}
                size="sm"
                className="shrink-0 h-7 px-2.5 text-xs touch-action-manipulation active:scale-95"
              >
                Idle
              </Button>
              <Button
                variant={statusFilter === "suspended" ? "default" : "outline"}
                onClick={() => setStatusFilter("suspended")}
                size="sm"
                className="shrink-0 h-7 px-2.5 text-xs touch-action-manipulation active:scale-95"
              >
                Suspended
              </Button>
            </div>
          </div>
        </Card>

        {/* Agents List - Expandable with Players */}
        <div className="space-y-2">
          {filteredAgents.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <UserCog className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No agents found</p>
              </div>
            </Card>
          ) : (
            <>
              {filteredAgents.map((agent) => {
                const isExpanded = expandedAgents.has(agent.id);
                const isLoadingPlayers = loadingPlayers.has(agent.id);
                
                return (
                  <Card key={agent.id} className="overflow-hidden">
                  {/* Agent Header Row - Sleek Horizontal Compact */}
                  <div
                    className="p-2 hover:bg-muted/20 transition-colors cursor-pointer touch-action-manipulation"
                    onClick={() => toggleAgentExpansion(agent.id)}
                  >
                    <div className="flex items-center gap-2">
                      {/* Expand Icon */}
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/70" />
                        )}
                      </div>

                      {/* Agent Identity - Compact */}
                      <div className="flex items-center gap-2 min-w-[140px] sm:min-w-[180px]">
                        <UserCog className="w-3.5 h-3.5 text-accent shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-xs truncate leading-tight">
                            {agent.username}
                          </p>
                          {agent.displayName && (
                            <p className="text-[9px] text-muted-foreground/60 truncate leading-tight">
                              {agent.displayName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Metrics - Horizontal Compact */}
                      <div className="hidden sm:flex items-center gap-3 flex-1 min-w-0">
                        {/* Players */}
                        <div className="flex items-center gap-1">
                          <Users size={11} className="text-muted-foreground/60 shrink-0" />
                          <span className="text-[10px] font-medium">{agent.playerCount}</span>
                        </div>

                        {/* Divider */}
                        <div className="h-3 w-px bg-border/30"></div>

                        {/* Total Balance */}
                        <div className="flex items-center gap-1">
                          <DollarSign size={11} className="text-accent shrink-0" />
                          <span className="text-[10px] font-medium text-accent">
                            ${agent.totalBalance?.toLocaleString() || '0'}
                          </span>
                          <span className="text-[9px] text-muted-foreground/50">total</span>
                        </div>

                        {/* Divider */}
                        <div className="h-3 w-px bg-border/30"></div>

                        {/* Daily Adjustments */}
                        <div className="flex items-center gap-1">
                          <DollarSign size={11} className="text-emerald-600 shrink-0" />
                          <span className="text-[10px] font-medium">
                            ${agent.todayAdjustments.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-muted-foreground/50">
                            / ${agent.dailyAdjustmentLimit.toLocaleString()}
                          </span>
                        </div>

                        {/* Divider */}
                        <div className="h-3 w-px bg-border/30"></div>

                        {/* Last Active */}
                        <div className="text-[9px] text-muted-foreground/60">
                          {agent.lastLogin
                            ? new Date(agent.lastLogin).toLocaleDateString()
                            : "Never"}
                        </div>
                      </div>

                      {/* Action Button - Compact */}
                      <div className="flex items-center gap-1 shrink-0 ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(
                              agent.id,
                              agent.status === "active" ? "suspended" : "active"
                            );
                          }}
                          className={cn(
                            "h-6 w-6 p-0 touch-action-manipulation",
                            agent.status === "active"
                              ? "text-red-600 hover:text-red-700 hover:bg-red-500/10"
                              : "text-green-600 hover:text-green-700 hover:bg-green-500/10"
                          )}
                        >
                          {agent.status === "active" ? (
                            <Ban size={12} />
                          ) : (
                            <CheckCircle size={12} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Players Section */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30">
                      {isLoadingPlayers ? (
                        <div className="p-6 text-center">
                          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground/70">Loading players...</p>
                        </div>
                      ) : agent.players && agent.players.length > 0 ? (
                        <div className="p-2">
                          <div className="flex items-center gap-1.5 mb-1.5 px-1">
                            <Users className="w-3 h-3 text-accent" />
                            <h4 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                              Players ({agent.players.length})
                            </h4>
                          </div>
                          
                          <div className="space-y-1">
                            {agent.players.map((player) => (
                              <div
                                key={player.id}
                                className="bg-background rounded-lg p-2 border border-border hover:border-accent/50 transition-colors w-full"
                              >
                                {/* Mobile-First Responsive Player Card */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2 w-full">
                                  {/* Top Row: Username, Status, Action Button */}
                                  <div className="flex items-center justify-between w-full sm:w-auto sm:min-w-[120px]">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm sm:text-xs truncate">{player.username}</p>
                                        {player.displayName && (
                                          <p className="text-xs sm:text-[10px] text-muted-foreground/70 truncate">
                                            {player.displayName}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Action Button - Mobile Only */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedPlayerId(player.id);
                                        setSelectedPlayerUsername(player.username);
                                        setIsPlayerModalOpen(true);
                                      }}
                                      className="h-7 w-7 p-0 shrink-0 hover:bg-accent/10 sm:hidden"
                                    >
                                      <Eye size={14} className="text-accent" />
                                    </Button>
                                  </div>

                                  {/* Financial Metrics - Responsive Grid */}
                                  <div className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:gap-3 md:gap-4 flex-1 w-full sm:justify-end">
                                    {/* Balance */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5">
                                      <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 uppercase tracking-wider">Balance</span>
                                      <span className="text-sm sm:text-sm font-semibold text-foreground">
                                        ${player.balance?.toLocaleString() || '0'}
                                      </span>
                                    </div>

                                    {/* Divider - Desktop Only */}
                                    <div className="hidden sm:block h-4 w-px bg-border/40"></div>

                                    {/* Available */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5">
                                      <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 uppercase tracking-wider">Available</span>
                                      <span className="text-sm sm:text-sm font-semibold text-emerald-600">
                                        ${player.available?.toLocaleString() || '0'}
                                      </span>
                                    </div>

                                    {/* Divider - Desktop Only */}
                                    <div className="hidden sm:block h-4 w-px bg-border/40"></div>

                                    {/* Risk */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5">
                                      <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 uppercase tracking-wider">Risk</span>
                                      <span className="text-sm sm:text-sm font-semibold text-red-600">
                                        ${player.risk?.toLocaleString() || '0'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Action Button - Desktop Only */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPlayerId(player.id);
                                      setSelectedPlayerUsername(player.username);
                                      setIsPlayerModalOpen(true);
                                    }}
                                    className="hidden sm:flex h-6 w-6 p-0 shrink-0 hover:bg-accent/10"
                                  >
                                    <Eye size={13} className="text-accent" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground/70">
                          <Users className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                          <p className="text-[10px]">No players registered</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
            </>
          )}
        </div>
      </div>

      {/* Player Detail Modal */}
      <PlayerDetailModal
        playerId={selectedPlayerId}
        playerUsername={selectedPlayerUsername}
        isOpen={isPlayerModalOpen}
        onClose={() => {
          setIsPlayerModalOpen(false);
          setSelectedPlayerId(null);
          setSelectedPlayerUsername(null);
        }}
        onStatusChange={handlePlayerStatusChangeFromModal}
      />
    </AdminDashboardLayout>
  );
}
