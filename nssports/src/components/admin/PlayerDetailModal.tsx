"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  User,
  DollarSign,
  Ban,
  CheckCircle,
  Activity,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Bet {
  id: string;
  betType: string;
  selection: string;
  odds: number;
  stake: number;
  potentialPayout: number;
  status: string;
  placedAt: string;
  settledAt: string | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  reason: string;
  timestamp: string;
}

interface PlayerDetails {
  id: string;
  username: string;
  displayName: string | null;
  balance: number;
  available: number;
  risk: number;
  status: string;
  totalBets: number;
  totalWagered: number;
  totalWinnings: number;
  totalPendingBets: number;
  registeredAt: string;
  lastLogin: string | null;
  lastBetAt: string | null;
  recentBets: Bet[];
  recentTransactions: Transaction[];
}

interface PlayerDetailModalProps {
  playerId: string | null;
  playerUsername: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (playerId: string, newStatus: string) => void;
}

export function PlayerDetailModal({
  playerId,
  playerUsername,
  isOpen,
  onClose,
  onStatusChange,
}: PlayerDetailModalProps) {
  const [playerDetails, setPlayerDetails] = useState<PlayerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bets" | "transactions">("bets");

  const fetchPlayerDetails = useCallback(async () => {
    if (!playerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/players/${playerId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[PlayerDetailModal] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || 'Failed to fetch player details');
      }

      const data = await response.json();
      setPlayerDetails(data.player);
    } catch (err) {
      console.error('[PlayerDetailModal] Error fetching player details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load player details';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    if (isOpen && playerId) {
      fetchPlayerDetails();
    }
  }, [isOpen, playerId, fetchPlayerDetails]);

  const handleStatusToggle = () => {
    if (playerDetails && onStatusChange) {
      const newStatus = playerDetails.status === 'active' ? 'suspended' : 'active';
      onStatusChange(playerDetails.id, newStatus);
      setPlayerDetails({
        ...playerDetails,
        status: newStatus,
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <User className="w-5 h-5 text-accent" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">Player Details</span>
              {playerUsername && (
                <span className="text-sm font-normal text-muted-foreground">@{playerUsername}</span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-accent/30 border-t-accent"></div>
                <p className="text-sm text-muted-foreground">Loading player details...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-destructive">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                <Ban className="w-6 h-6" />
              </div>
              <p className="font-medium mb-1">{error}</p>
              <Button onClick={fetchPlayerDetails} variant="outline" size="sm" className="mt-3">
                Try Again
              </Button>
            </div>
          ) : playerDetails ? (
            <div className="space-y-5">
              {/* Balance Metrics - More compact and elegant */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-linear-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available</span>
                    <DollarSign className="w-4 h-4 text-accent" />
                  </div>
                  <p className="text-2xl font-bold text-accent">
                    {formatCurrency(playerDetails.available)}
                  </p>
                </div>

                <div className="bg-linear-to-br from-destructive/5 to-destructive/10 border border-destructive/20 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">At Risk</span>
                  </div>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(playerDetails.risk)}
                  </p>
                </div>

                <div className="bg-linear-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(playerDetails.balance)}
                  </p>
                </div>
              </div>

              {/* Status & Actions - More streamlined */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted/10 border border-border/50 rounded-xl">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      playerDetails.status === "active" ? "bg-green-500" : "bg-red-500"
                    )} />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Status</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 text-[11px] font-medium",
                          playerDetails.status === "active" && "border-green-500/50 text-green-600 bg-green-500/5",
                          playerDetails.status === "suspended" && "border-red-500/50 text-red-600 bg-red-500/5"
                        )}
                      >
                        {playerDetails.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-border/50 hidden sm:block" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Member Since</p>
                    <p className="text-xs font-semibold">
                      {formatDate(playerDetails.registeredAt)}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border/50 hidden sm:block" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Last Login</p>
                    <p className="text-xs font-semibold">
                      {formatDate(playerDetails.lastLogin)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleStatusToggle}
                  variant={playerDetails.status === 'active' ? 'destructive' : 'default'}
                  size="sm"
                  className="gap-2 shrink-0"
                >
                  {playerDetails.status === 'active' ? (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      Suspend
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Activate
                    </>
                  )}
                </Button>
              </div>

              {/* Stats Grid - Cleaner with better visual hierarchy */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/10 border border-border/30 rounded-lg p-3 hover:bg-muted/20 transition-colors">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Total Bets</p>
                  <p className="text-2xl font-bold">{playerDetails.totalBets}</p>
                </div>
                <div className="bg-muted/10 border border-border/30 rounded-lg p-3 hover:bg-muted/20 transition-colors">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Pending</p>
                  <p className="text-2xl font-bold text-amber-500">{playerDetails.totalPendingBets}</p>
                </div>
                <div className="bg-muted/10 border border-border/30 rounded-lg p-3 hover:bg-muted/20 transition-colors">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Wagered</p>
                  <p className="text-lg font-bold">{formatCurrency(playerDetails.totalWagered)}</p>
                </div>
                <div className="bg-muted/10 border border-border/30 rounded-lg p-3 hover:bg-muted/20 transition-colors">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Winnings</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(playerDetails.totalWinnings)}</p>
                </div>
              </div>

              {/* Tabs with refined styling */}
              <div className="border border-border/50 rounded-xl overflow-hidden bg-muted/5">
                <TabsList className="grid w-full grid-cols-2 h-11 bg-muted/20 p-0 rounded-none border-b border-border/50">
                  <TabsTrigger 
                    onClick={() => setActiveTab("bets")}
                    data-state={activeTab === "bets" ? "active" : "inactive"}
                    className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none"
                  >
                    <Activity className="w-4 h-4" />
                    <span className="font-medium">Recent Bets</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    onClick={() => setActiveTab("transactions")}
                    data-state={activeTab === "transactions" ? "active" : "inactive"}
                    className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none"
                  >
                    <Receipt className="w-4 h-4" />
                    <span className="font-medium">Transactions</span>
                  </TabsTrigger>
                </TabsList>

              {activeTab === "bets" && (
                <div className="p-4 space-y-2">
                  {playerDetails.recentBets && playerDetails.recentBets.length > 0 ? (
                    playerDetails.recentBets.map((bet) => (
                      <div
                        key={bet.id}
                        className="p-3.5 bg-background border border-border/40 rounded-lg hover:border-border hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-medium h-5 px-2">
                              {bet.betType}
                            </Badge>
                            <Badge
                              variant={
                                bet.status === 'won'
                                  ? 'default'
                                  : bet.status === 'lost'
                                  ? 'destructive'
                                  : 'outline'
                              }
                              className="text-[10px] font-medium h-5 px-2"
                            >
                              {bet.status}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(bet.placedAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-2.5 text-foreground/90">{bet.selection}</p>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/30">
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              Stake: <span className="font-semibold text-foreground">{formatCurrency(bet.stake)}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Odds: <span className="font-semibold text-foreground">
                                {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                              </span>
                            </span>
                          </div>
                          <span className="font-semibold text-xs">
                            {formatCurrency(bet.potentialPayout)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                        <Activity className="w-6 h-6 opacity-40" />
                      </div>
                      <p className="text-sm font-medium">No bets found</p>
                      <p className="text-xs mt-1">This player hasn&apos;t placed any bets yet</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "transactions" && (
                <div className="p-4 space-y-2">
                  {playerDetails.recentTransactions && playerDetails.recentTransactions.length > 0 ? (
                    playerDetails.recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="p-3.5 bg-background border border-border/40 rounded-lg hover:border-border hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold mb-0.5">{transaction.type}</p>
                            {transaction.reason && (
                              <p className="text-xs text-muted-foreground">
                                {transaction.reason}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p
                              className={cn(
                                "text-base font-bold mb-0.5",
                                transaction.amount > 0 ? "text-green-600" : "text-red-600"
                              )}
                            >
                              {transaction.amount > 0 ? "+" : ""}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDate(transaction.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                        <Receipt className="w-6 h-6 opacity-40" />
                      </div>
                      <p className="text-sm font-medium">No transactions found</p>
                      <p className="text-xs mt-1">No recent transaction history available</p>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
