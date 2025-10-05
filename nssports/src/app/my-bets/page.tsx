"use client";
import { useBetHistory } from "@/context";
import type { PlacedBet } from "@/context/BetHistoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { BetCardParlay, BetCardSingle } from "@/components/bets/BetCard";
import type { BetLeg } from "@/components/bets/BetCard";

export default function MyBetsPage() {
  // Mobile detection (reuse hook if available)
  const isMobile = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
  const { placedBets, loading } = useBetHistory();
  
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
            <Card className="lg:hover:shadow-none lg:hover:translate-y-0 lg:hover:scale-100 lg:active:scale-100 lg:cursor-default">
              <CardHeader className="pb-4 lg:pt-4 lg:pb-3">
                <CardTitle className="text-xl font-semibold">Active Bets</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center text-muted-foreground py-8">
                  <div className="animate-pulse">Loading...</div>
                </div>
              </CardContent>
            </Card>
            <Card className="lg:hover:shadow-none lg:hover:translate-y-0 lg:hover:scale-100 lg:active:scale-100 lg:cursor-default">
              <CardHeader className="pb-4 lg:pt-4 lg:pb-3">
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
      <div className="container mx-auto px-6 md:px-8 xl:px-12 pt-12 pb-6 max-w-screen-2xl">
        <div className={isMobile ? "space-y-6 pointer-events-none" : "space-y-6"}>
          {/* Active Bets Section - Using shared BetCard */}
          <Card className="lg:hover:shadow-none lg:hover:translate-y-0 lg:hover:scale-100 lg:active:scale-100 lg:cursor-default">
            <CardHeader className="pb-4 lg:pt-4 lg:pb-3">
              <CardTitle className="text-xl font-semibold">Active Bets</CardTitle>
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
                        displaySelection={bet.displaySelection}
                        odds={bet.odds}
                        line={bet.line}
                        stake={bet.stake}
                        payout={bet.potentialPayout}
                        game={bet.game}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bet History Section - Using shared BetCard */}
          <Card className="lg:hover:shadow-none lg:hover:translate-y-0 lg:hover:scale-100 lg:active:scale-100 lg:cursor-default">
            <CardHeader className="pb-4 lg:pt-4 lg:pb-3">
              <CardTitle className="text-xl font-semibold">My Bet History</CardTitle>
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
                        displaySelection={bet.displaySelection}
                        odds={bet.odds}
                        line={bet.line}
                        stake={bet.stake}
                        payout={bet.potentialPayout}
                        game={bet.game}
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
