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
  const [legOrder, setLegOrder] = useState<string[]>(betSlip.bets.map(b => b.id));

  const stakeValue = parseFloat(initialStake) || 0;
  const orderedBets = legOrder.map(id => betSlip.bets.find(b => b.id === id)).filter(Boolean);
  
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

  const moveLeg = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...legOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setLegOrder(newOrder);
  };

  const canPlace = orderedBets.length >= 2 && orderedBets.length <= 6 && stakeValue > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-400 hover:text-white"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <h1 className="text-xl font-bold">Bet It All Builder</h1>
            <Button
              onClick={() => clearBetSlip()}
              variant="ghost"
              size="sm"
              className="text-slate-400"
            >
              Clear All
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendUp size={24} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Progressive Chain Betting</div>
              <div className="text-sm text-white/90">
                All winnings from each bet are automatically placed on the next bet. 
                One loss resets to zero (All-or-Nothing).
              </div>
            </div>
          </div>
        </div>

        {/* Leg Chain */}
        <div className="bg-slate-900 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Chain Sequence ({orderedBets.length} legs)
            </h2>
            {(orderedBets.length < 2 || orderedBets.length > 6) && (
              <Badge variant="destructive">Need 2-6 legs</Badge>
            )}
          </div>

          <div className="space-y-4">
            {orderedBets.map((bet, index) => (
              <div key={bet!.id} className="space-y-2">
                <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveLeg(index, 'up')}
                      disabled={index === 0}
                      className="text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveLeg(index, 'down')}
                      disabled={index === orderedBets.length - 1}
                      className="text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>

                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-orange-600 to-red-600 font-bold text-lg">
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <div className="font-medium">{bet!.selection}</div>
                    <div className="text-sm text-slate-400">
                      {bet!.game.awayTeam.shortName} @ {bet!.game.homeTeam.shortName}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-600">{formatOdds(bet!.odds)}</Badge>
                    <button
                      onClick={() => removeBet(bet!.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Progressive Calculation Display */}
                {progressivePayouts[index] && (
                  <div className="ml-16 p-3 bg-slate-800/50 rounded border-l-4 border-orange-500">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Stake:</span>
                      <span className="font-semibold text-orange-400">
                        ${progressivePayouts[index].stake.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-slate-400">If Win:</span>
                      <span className="font-bold text-green-400">
                        ${progressivePayouts[index].payout.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Arrow between legs */}
                {index < orderedBets.length - 1 && (
                  <div className="flex items-center justify-center py-2">
                    <div className="text-orange-500">
                      <TrendUp size={32} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {orderedBets.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>Add 2-6 picks to create a Bet It All chain</p>
            </div>
          )}
        </div>

        {/* Initial Stake */}
        {orderedBets.length >= 2 && (
          <div className="bg-slate-900 rounded-lg p-6">
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
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/80">Chain Length</span>
                <span className="text-2xl font-bold">{orderedBets.length} legs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Initial Stake</span>
                <span className="text-xl font-semibold">${stakeValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Mode</span>
                <Badge variant="destructive">All-or-Nothing</Badge>
              </div>
              <div className="border-t border-white/20 pt-3 flex justify-between items-center">
                <span className="text-lg font-semibold">If All Win</span>
                <span className="text-3xl font-bold">${finalPayout.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Place Bet Button */}
        <Button
          onClick={() => placeBetItAll.mutate()}
          disabled={!canPlace || placeBetItAll.isPending}
          className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          size="lg"
        >
          {placeBetItAll.isPending ? "Placing..." : "Place Bet It All"}
        </Button>
      </div>
    </div>
  );
}
