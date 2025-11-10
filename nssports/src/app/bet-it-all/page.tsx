"use client";

import { useState } from "react";
import { useBetSlip } from "@/context";
import { Button, Badge, Input } from "@/components/ui";
import { X, ArrowLeft, TrendUp } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { formatOdds } from "@/lib/formatters";

export default function BetItAllPage() {
  const router = useRouter();
  const { betSlip, removeBet, clearBetSlip } = useBetSlip();
  const [initialStake, setInitialStake] = useState("100");

  const stakeValue = parseFloat(initialStake) || 0;
  const orderedBets = betSlip.bets;
  
  // Calculate progressive payouts
  const progressivePayouts = orderedBets.reduce((acc, bet, index) => {
    const prevPayout = index === 0 ? stakeValue : acc[index - 1].payout;
    const decimalOdds = bet!.odds > 0 
      ? (bet!.odds / 100) + 1 
      : (100 / Math.abs(bet!.odds)) + 1;
    const payout = prevPayout * decimalOdds;
    
    acc.push({ stake: prevPayout, payout });
    return acc;
  }, [] as Array<{ stake: number; payout: number }>);

  const finalPayout = progressivePayouts[progressivePayouts.length - 1]?.payout || 0;

  // Place Bet It All mutation
  const placeBetItAll = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/bet-it-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs: orderedBets.map(bet => ({
            id: bet!.id,
            gameId: bet!.gameId,
            betType: bet!.betType,
            selection: bet!.selection,
            odds: bet!.odds,
            line: bet!.line,
            playerProp: bet!.playerProp,
            gameProp: bet!.gameProp,
          })),
          initialStake: stakeValue,
          allOrNothing: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to place Bet It All');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Bet It All placed! ${data.bet.numLegs} legs`);
      clearBetSlip();
      router.push('/my-bets');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const canPlace = orderedBets.length >= 2 && orderedBets.length <= 6 && stakeValue > 0;

  return (
    <div className="min-h-full bg-background">
      {/* Header - Seamless (not sticky) */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-lg sm:text-xl font-bold">Bet It All Builder</h1>
            <Button
              onClick={() => clearBetSlip()}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              Clear All
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 max-w-4xl py-6 space-y-6">
        {/* Info Banner */}
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendUp size={20} className="shrink-0 mt-0.5 text-accent" />
            <div className="text-sm">
              <div className="font-semibold text-foreground mb-1">Progressive Chain Betting</div>
              <div className="text-muted-foreground">
                All winnings from each bet automatically roll to the next. One loss ends the chain.
              </div>
            </div>
          </div>
        </div>

        {/* Initial Stake */}
        {orderedBets.length >= 2 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Initial Stake</h2>
            <Input
              type="number"
              value={initialStake}
              onChange={(e) => setInitialStake(e.target.value)}
              placeholder="0.00"
              className="text-lg"
              min="0.01"
              step="0.01"
            />
          </div>
        )}

        {/* Chain Sequence */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Chain Sequence ({orderedBets.length})
            </h2>
            {(orderedBets.length < 2 || orderedBets.length > 6) && (
              <Badge variant="destructive">Need 2-6 legs</Badge>
            )}
          </div>

          <div className="space-y-3">
            {orderedBets.map((bet, index) => (
              <div key={bet!.id} className="space-y-2">
                <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground font-bold text-sm shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">
                        {bet!.game.awayTeam.shortName} @ {bet!.game.homeTeam.shortName}
                      </div>
                      <div className="text-sm text-muted-foreground capitalize flex items-center gap-2">
                        <span>{bet!.betType === "spread" ? "Spread" : bet!.betType === "total" ? "Total" : bet!.betType}</span>
                        <span className="text-accent">•</span>
                        <span className="font-medium text-foreground">
                          {bet!.betType === "spread" 
                            ? (bet!.selection === "home" ? bet!.game.homeTeam.shortName : bet!.game.awayTeam.shortName)
                            : bet!.betType === "total"
                            ? (bet!.selection === "over" ? "Over" : "Under")
                            : bet!.selection}
                          {bet!.line !== null && bet!.line !== undefined && (
                            <span className="ml-1">
                              {bet!.betType === "spread" ? (bet!.line > 0 ? `+${bet!.line}` : bet!.line) : bet!.line}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className="bg-accent text-accent-foreground">{formatOdds(bet!.odds)}</Badge>
                    <button
                      onClick={() => removeBet(bet!.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Progressive Calculation Display */}
                {progressivePayouts[index] && (
                  <div className="ml-11 p-3 bg-accent/5 rounded-lg border border-accent/20">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Stake</span>
                      <span className="font-semibold text-foreground">
                        ${progressivePayouts[index].stake.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-muted-foreground">If Win</span>
                      <span className="font-bold text-green-500">
                        ${progressivePayouts[index].payout.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {orderedBets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Add 2-6 picks to create a Bet It All chain</p>
            </div>
          )}
        </div>

        {/* Summary */}
        {orderedBets.length >= 2 && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Chain Length</span>
                <span className="text-xl font-bold text-foreground">{orderedBets.length} legs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Initial Stake</span>
                <span className="text-xl font-semibold text-foreground">${stakeValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mode</span>
                <Badge variant="destructive">All-or-Nothing</Badge>
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">If All Win</span>
                <span className="text-2xl font-bold text-accent">${finalPayout.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Place Bet Button */}
        <Button
          onClick={() => placeBetItAll.mutate()}
          disabled={!canPlace || placeBetItAll.isPending}
          className="w-full py-6 text-lg font-semibold bg-accent hover:bg-accent/90"
          size="lg"
        >
          {placeBetItAll.isPending ? "Placing..." : "Place Bet It All"}
        </Button>
      </div>
    </div>
  );
}
