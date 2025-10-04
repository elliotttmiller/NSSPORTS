"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge } from "@/components/ui";
import { formatCurrency, formatOdds } from "@/lib/formatters";
import { useBetHistory } from "@/context";
import { useMemo } from "react";

export default function MyBetsPage() {
  const { placedBets } = useBetHistory();

  // Mock betting history combined with placed bets
  const betHistory = useMemo(() => {
    const mockHistory = [
      {
        id: "mock-1",
        date: "2025-01-15",
        type: "parlay" as const,
        bets: [
          { team: "Lakers", selection: "Spread -3.5", odds: -110 },
          { team: "Warriors", selection: "Over 220.5", odds: -110 },
        ],
        stake: 20,
        payout: 52.73,
        profit: 32.73,
        status: "won" as const,
      },
      {
        id: "mock-2",
        date: "2025-01-14",
        type: "single" as const,
        bets: [{ team: "Celtics", selection: "Moneyline", odds: -170 }],
        stake: 17,
        payout: 0,
        profit: -17,
        status: "lost" as const,
      },
      {
        id: "mock-3",
        date: "2025-01-14",
        type: "single" as const,
        bets: [{ team: "Heat", selection: "Spread +2.5", odds: -110 }],
        stake: 10,
        payout: 19.09,
        profit: 9.09,
        status: "won" as const,
      },
    ];

    // Combine placed bets with mock history
    return [...placedBets, ...mockHistory];
  }, [placedBets]);

  const stats = useMemo(() => {
    const totalBets = betHistory.length;
    const wonBets = betHistory.filter((bet) => bet.status === "won").length;
    const winRate = totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0;
    const totalWagered = betHistory.reduce((sum, bet) => sum + bet.stake, 0);
    const totalWon = betHistory
      .filter((bet) => bet.status === "won")
      .reduce((sum, bet) => sum + bet.profit, 0);

    return {
      totalBets,
      winRate,
      totalWagered,
      totalWon,
    };
  }, [betHistory]);

  return (
    <div className="p-6 pb-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">My Bets</h1>
          <p className="text-muted-foreground mt-1">
            Track your betting history and active bets
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Bets</div>
              <div className="text-2xl font-bold mt-1">{stats.totalBets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold mt-1">{stats.winRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Wagered</div>
              <div className="text-2xl font-bold mt-1">
                {formatCurrency(stats.totalWagered)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Won</div>
              <div className="text-2xl font-bold mt-1 text-win">
                +{formatCurrency(stats.totalWon)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Bets */}
        <Card>
          <CardHeader>
            <CardTitle>Active Bets ({placedBets.filter(bet => bet.status === "pending").length})</CardTitle>
          </CardHeader>
          <CardContent>
            {placedBets.filter(bet => bet.status === "pending").length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active bets. Place a bet to get started!
              </div>
            ) : (
              <div className="space-y-3">
                {placedBets
                  .filter(bet => bet.status === "pending")
                  .map((bet) => (
                    <div
                      key={bet.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">
                            {bet.type.toUpperCase()}
                          </Badge>
                          {bet.type === "parlay" && bet.totalOdds && (
                            <Badge variant="default" className="text-xs">
                              {formatOdds(bet.totalOdds)}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          {bet.bets.map((b, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium">{b.team}</span> •{" "}
                              {b.selection.replace(/moneyline|spread|total/gi, (match) => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase())} ({formatOdds(b.odds)})
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-medium">
                          Stake: {formatCurrency(bet.stake)}
                        </div>
                        <div className="text-sm text-accent">
                          To Win: {formatCurrency(bet.profit)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bet History */}
        <Card>
          <CardHeader>
            <CardTitle>Bet History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {betHistory.map((bet) => (
                <div
                  key={bet.id}
                  className="flex flex-col md:flex-row md:items-start md:justify-between p-4 border border-border rounded-lg bg-background"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant={bet.status === "won" ? "default" : "outline"}>
                        {bet.type.toUpperCase()}
                      </Badge>
                      <Badge
                        variant={bet.status === "won" ? "default" : "destructive"}
                        className={
                          bet.status === "won"
                            ? "bg-win text-white"
                            : "bg-loss text-white"
                        }
                      >
                        {bet.status.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(bet.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {bet.bets.map((b, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{b.team}</span> • {b.selection} ({formatOdds(b.odds)})
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0 md:ml-4 text-left min-w-[120px]">
                    <div className="text-sm text-muted-foreground">
                      Stake: {formatCurrency(bet.stake)}
                    </div>
                    {bet.status === "won" && (
                      <>
                        <div className="text-sm">
                          Payout: {formatCurrency(bet.payout)}
                        </div>
                        <div className="font-bold text-win">
                          +{formatCurrency(bet.profit)}
                        </div>
                      </>
                    )}
                    {bet.status === "lost" && (
                      <div className="font-bold text-loss">
                        {formatCurrency(bet.profit)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
