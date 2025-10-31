"use client";

import { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Search,
  Eye,
  Ban,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

interface Player {
  id: string;
  username: string;
  displayName: string | null;
  agentUsername: string | null;
  status: string;
  balance: number;
  totalBets: number;
  lastBetAt: string | null;
  registeredAt: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [balanceFilter, setBalanceFilter] = useState<string>("all");

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch("/api/admin/players");
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || []);
      }
    } catch (error) {
      console.error("Failed to fetch players:", error);
      toast.error("Failed to load players");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (playerId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/players/${playerId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Player ${newStatus === "active" ? "activated" : "suspended"} successfully`);
        fetchPlayers();
      } else {
        throw new Error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update player status");
    }
  };

  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      player.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || player.status === statusFilter;
    
    let matchesBalance = true;
    if (balanceFilter === "100+") matchesBalance = player.balance >= 100;
    else if (balanceFilter === "500+") matchesBalance = player.balance >= 500;
    else if (balanceFilter === "1000+") matchesBalance = player.balance >= 1000;
    
    return matchesSearch && matchesStatus && matchesBalance;
  });

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading players...</p>
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
            <h1 className="text-3xl font-bold text-foreground">Player Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage player accounts and monitor activity
            </p>
          </div>
          <Link href="/admin/players/create">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus size={18} />
              Register Player
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <Badge variant="secondary">{players.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Total Players</p>
            <p className="text-2xl font-bold">{players.length}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <Badge className="bg-green-500/10 text-green-600">
                {players.filter((p) => p.status === "active").length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Active Players</p>
            <p className="text-2xl font-bold">
              {players.filter((p) => p.status === "active").length}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-emerald-600" />
              <Badge variant="secondary">Total</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Platform Balance</p>
            <p className="text-2xl font-bold">
              ${players.reduce((sum, p) => sum + p.balance, 0).toLocaleString()}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <Badge variant="secondary">All Time</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Total Bets</p>
            <p className="text-2xl font-bold">
              {players.reduce((sum, p) => sum + p.totalBets, 0).toLocaleString()}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search players by username or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter size={16} />
                Advanced Filters
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  onClick={() => setStatusFilter("all")}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  onClick={() => setStatusFilter("active")}
                  size="sm"
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === "suspended" ? "default" : "outline"}
                  onClick={() => setStatusFilter("suspended")}
                  size="sm"
                >
                  Suspended
                </Button>
                <Button
                  variant={statusFilter === "idle" ? "default" : "outline"}
                  onClick={() => setStatusFilter("idle")}
                  size="sm"
                >
                  Idle
                </Button>
              </div>

              <div className="h-6 w-px bg-border" />

              <div className="flex gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground">Balance:</span>
                <Button
                  variant={balanceFilter === "all" ? "default" : "outline"}
                  onClick={() => setBalanceFilter("all")}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={balanceFilter === "100+" ? "default" : "outline"}
                  onClick={() => setBalanceFilter("100+")}
                  size="sm"
                >
                  $100+
                </Button>
                <Button
                  variant={balanceFilter === "500+" ? "default" : "outline"}
                  onClick={() => setBalanceFilter("500+")}
                  size="sm"
                >
                  $500+
                </Button>
                <Button
                  variant={balanceFilter === "1000+" ? "default" : "outline"}
                  onClick={() => setBalanceFilter("1000+")}
                  size="sm"
                >
                  $1000+
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Players Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Username</th>
                  <th className="text-left p-4 font-semibold text-sm">Agent</th>
                  <th className="text-left p-4 font-semibold text-sm">Status</th>
                  <th className="text-left p-4 font-semibold text-sm">Balance</th>
                  <th className="text-left p-4 font-semibold text-sm">Last Bet</th>
                  <th className="text-left p-4 font-semibold text-sm">Registered</th>
                  <th className="text-right p-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No players found</p>
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((player) => (
                    <tr
                      key={player.id}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">{player.username}</p>
                          {player.displayName && (
                            <p className="text-sm text-muted-foreground">{player.displayName}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {player.agentUsername || "Unassigned"}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge
                          className={cn(
                            player.status === "active" &&
                              "bg-green-500/10 text-green-600 border-green-500/20",
                            player.status === "idle" &&
                              "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
                            player.status === "suspended" &&
                              "bg-red-500/10 text-red-600 border-red-500/20"
                          )}
                        >
                          {player.status === "active" && <CheckCircle size={12} className="mr-1" />}
                          {player.status === "idle" && <Clock size={12} className="mr-1" />}
                          {player.status === "suspended" && <Ban size={12} className="mr-1" />}
                          {player.status.charAt(0).toUpperCase() + player.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-foreground">
                          ${player.balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {player.lastBetAt
                          ? new Date(player.lastBetAt).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(player.registeredAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/players/${player.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye size={16} />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(
                                player.id,
                                player.status === "active" ? "suspended" : "active"
                              )
                            }
                            className={cn(
                              player.status === "active"
                                ? "text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                : "text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            )}
                          >
                            {player.status === "active" ? (
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
