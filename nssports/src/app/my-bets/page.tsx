"use client";
import { useBetHistory, useRefresh } from "@/context";
import type { PlacedBet } from "@/context/BetHistoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { BetCardParlay, BetCardSingle, BetCardTeaser } from "@/components/bets/BetCard";
import type { BetLeg } from "@/components/bets/BetCard";
import { MobileParlayBetCard } from "@/components/features/mobile/MobileParlayBetCard";
import { useCallback, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks";

export default function MyBetsPage() {
  const { placedBets, loading, refreshBetHistory } = useBetHistory();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMobile = useIsMobile();
  const { registerRefreshHandler, unregisterRefreshHandler } = useRefresh();

  useEffect(() => {
    // mark last updated whenever data changes
    if (Array.isArray(placedBets)) setLastUpdated(new Date());
  }, [placedBets]);

  const doRefresh = useCallback(async () => {
    console.log('[MyBetsPage] 🔄 Manual refresh triggered');
    await refreshBetHistory();
    setLastUpdated(new Date());
  }, [refreshBetHistory]);

  // Register refresh handler for pull-to-refresh
  useEffect(() => {
    registerRefreshHandler(doRefresh);
    return () => unregisterRefreshHandler();
  }, [registerRefreshHandler, unregisterRefreshHandler, doRefresh]);
  
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
      <div className="container mx-auto px-2 md:px-8 xl:px-12 pb-6 max-w-screen-2xl md:pt-6" style={{ paddingTop: '40px' }}>
        <div className="space-y-6">
          {/* Active Bets Section */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-xl font-semibold">Active Bets</CardTitle>
                  {lastUpdated && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {activeBets.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No active bets</div>
                ) : (
                  <div className="space-y-4">
                    {activeBets.map((bet: PlacedBet) => {
                      const betType = typeof bet.betType === "string" ? bet.betType : "single";
                      
                      // Handle teaser bets
                      if (betType === "teaser" && bet.legs && Array.isArray(bet.legs)) {
                        return (
                          <BetCardTeaser
                            key={bet.id}
                            id={bet.id}
                            betType={betType}
                            placedAt={bet.placedAt}
                            status={bet.status}
                            stake={bet.stake}
                            payout={bet.potentialPayout}
                            legs={(bet.legs as unknown as BetLeg[]) || []}
                            teaserType={bet.teaserType}
                            teaserMetadata={bet.teaserMetadata}
                          />
                        );
                      }
                      
                      // Handle parlay bets
                      if (betType === "parlay" && bet.legs && Array.isArray(bet.legs)) {
                        // Use mobile-optimized parlay card on mobile, desktop card on desktop
                        return isMobile ? (
                          <MobileParlayBetCard
                            key={bet.id}
                            bet={bet}
                          />
                        ) : (
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
                      
                      // Handle single bets
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

            {/* Bet History Section */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="text-xl font-semibold">My Bet History</CardTitle>
                  {lastUpdated && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {settledBets.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">Not available</div>
                ) : (
                  <div className="space-y-4">
                    {settledBets.map((bet: PlacedBet) => {
                      const betType = typeof bet.betType === "string" ? bet.betType : "single";
                      
                      // Handle teaser bets
                      if (betType === "teaser" && bet.legs && Array.isArray(bet.legs)) {
                        return (
                          <BetCardTeaser
                            key={bet.id}
                            id={bet.id}
                            betType={betType}
                            placedAt={bet.placedAt}
                            status={bet.status}
                            stake={bet.stake}
                            payout={bet.potentialPayout}
                            legs={(bet.legs as unknown as BetLeg[]) || []}
                            teaserType={bet.teaserType}
                            teaserMetadata={bet.teaserMetadata}
                          />
                        );
                      }
                      
                      // Handle parlay bets
                      if (betType === "parlay" && bet.legs && Array.isArray(bet.legs)) {
                        // Use mobile-optimized parlay card on mobile, desktop card on desktop
                        return isMobile ? (
                          <MobileParlayBetCard
                            key={bet.id}
                            bet={bet}
                          />
                        ) : (
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
                      
                      // Handle single bets
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
      </div>
  );
}
