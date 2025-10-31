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
  Edit,
  Eye,
  Ban,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

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
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

        {/* Agents Table - Mobile Optimized */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto seamless-scroll" data-mobile-scroll>
            <table className="w-full min-w-[640px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-semibold text-xs sm:text-sm">Username</th>
                  <th className="text-left p-3 font-semibold text-xs sm:text-sm">Status</th>
                  <th className="text-left p-3 font-semibold text-xs sm:text-sm">Players</th>
                  <th className="text-left p-3 font-semibold text-xs sm:text-sm">Last Active</th>
                  <th className="text-left p-3 font-semibold text-xs sm:text-sm">Daily Adjustments</th>
                  <th className="text-right p-3 font-semibold text-xs sm:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      <UserCog className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No agents found</p>
                    </td>
                  </tr>
                ) : (
                  filteredAgents.map((agent) => (
                    <tr
                      key={agent.id}
                      className="border-b border-border hover:bg-muted/20 transition-colors touch-action-manipulation"
                    >
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-foreground text-sm">{agent.username}</p>
                          {agent.displayName && (
                            <p className="text-xs text-muted-foreground">{agent.displayName}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          className={cn(
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
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Users size={14} className="text-muted-foreground" />
                          <span className="font-medium">{agent.playerCount}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {agent.lastLogin
                          ? new Date(agent.lastLogin).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <span className="font-medium text-foreground">
                            ${agent.todayAdjustments.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            / ${agent.dailyAdjustmentLimit.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/agents/${agent.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye size={16} />
                            </Button>
                          </Link>
                          <Link href={`/admin/agents/${agent.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit size={16} />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(
                                agent.id,
                                agent.status === "active" ? "suspended" : "active"
                              )
                            }
                            className={cn(
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
