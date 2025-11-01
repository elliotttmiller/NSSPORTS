"use client";

import { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MetricCard, MetricCardSection } from "@/components/ui/metric-card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { handleAuthError } from "@/lib/clientAuthHelpers";

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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("[BalancesPage] API Error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        // Handle authentication errors (401/403) - redirects if needed
        if (handleAuthError(response)) {
          toast.error(response.status === 401 ? "Session expired. Redirecting to login..." : "You don't have permission to view balance data.");
          return;
        }
        
        // Handle other errors
        const errorMessage = errorData.error || "Failed to fetch balance data";
        toast.error(errorMessage);
        return;
      }
      
      const data = await response.json();
      console.log("[BalancesPage] Balance data loaded successfully");
      setSummary(data.summary);
      setRecentAdjustments(data.recentAdjustments || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load balance data";
      console.error("[BalancesPage] Fetch error:", error);
      toast.error(errorMessage);
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
      <div className="space-y-4 w-full max-w-7xl mx-auto px-3 sm:px-4">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Balance Oversight</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Monitor and manage platform balances
            </p>
          </div>
          <Button
            onClick={() => setShowAdjustModal(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2 w-full sm:w-auto touch-action-manipulation active:scale-95 transition-transform"
          >
            <Plus size={18} />
            Adjust Balance
          </Button>
        </div>

        {/* Summary Cards */}
        <MetricCardSection title="Financial Summary">
          <MetricCard
            icon={DollarSign}
            label="Total Platform Balance"
            value={isLoading ? "..." : `$${summary.totalPlatformBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            iconColor="text-foreground"
            bgColor="bg-foreground/5"
          />
          <MetricCard
            icon={TrendingUp}
            label="Today's Deposits"
            value={isLoading ? "..." : `$${summary.todayDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            iconColor="text-emerald-600"
            bgColor="bg-emerald-500/10"
            trend="up"
          />
          <MetricCard
            icon={TrendingDown}
            label="Today's Withdrawals"
            value={isLoading ? "..." : `$${summary.todayWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            iconColor="text-red-600"
            bgColor="bg-red-500/10"
            trend="down"
          />
          <MetricCard
            icon={DollarSign}
            label="Net Movement"
            value={isLoading ? "..." : `${summary.netMovement >= 0 ? "+" : ""}$${summary.netMovement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            iconColor={summary.netMovement >= 0 ? "text-emerald-600" : "text-red-600"}
            bgColor={summary.netMovement >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
            trend={summary.netMovement >= 0 ? "up" : "down"}
          />
        </MetricCardSection>

        {/* Recent Adjustments - Mobile Optimized */}
        <Card className="overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-border">
            <h2 className="text-base sm:text-lg font-semibold">Recent Adjustments</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              All agent and admin balance adjustments
            </p>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full min-w-[640px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-2 sm:p-3 font-semibold text-xs">Adjuster</th>
                  <th className="text-left p-2 sm:p-3 font-semibold text-xs">Player</th>
                  <th className="text-left p-2 sm:p-3 font-semibold text-xs">Type</th>
                  <th className="text-left p-2 sm:p-3 font-semibold text-xs">Amount</th>
                  <th className="text-left p-2 sm:p-3 font-semibold text-xs hidden sm:table-cell">Reason</th>
                  <th className="text-left p-2 sm:p-3 font-semibold text-xs">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentAdjustments.length > 0 ? (
                  recentAdjustments.map((adjustment) => (
                    <tr
                      key={adjustment.id}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-2 sm:p-3 font-medium text-xs sm:text-sm">{adjustment.adjuster}</td>
                      <td className="p-2 sm:p-3 text-muted-foreground text-xs sm:text-sm">{adjustment.player}</td>
                      <td className="p-2 sm:p-3">
                        <Badge
                          variant={
                            adjustment.type === "Deposit"
                              ? "default"
                              : adjustment.type === "Withdrawal"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px] sm:text-xs"
                        >
                          {adjustment.type}
                        </Badge>
                      </td>
                      <td className="p-2 sm:p-3 font-semibold text-xs sm:text-sm">${adjustment.amount.toLocaleString()}</td>
                      <td className="p-2 sm:p-3 text-xs text-muted-foreground hidden sm:table-cell">{adjustment.reason}</td>
                      <td className="p-2 sm:p-3 text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(adjustment.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                      No recent adjustments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Adjustment Modal - Mobile Optimized */}
        {showAdjustModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl p-4 sm:p-6 my-auto">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Admin Balance Adjustment</h2>
              
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
