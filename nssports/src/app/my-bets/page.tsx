"use client";
import { useBetHistory } from "@/context";
import type { PlacedBet } from "@/context/BetHistoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge } from "@/components/ui";
import { formatCurrency, formatOdds } from "@/lib/formatters";
import { useMemo } from "react";

export default function MyBetsPage() {
  const { placedBets } = useBetHistory();
  const betHistory: PlacedBet[] = placedBets;
  const stats = useMemo(() => {
    if (!betHistory || betHistory.length === 0) {
      return { totalBets: 0, wonBets: 0, winRate: 0, totalWagered: 0, totalWon: 0 };
    }
    const totalBets = betHistory.length;
    const wonBets = betHistory.filter((bet: PlacedBet) => bet.status === "won").length;
    const winRate = totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0;
    const totalWagered = betHistory.reduce((sum: number, bet: PlacedBet) => sum + bet.stake, 0);
    const totalWon = betHistory
      .filter((bet: PlacedBet) => bet.status === "won")
      .reduce((sum: number, bet: PlacedBet) => sum + bet.profit, 0);
    return { totalBets, wonBets, winRate, totalWagered, totalWon };
  }, [betHistory]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Bet History</CardTitle>
        </CardHeader>
        <CardContent>
          {(!betHistory || betHistory.length === 0) ? (
            <div className="text-center text-muted-foreground">Not available</div>
          ) : (
            <>
              <div className="mb-4 flex gap-6">
                <Badge variant="secondary">Total Bets: {stats.totalBets}</Badge>
                <Badge variant="secondary">Win Rate: {stats.winRate}%</Badge>
                <Badge variant="secondary">Total Wagered: {formatCurrency(stats.totalWagered)}</Badge>
                <Badge variant="secondary">Total Won: {formatCurrency(stats.totalWon)}</Badge>
              </div>
              <div className="space-y-4">
                {betHistory.map((bet: PlacedBet) => (
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
