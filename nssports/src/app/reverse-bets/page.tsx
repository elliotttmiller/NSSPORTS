"use client";

import { useState } from "react";
import { useBetSlip } from "@/context";
import { generateReverseSequences } from "@/types/advanced-bets";
import type { ReverseBetType } from "@/types/advanced-bets";
import { Button, Badge, Input } from "@/components/ui";
import { X, ArrowLeft } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { formatOdds } from "@/lib/formatters";

export default function ReverseBetsPage() {
  const router = useRouter();
  const { betSlip, removeBet, clearBetSlip } = useBetSlip();
  const [type, setType] = useState<ReverseBetType>("win_reverse");
  const [stakePerSequence, setStakePerSequence] = useState("10");

  const betIds = betSlip.bets.map(b => b.id);
  const sequences = betSlip.bets.length >= 2 ? generateReverseSequences(betIds) : [];
  const stakeValue = parseFloat(stakePerSequence) || 0;
  const totalStake = sequences.length * stakeValue;

  // Place Reverse Bet mutation
  const placeReverseBet = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/reverse-bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: betSlip.bets.map(bet => ({
            id: bet.id,
            gameId: bet.gameId,
            betType: bet.betType,
            selection: bet.selection,
            odds: bet.odds,
            line: bet.line,
            playerProp: bet.playerProp,
            gameProp: bet.gameProp,
          })),
          type,
          stakePerSequence: stakeValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to place Reverse Bet');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Reverse Bet placed! ${data.bet.numSequences} sequences`);
      clearBetSlip();
      router.push('/my-bets');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const canPlace = betSlip.bets.length >= 2 && betSlip.bets.length <= 4 && stakeValue > 0;

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
            <h1 className="text-xl font-bold">Reverse Bet Builder</h1>
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
        {/* Type Selector */}
        <div className="bg-slate-900 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Reverse Type</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setType("win_reverse")}
              className={`p-4 rounded-lg border-2 transition-all ${
                type === "win_reverse"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className="font-semibold">Win Reverse</div>
              <div className="text-sm text-slate-400 mt-1">
                Trigger only on wins
              </div>
            </button>
            <button
              onClick={() => setType("action_reverse")}
              className={`p-4 rounded-lg border-2 transition-all ${
                type === "action_reverse"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className="font-semibold">Action Reverse</div>
              <div className="text-sm text-slate-400 mt-1">
                Trigger on wins, pushes, or cancellations
              </div>
            </button>
          </div>
        </div>

        {/* Selections */}
        <div className="bg-slate-900 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Your Selections ({betSlip.bets.length})
            </h2>
            {(betSlip.bets.length < 2 || betSlip.bets.length > 4) && (
              <Badge variant="destructive">Need 2-4 picks</Badge>
            )}
          </div>

          <div className="space-y-3">
            {betSlip.bets.map((bet) => (
              <div
                key={bet.id}
                className="flex items-center justify-between p-4 bg-slate-800 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{bet.selection}</div>
                  <div className="text-sm text-slate-400">
                    {bet.game.awayTeam.shortName} @ {bet.game.homeTeam.shortName}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-600">{formatOdds(bet.odds)}</Badge>
                  <button
                    onClick={() => removeBet(bet.id)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {betSlip.bets.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>Add 2-4 picks to create a Reverse Bet</p>
            </div>
          )}
        </div>

        {/* Sequences Preview */}
        {sequences.length > 0 && (
          <div className="bg-slate-900 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Generated Sequences ({sequences.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sequences.slice(0, 10).map((seq, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-slate-800 rounded text-sm"
                >
                  <span className="text-slate-400">#{index + 1}</span>
                  <span className="flex-1">
                    {seq.map(id => {
                      const bet = betSlip.bets.find(b => b.id === id);
                      return bet?.selection || id;
                    }).join(" → ")}
                  </span>
                </div>
              ))}
              {sequences.length > 10 && (
                <div className="text-center text-slate-500 text-sm py-2">
                  ... and {sequences.length - 10} more sequences
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stake Input */}
        {betSlip.bets.length >= 2 && (
          <div className="bg-slate-900 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Stake Per Sequence</h2>
            <Input
              type="number"
              value={stakePerSequence}
              onChange={(e) => setStakePerSequence(e.target.value)}
              placeholder="0.00"
              className="text-lg"
              min="0.01"
              step="0.01"
            />
          </div>
        )}

        {/* Summary */}
        {sequences.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/80">Total Sequences</span>
                <span className="text-2xl font-bold">{sequences.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Stake Per Sequence</span>
                <span className="text-xl font-semibold">${stakeValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Reverse Type</span>
                <span className="text-sm font-medium">
                  {type === "win_reverse" ? "Win Reverse" : "Action Reverse"}
                </span>
              </div>
              <div className="border-t border-white/20 pt-3 flex justify-between items-center">
                <span className="text-lg font-semibold">Total Stake</span>
                <span className="text-2xl font-bold">${totalStake.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Place Bet Button */}
        <Button
          onClick={() => placeReverseBet.mutate()}
          disabled={!canPlace || placeReverseBet.isPending}
          className="w-full py-6 text-lg font-semibold"
          size="lg"
        >
          {placeReverseBet.isPending ? "Placing..." : "Place Reverse Bet"}
        </Button>
      </div>
    </div>
  );
}
