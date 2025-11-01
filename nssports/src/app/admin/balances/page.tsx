"use client";

import { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface BalanceAdjustment {
  id: string;
  adjuster: string;
  player: string;
  type: string;
  amount: number;
  reason: string | null;
  timestamp: string;
}

interface BalanceSummary {
  totalPlatformBalance: number;
  todayDeposits: number;
  todayWithdrawals: number;
  netMovement: number;
}

export default function BalancesPage() {
  const [recentAdjustments, setRecentAdjustments] = useState<BalanceAdjustment[]>([]);
  const [summary, setSummary] = useState<BalanceSummary>({
    totalPlatformBalance: 0,
    todayDeposits: 0,
    todayWithdrawals: 0,
    netMovement: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"deposit" | "withdrawal" | "correction">("deposit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const fetchBalanceData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/balances?adjustments=true");
      if (!response.ok) throw new Error("Failed to fetch balance data");
      
      const data = await response.json();
      setSummary(data.summary);
      setRecentAdjustments(data.recentAdjustments || []);
    } catch (error) {
      toast.error("Failed to load balance data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceData();
  }, []);

  const handleAdjustBalance = async () => {
    if (!playerSearch || !amount || !reason) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch("/api/admin/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: playerSearch,
          type: adjustmentType,
          amount: parseFloat(amount),
          reason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to adjust balance");
      }

      const data = await response.json();
      toast.success(`Balance adjusted successfully. New balance: $${data.newBalance}`);
      setShowAdjustModal(false);
      setPlayerSearch("");
      setAmount("");
      setReason("");
      
      // Refresh adjustments list
      fetchBalanceData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to adjust balance");
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Balance Oversight</h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage platform balances
            </p>
          </div>
          <Button
            onClick={() => setShowAdjustModal(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus size={18} />
            Adjust Balance
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total Platform Balance</p>
            <p className="text-3xl font-bold">
              {isLoading ? "..." : `$${summary.totalPlatformBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Today&apos;s Deposits</p>
            <p className="text-3xl font-bold text-green-600">
              {isLoading ? "..." : `$${summary.todayDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Today&apos;s Withdrawals</p>
            <p className="text-3xl font-bold text-red-600">
              {isLoading ? "..." : `$${summary.todayWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Net Movement</p>
            <p className={`text-3xl font-bold ${summary.netMovement >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {isLoading ? "..." : `${summary.netMovement >= 0 ? "+" : ""}$${summary.netMovement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </Card>
        </div>

        {/* Recent Adjustments */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">Recent Adjustments</h2>
            <p className="text-sm text-muted-foreground mt-1">
              All agent and admin balance adjustments
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Adjuster</th>
                  <th className="text-left p-4 font-semibold text-sm">Player</th>
                  <th className="text-left p-4 font-semibold text-sm">Type</th>
                  <th className="text-left p-4 font-semibold text-sm">Amount</th>
                  <th className="text-left p-4 font-semibold text-sm">Reason</th>
                  <th className="text-left p-4 font-semibold text-sm">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentAdjustments.map((adjustment) => (
                  <tr
                    key={adjustment.id}
                    className="border-b border-border hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-4 font-medium">{adjustment.adjuster}</td>
                    <td className="p-4 text-muted-foreground">{adjustment.player}</td>
                    <td className="p-4">
                      <Badge
                        variant={
                          adjustment.type === "Deposit"
                            ? "default"
                            : adjustment.type === "Withdrawal"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {adjustment.type}
                      </Badge>
                    </td>
                    <td className="p-4 font-semibold">${adjustment.amount.toLocaleString()}</td>
                    <td className="p-4 text-sm text-muted-foreground">{adjustment.reason}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(adjustment.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Adjustment Modal */}
        {showAdjustModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl p-6">
              <h2 className="text-2xl font-bold mb-6">Admin Balance Adjustment</h2>
              
              <div className="space-y-4">
                <div>
                  <Label>Player Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by username..."
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Adjustment Type</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant={adjustmentType === "deposit" ? "default" : "outline"}
                      onClick={() => setAdjustmentType("deposit")}
                    >
                      Deposit
                    </Button>
                    <Button
                      type="button"
                      variant={adjustmentType === "withdrawal" ? "default" : "outline"}
                      onClick={() => setAdjustmentType("withdrawal")}
                    >
                      Withdrawal
                    </Button>
                    <Button
                      type="button"
                      variant={adjustmentType === "correction" ? "default" : "outline"}
                      onClick={() => setAdjustmentType("correction")}
                    >
                      Correction
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Unlimited for admin adjustments
                  </p>
                </div>

                <div>
                  <Label>Reason (Required for Audit)</Label>
                  <textarea
                    placeholder="Reason for adjustment..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full min-h-20 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-600">
                      <p className="font-semibold">Warning</p>
                      <p>This action will be logged and is irreversible</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-6">
                <Button
                  onClick={handleAdjustBalance}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Confirm Adjustment
                </Button>
                <Button variant="outline" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
