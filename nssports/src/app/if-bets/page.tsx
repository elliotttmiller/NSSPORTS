"use client";

import { useState } from "react";
import { useBetSlip } from "@/context";
import type { IfBetCondition } from "@/types/advanced-bets";
import { Button, Badge, Input } from "@/components/ui";
import { X, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { formatOdds } from "@/lib/formatters";

export default function IfBetsPage() {
  const router = useRouter();
  const { betSlip, removeBet, clearBetSlip } = useBetSlip();
  const [condition, setCondition] = useState<IfBetCondition>("if_win_only");
  const [initialStake, setInitialStake] = useState("100");
  const [legOrder, setLegOrder] = useState<string[]>(betSlip.bets.map(b => b.id));

  // Calculate progressive payouts
  const stakeValue = parseFloat(initialStake) || 0;
  const orderedBets = legOrder.map(id => betSlip.bets.find(b => b.id === id)).filter(Boolean);
  
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

  // Place If Bet mutation
  const placeIfBet = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/if-bets', {
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
          condition,
          initialStake: stakeValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to place If Bet');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`If Bet placed! ${data.bet.numLegs} legs`);
      clearBetSlip();
      router.push('/my-bets');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const moveLeg = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...legOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setLegOrder(newOrder);
  };

  const canPlace = orderedBets.length >= 2 && orderedBets.length <= 5 && stakeValue > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <h1 className="text-xl font-bold">If Bet Builder</h1>
            <Button
              onClick={() => clearBetSlip()}
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              Clear All
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Condition Selector */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Condition</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCondition("if_win_only")}
              className={`p-4 rounded-lg border-2 transition-all ${
                condition === "if_win_only"
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <div className="font-semibold">If Win Only</div>
              <div className="text-sm text-muted-foreground mt-1">
                Next bet placed only if previous wins
              </div>
            </button>
            <button
              onClick={() => setCondition("if_win_or_tie")}
              className={`p-4 rounded-lg border-2 transition-all ${
                condition === "if_win_or_tie"
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <div className="font-semibold">If Win or Tie</div>
              <div className="text-sm text-muted-foreground mt-1">
                Next bet placed if previous wins or pushes
              </div>
            </button>
          </div>
        </div>

        {/* Leg Sequence */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Leg Sequence ({orderedBets.length})
            </h2>
            {(orderedBets.length < 2 || orderedBets.length > 5) && (
              <Badge variant="destructive">Need 2-5 legs</Badge>
            )}
          </div>

          <div className="space-y-3">
            {orderedBets.map((bet, index) => (
              <div key={bet!.id} className="space-y-2">
                <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveLeg(index, 'up')}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveLeg(index, 'down')}
                      disabled={index === orderedBets.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      ↓
                    </button>
                  </div>

                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground font-bold">
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <div className="font-medium">{bet!.selection}</div>
                    <div className="text-sm text-muted-foreground">
                      {bet!.game.awayTeam.shortName} @ {bet!.game.homeTeam.shortName}
                    </div>
                    {progressivePayouts[index] && (
                      <div className="text-xs text-accent mt-1">
                        Stake: ${progressivePayouts[index].stake.toFixed(2)} → 
                        Payout: ${progressivePayouts[index].payout.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className="bg-accent text-accent-foreground">{formatOdds(bet!.odds)}</Badge>
                    <button
                      onClick={() => removeBet(bet!.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Arrow between legs */}
                {index < orderedBets.length - 1 && (
                  <div className="flex items-center justify-center py-2">
                    <ArrowRight size={24} className="text-accent" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {condition === "if_win_only" ? "If Win" : "If Win or Tie"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {orderedBets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Add 2-5 picks to create an If Bet</p>
            </div>
          )}
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

        {/* Summary */}
        {orderedBets.length >= 2 && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Number of Legs</span>
                <span className="text-2xl font-bold">{orderedBets.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Initial Stake</span>
                <span className="text-xl font-semibold">${stakeValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Condition</span>
                <span className="text-sm font-medium">
                  {condition === "if_win_only" ? "If Win Only" : "If Win or Tie"}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-center">
                <span className="text-lg font-semibold">Potential Payout</span>
                <span className="text-2xl font-bold">${finalPayout.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Place Bet Button */}
        <Button
          onClick={() => placeIfBet.mutate()}
          disabled={!canPlace || placeIfBet.isPending}
          className="w-full py-6 text-lg font-semibold"
          size="lg"
        >
          {placeIfBet.isPending ? "Placing..." : "Place If Bet"}
        </Button>
      </div>
    </div>
  );
}
