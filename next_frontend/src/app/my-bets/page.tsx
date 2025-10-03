"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge } from "@/components/ui";
import { formatCurrency, formatOdds } from "@/lib/formatters";
import { useBetSlip } from "@/hooks";

export default function MyBetsPage() {
  const { betSlip } = useBetSlip();

  // Mock betting history
  const betHistory = [
    {
      id: "1",
      date: "2025-01-15",
      type: "Parlay",
      bets: [
        { team: "Lakers", selection: "Spread -3.5", odds: -110 },
        { team: "Warriors", selection: "Over 220.5", odds: -110 },
      ],
      stake: 20,
      payout: 52.73,
      profit: 32.73,
      status: "won",
    },
    {
      id: "2",
      date: "2025-01-14",
      type: "Single",
      bets: [{ team: "Celtics", selection: "Moneyline", odds: -170 }],
      stake: 17,
      payout: 0,
      profit: -17,
      status: "lost",
    },
    {
      id: "3",
      date: "2025-01-14",
      type: "Single",
      bets: [{ team: "Heat", selection: "Spread +2.5", odds: -110 }],
      stake: 10,
      payout: 19.09,
      profit: 9.09,
      status: "won",
    },
  ];

  const stats = {
    totalBets: betHistory.length,
    winRate: 67,
    totalWagered: betHistory.reduce((sum, bet) => sum + bet.stake, 0),
    totalWon: betHistory
      .filter((bet) => bet.status === "won")
      .reduce((sum, bet) => sum + bet.profit, 0),
  };

  return (
    <div className="h-full overflow-y-auto p-6">
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
            <CardTitle>Active Bets ({betSlip.bets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {betSlip.bets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active bets. Place a bet to get started!
              </div>
            ) : (
              <div className="space-y-3">
                {betSlip.bets.map((bet) => (
                  <div
                    key={bet.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {bet.game.awayTeam.shortName} @ {bet.game.homeTeam.shortName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {bet.selection} • {formatOdds(bet.odds)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        Stake: {formatCurrency(bet.stake)}
                      </div>
                      <div className="text-sm text-accent">
                        To Win: {formatCurrency(bet.potentialPayout - bet.stake)}
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
                  className="flex items-start justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={bet.status === "won" ? "default" : "outline"}>
                        {bet.type}
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
                          <span className="font-medium">{b.team}</span> •{" "}
                          {b.selection} ({formatOdds(b.odds)})
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right ml-4">
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
