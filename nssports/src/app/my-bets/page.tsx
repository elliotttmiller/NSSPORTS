"use client";
import { useBetHistory } from "@/context";
import type { PlacedBet } from "@/context/BetHistoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { BetCardParlay, BetCardSingle } from "@/components/bets/BetCard";
import type { BetLeg } from "@/components/bets/BetCard";
import { useCallback, useEffect, useState } from "react";

export default function MyBetsPage() {
  const { placedBets, loading, refreshBetHistory } = useBetHistory();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // mark last updated whenever data changes
    if (Array.isArray(placedBets)) setLastUpdated(new Date());
  }, [placedBets]);

  const doRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refreshBetHistory();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshBetHistory]);
  
  // Ensure all bets are API-driven, no fallback/hardcoded data
  const betHistory: PlacedBet[] = Array.isArray(placedBets) ? placedBets : [];
  const activeBets = betHistory.filter((bet) => bet.status === "pending");
  const settledBets = betHistory.filter((bet) => bet.status === "won" || bet.status === "lost");

  // Loading state
  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-6 md:px-8 xl:px-12 pt-12 pb-6 max-w-screen-2xl">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold">Active Bets</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center text-muted-foreground py-8">
                  <div className="animate-pulse">Loading...</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold">My Bet History</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center text-muted-foreground py-8">
                  <div className="animate-pulse">Loading...</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-2 md:px-8 xl:px-12 pt-12 pb-6 max-w-screen-2xl"> {/* px-2 for mobile, wider cards */}
        <div className={"space-y-6"}>
          {/* Active Bets Section - Using shared BetCard */}
          <Card>
            <CardHeader className="pb-4 flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">Active Bets</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ""}
                </span>
                <Button size="sm" variant="outline" onClick={doRefresh} disabled={isRefreshing} aria-busy={isRefreshing} aria-live="polite">
                  {isRefreshing ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {activeBets.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No active bets</div>
              ) : (
                <div className="space-y-4">
                  {activeBets.map((bet: PlacedBet) => {
                    const betType = typeof bet.betType === "string" ? bet.betType : "single";
                    if (betType === "parlay" && bet.legs && Array.isArray(bet.legs)) {
                      return (
                        <BetCardParlay
                          key={bet.id}
                          id={bet.id}
                          betType={betType}
                          placedAt={bet.placedAt}
                          status={bet.status}
                          stake={bet.stake}
                          payout={bet.potentialPayout}
                          legs={(bet.legs as unknown as BetLeg[]) || []}
                        />
                      );
                    }
                    return (
                      <BetCardSingle
                        key={bet.id}
                        id={bet.id}
                        betType={betType}
                        placedAt={bet.placedAt}
                        status={bet.status}
                        selection={bet.selection}
                        odds={bet.odds}
                        line={bet.line}
                        stake={bet.stake}
                        payout={bet.potentialPayout}
                        game={bet.game}
                        playerProp={bet.playerProp}
                        gameProp={bet.gameProp}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bet History Section - Using shared BetCard */}
          <Card>
            <CardHeader className="pb-4 flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">My Bet History</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ""}
                </span>
                <Button size="sm" variant="outline" onClick={doRefresh} disabled={isRefreshing} aria-busy={isRefreshing}>
                  {isRefreshing ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {settledBets.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">Not available</div>
              ) : (
                <div className="space-y-4">
                  {settledBets.map((bet: PlacedBet) => {
                    const betType = typeof bet.betType === "string" ? bet.betType : "single";
                    if (betType === "parlay" && bet.legs && Array.isArray(bet.legs)) {
                      return (
                        <BetCardParlay
                          key={bet.id}
                          id={bet.id}
                          betType={betType}
                          placedAt={bet.placedAt}
                          status={bet.status}
                          stake={bet.stake}
                          payout={bet.potentialPayout}
                          legs={(bet.legs as unknown as BetLeg[]) || []}
                        />
                      );
                    }
                    return (
                      <BetCardSingle
                        key={bet.id}
                        id={bet.id}
                        betType={betType}
                        placedAt={bet.placedAt}
                        status={bet.status}
                        selection={bet.selection}
                        odds={bet.odds}
                        line={bet.line}
                        stake={bet.stake}
                        payout={bet.potentialPayout}
                        game={bet.game}
                        playerProp={bet.playerProp}
                        gameProp={bet.gameProp}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile floating refresh button */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Button size="lg" variant="default" onClick={doRefresh} disabled={isRefreshing} className="shadow-lg">
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
    </div>
  );
}
