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
      <div className="space-y-4 md:space-y-6" style={{ padding: '15px' }}>
        {/* Header - Sleek & Compact */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Financial Reconciliation</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Daily balance audits and discrepancy detection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs sm:text-sm h-7 sm:h-8 w-36"
            />
            <Button
              onClick={fetchReconciliation}
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 sm:h-8 text-xs"
            >
              <RefreshCw size={12} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-7 sm:h-8 text-xs">
              <Download size={12} />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Reconciliation Status - Compact Horizontal */}
        {data && (
          <>
            {/* Status Banner */}
            <div className={cn(
              "flex items-center justify-between p-3 sm:p-4 rounded-lg border",
              data.reconciliation.hasDiscrepancy
                ? "bg-yellow-500/10 border-yellow-500/30"
                : "bg-emerald-500/10 border-emerald-500/30"
            )}>
              <div className="flex items-center gap-3">
                {data.reconciliation.hasDiscrepancy ? (
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 shrink-0" />
                ) : (
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
                )}
                <div>
                  <h2 className="text-sm sm:text-base font-bold">
                    {data.reconciliation.hasDiscrepancy ? "Discrepancy Detected" : "Books Balanced"}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {data.reconciliation.status}
                  </p>
                </div>
              </div>
              <Badge
                variant={data.reconciliation.hasDiscrepancy ? "destructive" : "default"}
                className={cn(
                  "text-xs",
                  !data.reconciliation.hasDiscrepancy && "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {data.reconciliation.hasDiscrepancy ? "Needs Review" : "Verified"}
              </Badge>
            </div>

            {/* Balance Flow - Horizontal Compact */}
            <div className="flex flex-row items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-accent/40 scrollbar-track-transparent scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Opening */}
              <div className="flex flex-col items-center min-w-[110px] p-3 bg-accent/5 border border-accent/20 rounded-lg">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Opening</p>
                <p className="text-lg font-bold text-accent mt-1">${(data.reconciliation.openingBalance / 1000).toFixed(1)}K</p>
              </div>
              <ArrowRight className="w-4 h-4 text-accent shrink-0" />
              {/* Deposits */}
              <div className="flex flex-col items-center min-w-[100px] p-2.5 bg-emerald-500/10 rounded-lg">
                <p className="text-[10px] font-medium text-emerald-600">+Deposits</p>
                <p className="text-sm font-bold text-emerald-600">${(data.transactionSummary.deposits.amount / 1000).toFixed(1)}K</p>
              </div>
              {/* Withdrawals */}
              <div className="flex flex-col items-center min-w-[100px] p-2.5 bg-red-500/10 rounded-lg">
                <p className="text-[10px] font-medium text-red-600">-Withdrawals</p>
                <p className="text-sm font-bold text-red-600">${(data.transactionSummary.withdrawals.amount / 1000).toFixed(1)}K</p>
              </div>
              {/* Bets */}
              <div className="flex flex-col items-center min-w-[100px] p-2.5 bg-blue-500/10 rounded-lg">
                <p className="text-[10px] font-medium text-blue-600">-Bets</p>
                <p className="text-sm font-bold text-blue-600">${(data.transactionSummary.betsPlaced.amount / 1000).toFixed(1)}K</p>
              </div>
              {/* Wins */}
              <div className="flex flex-col items-center min-w-[100px] p-2.5 bg-amber-500/10 rounded-lg">
                <p className="text-[10px] font-medium text-amber-600">+Wins</p>
                <p className="text-sm font-bold text-amber-600">${(data.transactionSummary.betsWon.amount / 1000).toFixed(1)}K</p>
              </div>
              <ArrowRight className="w-4 h-4 text-accent shrink-0" />
              {/* Expected */}
              <div className="flex flex-col items-center min-w-[110px] p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-[10px] font-semibold text-blue-600 uppercase">Expected</p>
                <p className="text-lg font-bold text-blue-600 mt-1">${(data.reconciliation.closingBalance.expected / 1000).toFixed(1)}K</p>
              </div>
              {/* Actual */}
              <div className="flex flex-col items-center min-w-[110px] p-3 bg-accent/5 border border-accent/20 rounded-lg">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Actual</p>
                <p className="text-lg font-bold text-accent mt-1">${(data.reconciliation.closingBalance.actual / 1000).toFixed(1)}K</p>
              </div>
              {/* Discrepancy */}
              <div className={cn(
                "flex flex-col items-center min-w-[110px] p-3 border rounded-lg",
                data.reconciliation.hasDiscrepancy
                  ? "bg-yellow-500/10 border-yellow-500/50"
                  : "bg-emerald-500/10 border-emerald-500/50"
              )}>
                <p className={cn(
                  "text-[10px] font-semibold uppercase",
                  data.reconciliation.hasDiscrepancy ? "text-yellow-600" : "text-emerald-600"
                )}>
                  Variance
                </p>
                <p className={cn(
                  "text-lg font-bold mt-1",
                  data.reconciliation.hasDiscrepancy ? "text-yellow-600" : "text-emerald-600"
                )}>
                  ${Math.abs(data.reconciliation.discrepancy).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

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
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Agent Adjustments Breakdown
                  </h3>
                </div>
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-accent/40 scrollbar-track-transparent scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-2 sm:p-2.5 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Agent
                        </th>
                        <th className="text-left p-2 sm:p-2.5 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Transactions
                        </th>
                        <th className="text-left p-2 sm:p-2.5 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Total Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.agentAdjustments.map((agent, idx) => (
                        <tr key={idx} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="p-2 sm:p-2.5">
                            <div>
                              <p className="font-medium text-[10px] sm:text-xs">
                                {agent.agentUsername}
                              </p>
                              {agent.agentDisplayName && (
                                <p className="text-[9px] sm:text-[10px] text-muted-foreground/70">
                                  {agent.agentDisplayName}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-2 sm:p-2.5 text-[10px] sm:text-xs">
                            {agent.transactionCount}
                          </td>
                          <td className="p-2 sm:p-2.5 text-[10px] sm:text-xs font-semibold">
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
              <div className="flex items-start gap-2.5 p-3 sm:p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="text-xs sm:text-sm font-semibold mb-2">
                    Unusual Activity Detected
                  </h3>
                  <div className="space-y-1.5">
                    {data.unusualPatterns.map((pattern, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-background/50 p-2 rounded border border-border/30 flex items-start gap-2"
                      >
                        <Badge
                          variant="outline"
                          className="text-[9px] sm:text-[10px] h-4 shrink-0"
                        >
                          {pattern.severity}
                        </Badge>
                        <p className="text-[10px] sm:text-xs text-muted-foreground/70 flex-1">
                          {pattern.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Large Transactions - Compact Table */}
            {data.largeTransactions.length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Large Transactions ($1,000+)
                  </h3>
                  <Badge variant="secondary" className="text-[10px] h-5 px-2 w-fit">
                    {data.largeTransactions.length} transactions
                  </Badge>
                </div>
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-accent/40 scrollbar-track-transparent scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-2 sm:p-2.5 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="text-left p-2 sm:p-2.5 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="text-left p-2 sm:p-2.5 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Player
                        </th>
                        <th className="text-left p-2 sm:p-2.5 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Agent
                        </th>
                        <th className="text-left p-2 sm:p-2.5 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.largeTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="p-2 sm:p-2.5 text-[9px] sm:text-[10px] text-muted-foreground/70 whitespace-nowrap">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="p-2 sm:p-2.5">
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] h-4">
                              {tx.type}
                            </Badge>
                          </td>
                          <td className="p-2 sm:p-2.5 text-[10px] sm:text-xs font-medium">
                            {tx.playerUsername}
                          </td>
                          <td className="p-2 sm:p-2.5 text-[9px] sm:text-[10px] text-muted-foreground/70">
                            {tx.agentUsername}
                          </td>
                          <td className="p-2 sm:p-2.5 text-[10px] sm:text-xs font-bold">
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
