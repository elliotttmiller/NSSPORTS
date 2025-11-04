"use client";

import { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MetricCard, MetricCardSection } from "@/components/ui/metric-card";
import {
  AlertTriangle,
  CheckCircle,
  Calendar,
  RefreshCw,
  Download,
  ArrowRight,
  Plus,
  Minus,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { handleAuthError } from "@/lib/clientAuthHelpers";

interface ReconciliationData {
  date: string;
  reconciliation: {
    openingBalance: number;
    closingBalance: {
      expected: number;
      actual: number;
    };
    discrepancy: number;
    hasDiscrepancy: boolean;
    status: string;
  };
  transactionSummary: {
    deposits: { amount: number; count: number };
    withdrawals: { amount: number; count: number };
    betsPlaced: { amount: number; count: number };
    betsWon: { amount: number; count: number };
    adjustments: {
      inflow: number;
      inflowCount: number;
      outflow: number;
      outflowCount: number;
    };
  };
  agentAdjustments: Array<{
    agentUsername: string;
    agentDisplayName: string | null;
    totalAmount: number;
    transactionCount: number;
  }>;
  largeTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    playerUsername: string;
    agentUsername: string;
    timestamp: string;
  }>;
  unusualPatterns: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}

export default function ReconciliationPage() {
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchReconciliation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/reconciliation?date=${selectedDate}`
      );
      if (!response.ok) {
        // Handle authentication errors (401/403) - redirects if needed
        if (handleAuthError(response)) {
          toast.error(response.status === 401 ? "Session expired. Redirecting to login..." : "You don't have permission to view reconciliation data.");
          return;
        }
        toast.error("Failed to load reconciliation data");
        return;
      }
      const reconciliationData = await response.json();
      setData(reconciliationData);
    } catch (error) {
      console.error("Reconciliation fetch error:", error);
      toast.error("Failed to load reconciliation data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading reconciliation...</p>
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
            <h1 className="text-xl font-bold text-foreground">Financial Reconciliation</h1>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10 text-sm h-8"
                />
              </div>
              <Button
                onClick={fetchReconciliation}
                variant="outline"
                size="sm"
                className="gap-1.5 h-8"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Daily balance audits and discrepancy detection
          </p>
        </div>

        {/* Reconciliation Status - Compact Professional Card */}
        {data && (
          <>
            <Card
              className={cn(
                "overflow-hidden border-2",
                data.reconciliation.hasDiscrepancy
                  ? "border-yellow-500/50"
                  : "border-emerald-500/50"
              )}
            >
              {/* Header Section - Compact */}
              <div
                className={cn(
                  "px-4 py-3 border-b",
                  data.reconciliation.hasDiscrepancy
                    ? "bg-yellow-500/10 border-yellow-500/20"
                    : "bg-emerald-500/10 border-emerald-500/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {data.reconciliation.hasDiscrepancy ? (
                      <div className="w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-base font-bold text-foreground">
                        {data.reconciliation.hasDiscrepancy
                          ? "Discrepancy Detected"
                          : "Books Balanced"}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {data.reconciliation.status}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      data.reconciliation.hasDiscrepancy
                        ? "destructive"
                        : "default"
                    }
                    className={cn(
                      "text-xs px-2.5 py-0.5",
                      !data.reconciliation.hasDiscrepancy &&
                        "bg-emerald-600 hover:bg-emerald-700"
                    )}
                  >
                    {data.reconciliation.hasDiscrepancy
                      ? "Needs Review"
                      : "Verified"}
                  </Badge>
                </div>
              </div>

              {/* Balance Flow Visualization - Compact */}
              <div className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Opening Balance */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      Opening Balance
                    </p>
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                      <p className="text-2xl font-bold text-foreground">
                        ${data.reconciliation.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        Previous day closing
                      </p>
                    </div>
                  </div>

                  {/* Transaction Flow */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      Daily Activity
                    </p>
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 space-y-1.5">
                      {/* Inflows */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <Plus size={11} />
                          Deposits
                        </span>
                        <span className="font-semibold text-foreground">
                          ${data.transactionSummary.deposits.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <Plus size={11} />
                          Bets Won
                        </span>
                        <span className="font-semibold text-foreground">
                          ${data.transactionSummary.betsWon.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <Plus size={11} />
                          Adjustments In
                        </span>
                        <span className="font-semibold text-foreground">
                          ${data.transactionSummary.adjustments.inflow.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="h-px bg-border my-1.5" />
                      
                      {/* Outflows */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-red-600 font-medium flex items-center gap-1">
                          <Minus size={11} />
                          Withdrawals
                        </span>
                        <span className="font-semibold text-foreground">
                          ${data.transactionSummary.withdrawals.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-red-600 font-medium flex items-center gap-1">
                          <Minus size={11} />
                          Bets Placed
                        </span>
                        <span className="font-semibold text-foreground">
                          ${data.transactionSummary.betsPlaced.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-red-600 font-medium flex items-center gap-1">
                          <Minus size={11} />
                          Adjustments Out
                        </span>
                        <span className="font-semibold text-foreground">
                          ${data.transactionSummary.adjustments.outflow.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="h-px bg-border my-1.5" />
                      
                      {/* Net Flow Arrow */}
                      <div className="flex items-center justify-center pt-0.5">
                        <ArrowRight className="w-4 h-4 text-accent" />
                      </div>
                    </div>
                  </div>

                  {/* Closing Balance & Verification */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      Closing Balance
                    </p>
                    <div className="space-y-2">
                      {/* Expected */}
                      <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
                        <p className="text-[10px] text-blue-600 font-semibold mb-1 uppercase tracking-wide">
                          EXPECTED (Calculated)
                        </p>
                        <p className="text-xl font-bold text-blue-600">
                          ${data.reconciliation.closingBalance.expected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      {/* Actual */}
                      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                        <p className="text-[10px] text-muted-foreground font-semibold mb-1 uppercase tracking-wide">
                          ACTUAL (Database)
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          ${data.reconciliation.closingBalance.actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      {/* Discrepancy */}
                      <div
                        className={cn(
                          "rounded-lg p-3 border-2",
                          data.reconciliation.hasDiscrepancy
                            ? "bg-yellow-500/10 border-yellow-500/50"
                            : "bg-emerald-500/10 border-emerald-500/50"
                        )}
                      >
                        <p
                          className={cn(
                            "text-[10px] font-semibold mb-1 uppercase tracking-wide",
                            data.reconciliation.hasDiscrepancy
                              ? "text-yellow-600"
                              : "text-emerald-600"
                          )}
                        >
                          Discrepancy
                        </p>
                        <p
                          className={cn(
                            "text-2xl font-bold",
                            data.reconciliation.hasDiscrepancy
                              ? "text-yellow-600"
                              : "text-emerald-600"
                          )}
                        >
                          ${Math.abs(data.reconciliation.discrepancy).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {data.reconciliation.hasDiscrepancy
                            ? "Review required"
                            : "All transactions reconciled"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reconciliation Formula Footer - Compact */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground/70">
                    <code className="bg-muted px-2 py-1 rounded font-mono">
                      Expected Closing = Opening + Deposits + Wins + Adj.In - Withdrawals - Bets - Adj.Out
                    </code>
                  </div>
                </div>
              </div>
            </Card>

            {/* Transaction Summary - Modern, sleek icon design */}
            <MetricCardSection title="Transaction Summary">
              <MetricCard
                icon={ArrowDownCircle}
                label="Deposits"
                value={`$${data.transactionSummary.deposits.amount.toLocaleString()}`}
                iconColor="text-emerald-600"
                bgColor="bg-emerald-500/10"
              />
              <MetricCard
                icon={ArrowUpCircle}
                label="Withdrawals"
                value={`$${data.transactionSummary.withdrawals.amount.toLocaleString()}`}
                iconColor="text-red-600"
                bgColor="bg-red-500/10"
              />
              <MetricCard
                icon={TrendingDown}
                label="Bets Placed"
                value={`$${data.transactionSummary.betsPlaced.amount.toLocaleString()}`}
                iconColor="text-blue-600"
                bgColor="bg-blue-500/10"
              />
              <MetricCard
                icon={TrendingUp}
                label="Bets Won"
                value={`$${data.transactionSummary.betsWon.amount.toLocaleString()}`}
                iconColor="text-amber-600"
                bgColor="bg-amber-500/10"
              />
              <MetricCard
                icon={Plus}
                label="Adjustments In"
                value={`$${data.transactionSummary.adjustments.inflow.toLocaleString()}`}
                iconColor="text-emerald-600"
                bgColor="bg-emerald-500/10"
              />
              <MetricCard
                icon={Minus}
                label="Adjustments Out"
                value={`$${data.transactionSummary.adjustments.outflow.toLocaleString()}`}
                iconColor="text-red-600"
                bgColor="bg-red-500/10"
              />
            </MetricCardSection>

            {/* Agent Adjustments - Compact Table */}
            {data.agentAdjustments.length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-3 border-b border-border">
                  <h3 className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Agent Adjustments Breakdown
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Agent
                        </th>
                        <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Transactions
                        </th>
                        <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Total Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.agentAdjustments.map((agent, idx) => (
                        <tr key={idx} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="p-2.5">
                            <div>
                              <p className="font-medium text-xs text-foreground">
                                {agent.agentUsername}
                              </p>
                              {agent.agentDisplayName && (
                                <p className="text-[10px] text-muted-foreground/70">
                                  {agent.agentDisplayName}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-xs text-foreground">
                            {agent.transactionCount}
                          </td>
                          <td className="p-2.5 text-xs font-semibold text-foreground">
                            ${agent.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Unusual Patterns Alert - Compact */}
            {data.unusualPatterns.length > 0 && (
              <Card className="p-3 border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-xs font-semibold text-foreground mb-2">
                      Unusual Activity Detected
                    </h3>
                    <div className="space-y-1.5">
                      {data.unusualPatterns.map((pattern, idx) => (
                        <div
                          key={idx}
                          className="text-xs bg-background/50 p-2 rounded border border-border/30"
                        >
                          <Badge
                            variant="outline"
                            className="mb-1 text-[10px] h-4"
                          >
                            {pattern.severity}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground/70">
                            {pattern.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Large Transactions - Compact Table */}
            {data.largeTransactions.length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Large Transactions ($1,000+)
                  </h3>
                  <Badge variant="secondary" className="text-[10px] h-5 px-2">
                    {data.largeTransactions.length} transactions
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Player
                        </th>
                        <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Agent
                        </th>
                        <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.largeTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="p-2.5 text-[10px] text-muted-foreground/70">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px] h-4">
                              {tx.type}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-xs font-medium text-foreground">
                            {tx.playerUsername}
                          </td>
                          <td className="p-2.5 text-[10px] text-muted-foreground/70">
                            {tx.agentUsername}
                          </td>
                          <td className="p-2.5 text-xs font-bold text-foreground">
                            ${tx.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
