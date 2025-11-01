"use client";

import { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  UserCog,
  Plus,
  Search,
  Eye,
  Ban,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  ChevronDown,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

interface Player {
  id: string;
  username: string;
  displayName: string | null;
  balance: number;
  status: string;
  totalBets: number;
  totalWagered: number;
  lastBetAt: string | null;
  registeredAt: string;
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
        
        // Update the agent with players data
        setAgents((prevAgents) =>
          prevAgents.map((agent) =>
            agent.id === agentId ? { ...agent, players: data.players } : agent
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

  const handlePlayerStatusChange = async (playerId: string, newStatus: string, agentId: string) => {
    try {
      const response = await fetch(`/api/admin/players/${playerId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Player ${newStatus === "active" ? "activated" : "suspended"} successfully`);
        // Refresh agent's players
        await fetchAgentPlayers(agentId);
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
      <div className="space-y-4 w-full max-w-7xl mx-auto">
        {/* Header - PWA Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agent Management</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Manage agent accounts, permissions, and performance
            </p>
          </div>
          <Link href="/admin/agents/create" className="touch-action-manipulation">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2 w-full sm:w-auto active:scale-95 transition-transform">
              <Plus size={18} />
              Create New Agent
            </Button>
          </Link>
        </div>

        {/* Stats Cards - Mobile Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3 touch-action-manipulation">
            <div className="flex items-center justify-between mb-2">
              <UserCog className="w-6 h-6 text-blue-600" />
              <Badge variant="secondary" className="text-xs">{agents.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Total Agents</p>
            <p className="text-xl font-bold">{agents.length}</p>
          </Card>

          <Card className="p-3 touch-action-manipulation">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <Badge className="bg-green-500/10 text-green-600 text-xs">
                {agents.filter((a) => a.status === "active").length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Active Agents</p>
            <p className="text-xl font-bold">
              {agents.filter((a) => a.status === "active").length}
            </p>
          </Card>

          <Card className="p-3 touch-action-manipulation">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-purple-600" />
              <Badge variant="secondary" className="text-xs">
                {agents.reduce((sum, a) => sum + a.playerCount, 0)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Total Players</p>
            <p className="text-xl font-bold">
              {agents.reduce((sum, a) => sum + a.playerCount, 0)}
            </p>
          </Card>

          <Card className="p-3 touch-action-manipulation">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-6 h-6 text-emerald-600" />
              <Badge variant="secondary" className="text-xs">Today</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Total Adjustments</p>
            <p className="text-xl font-bold">
              ${agents.reduce((sum, a) => sum + a.todayAdjustments, 0).toLocaleString()}
            </p>
          </Card>
        </div>

        {/* Filters - Mobile Optimized */}
        <Card className="p-3">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm touch-action-manipulation"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                size="sm"
                className="shrink-0 touch-action-manipulation active:scale-95"
              >
                All
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                onClick={() => setStatusFilter("active")}
                size="sm"
                className="shrink-0 touch-action-manipulation active:scale-95"
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "idle" ? "default" : "outline"}
                onClick={() => setStatusFilter("idle")}
                size="sm"
                className="shrink-0 touch-action-manipulation active:scale-95"
              >
                Idle
              </Button>
              <Button
                variant={statusFilter === "suspended" ? "default" : "outline"}
                onClick={() => setStatusFilter("suspended")}
                size="sm"
                className="shrink-0 touch-action-manipulation active:scale-95"
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
            filteredAgents.map((agent) => {
              const isExpanded = expandedAgents.has(agent.id);
              const isLoadingPlayers = loadingPlayers.has(agent.id);
              
              return (
                <Card key={agent.id} className="overflow-hidden">
                  {/* Agent Header Row */}
                  <div
                    className="p-4 hover:bg-muted/20 transition-colors cursor-pointer touch-action-manipulation"
                    onClick={() => toggleAgentExpansion(agent.id)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Expand/Collapse Icon */}
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Agent Info */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-4">
                        {/* Username & Display Name */}
                        <div className="flex items-center gap-2">
                          <UserCog className="w-5 h-5 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {agent.username}
                            </p>
                            {agent.displayName && (
                              <p className="text-xs text-muted-foreground truncate">
                                {agent.displayName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center">
                          <Badge
                            className={cn(
                              "text-xs",
                              agent.status === "active" &&
                                "bg-green-500/10 text-green-600 border-green-500/20",
                              agent.status === "idle" &&
                                "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
                              agent.status === "suspended" &&
                                "bg-red-500/10 text-red-600 border-red-500/20"
                            )}
                          >
                            {agent.status === "active" && <CheckCircle size={12} className="mr-1" />}
                            {agent.status === "idle" && <Clock size={12} className="mr-1" />}
                            {agent.status === "suspended" && <Ban size={12} className="mr-1" />}
                            {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                          </Badge>
                        </div>

                        {/* Players Count */}
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-muted-foreground shrink-0" />
                          <span className="text-sm">
                            <span className="font-semibold">{agent.playerCount}</span>
                            <span className="text-muted-foreground text-xs ml-1">players</span>
                          </span>
                        </div>

                        {/* Daily Adjustments */}
                        <div className="flex items-center gap-2">
                          <DollarSign size={14} className="text-emerald-600 shrink-0" />
                          <span className="text-sm">
                            <span className="font-semibold">
                              ${agent.todayAdjustments.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {" "}/ ${agent.dailyAdjustmentLimit.toLocaleString()}
                            </span>
                          </span>
                        </div>

                        {/* Last Active */}
                        <div className="text-xs text-muted-foreground">
                          {agent.lastLogin
                            ? new Date(agent.lastLogin).toLocaleDateString()
                            : "Never active"}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
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
                            "touch-action-manipulation",
                            agent.status === "active"
                              ? "text-red-600 hover:text-red-700 hover:bg-red-500/10"
                              : "text-green-600 hover:text-green-700 hover:bg-green-500/10"
                          )}
                        >
                          {agent.status === "active" ? (
                            <Ban size={16} />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Players Section */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30">
                      {isLoadingPlayers ? (
                        <div className="p-8 text-center">
                          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Loading players...</p>
                        </div>
                      ) : agent.players && agent.players.length > 0 ? (
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-purple-600" />
                            <h4 className="text-sm font-semibold text-foreground">
                              Agent&apos;s Players ({agent.players.length})
                            </h4>
                          </div>
                          
                          <div className="space-y-2">
                            {agent.players.map((player) => (
                              <div
                                key={player.id}
                                className="bg-background rounded-lg p-3 border border-border hover:border-accent/50 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-4">
                                  {/* Player Info */}
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                                    <div>
                                      <p className="font-medium text-sm">{player.username}</p>
                                      {player.displayName && (
                                        <p className="text-xs text-muted-foreground">
                                          {player.displayName}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-xs",
                                          player.status === "active" && "border-green-500/50 text-green-600",
                                          player.status === "suspended" && "border-red-500/50 text-red-600"
                                        )}
                                      >
                                        {player.status}
                                      </Badge>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <DollarSign size={12} className="text-emerald-600" />
                                      <span className="text-sm font-semibold">
                                        ${player.balance.toLocaleString()}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <TrendingUp size={12} />
                                      <span>{player.totalBets} bets</span>
                                      <span className="hidden sm:inline">
                                        • ${player.totalWagered.toLocaleString()} wagered
                                      </span>
                                    </div>
                                  </div>

                                  {/* Player Actions */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Link href={`/admin/players/${player.id}`}>
                                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                        <Eye size={14} />
                                      </Button>
                                    </Link>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayerStatusChange(
                                          player.id,
                                          player.status === "active" ? "suspended" : "active",
                                          agent.id
                                        );
                                      }}
                                      className={cn(
                                        player.status === "active"
                                          ? "text-red-600 hover:bg-red-500/10"
                                          : "text-green-600 hover:bg-green-500/10"
                                      )}
                                    >
                                      {player.status === "active" ? (
                                        <Ban size={14} />
                                      ) : (
                                        <CheckCircle size={14} />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No players registered with this agent</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
