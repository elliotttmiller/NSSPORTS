"use client";

import { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      if (response.ok) {
        const reconciliationData = await response.json();
        setData(reconciliationData);
      } else {
        toast.error("Failed to load reconciliation data");
      }
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
      <div className="space-y-4 w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Financial Reconciliation
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Daily balance audits and discrepancy detection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            <Button
              onClick={fetchReconciliation}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download size={14} />
              Export
            </Button>
          </div>
        </div>

        {/* Reconciliation Status */}
        {data && (
          <>
            <Card
              className={cn(
                "p-6 border-2",
                data.reconciliation.hasDiscrepancy
                  ? "border-yellow-500/50 bg-yellow-500/5"
                  : "border-green-500/50 bg-green-500/5"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {data.reconciliation.hasDiscrepancy ? (
                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  )}
                  <div>
                    <h2 className="text-lg font-bold">
                      {data.reconciliation.hasDiscrepancy
                        ? "Discrepancy Detected"
                        : "Books Balanced"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Status: {data.reconciliation.status}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    data.reconciliation.hasDiscrepancy
                      ? "destructive"
                      : "default"
                  }
                  className="text-xs"
                >
                  {data.reconciliation.hasDiscrepancy
                    ? "Needs Review"
                    : "Verified"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Opening Balance
                  </p>
                  <p className="text-2xl font-bold">
                    ${data.reconciliation.openingBalance.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Expected Closing
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${data.reconciliation.closingBalance.expected.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Actual Closing
                  </p>
                  <p className="text-2xl font-bold">
                    ${data.reconciliation.closingBalance.actual.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Discrepancy
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      data.reconciliation.hasDiscrepancy
                        ? "text-yellow-600"
                        : "text-green-600"
                    )}
                  >
                    ${Math.abs(data.reconciliation.discrepancy).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            {/* Transaction Summary */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Transaction Summary
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <Badge variant="secondary" className="text-xs">
                      {data.transactionSummary.deposits.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Deposits</p>
                  <p className="text-xl font-bold text-green-600">
                    +${data.transactionSummary.deposits.amount.toLocaleString()}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <Badge variant="secondary" className="text-xs">
                      {data.transactionSummary.withdrawals.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Withdrawals</p>
                  <p className="text-xl font-bold text-red-600">
                    -${data.transactionSummary.withdrawals.amount.toLocaleString()}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    <Badge variant="secondary" className="text-xs">
                      {data.transactionSummary.betsPlaced.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Bets Placed</p>
                  <p className="text-xl font-bold">
                    ${data.transactionSummary.betsPlaced.amount.toLocaleString()}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <Badge variant="secondary" className="text-xs">
                      {data.transactionSummary.betsWon.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Bets Won</p>
                  <p className="text-xl font-bold text-emerald-600">
                    +${data.transactionSummary.betsWon.amount.toLocaleString()}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <Badge variant="secondary" className="text-xs">
                      {data.transactionSummary.adjustments.inflowCount}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Adjustments In
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    +${data.transactionSummary.adjustments.inflow.toLocaleString()}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                    <Badge variant="secondary" className="text-xs">
                      {data.transactionSummary.adjustments.outflowCount}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Adjustments Out
                  </p>
                  <p className="text-xl font-bold text-orange-600">
                    -${data.transactionSummary.adjustments.outflow.toLocaleString()}
                  </p>
                </Card>
              </div>
            </div>

            {/* Agent Adjustments */}
            {data.agentAdjustments.length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-sm">
                    Agent Adjustments Breakdown
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold">
                          Agent
                        </th>
                        <th className="text-left p-3 text-xs font-semibold">
                          Transactions
                        </th>
                        <th className="text-left p-3 text-xs font-semibold">
                          Total Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.agentAdjustments.map((agent, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/20">
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-sm">
                                {agent.agentUsername}
                              </p>
                              {agent.agentDisplayName && (
                                <p className="text-xs text-muted-foreground">
                                  {agent.agentDisplayName}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            {agent.transactionCount}
                          </td>
                          <td className="p-3 text-sm font-semibold">
                            ${agent.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Unusual Patterns Alert */}
            {data.unusualPatterns.length > 0 && (
              <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-2">
                      Unusual Activity Detected
                    </h3>
                    <div className="space-y-2">
                      {data.unusualPatterns.map((pattern, idx) => (
                        <div
                          key={idx}
                          className="text-xs bg-background/50 p-2 rounded"
                        >
                          <Badge
                            variant="outline"
                            className="mb-1 text-[10px]"
                          >
                            {pattern.severity}
                          </Badge>
                          <p className="text-muted-foreground">
                            {pattern.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Large Transactions */}
            {data.largeTransactions.length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    Large Transactions ($1,000+)
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {data.largeTransactions.length} transactions
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold">
                          Time
                        </th>
                        <th className="text-left p-3 text-xs font-semibold">
                          Type
                        </th>
                        <th className="text-left p-3 text-xs font-semibold">
                          Player
                        </th>
                        <th className="text-left p-3 text-xs font-semibold">
                          Agent
                        </th>
                        <th className="text-left p-3 text-xs font-semibold">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.largeTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b hover:bg-muted/20">
                          <td className="p-3 text-xs">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {tx.type}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm font-medium">
                            {tx.playerUsername}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {tx.agentUsername}
                          </td>
                          <td className="p-3 text-sm font-bold">
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
