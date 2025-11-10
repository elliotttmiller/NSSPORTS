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
            <h1 className="text-lg sm:text-xl font-bold">Reverse Bet Builder</h1>
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
        {/* Type Selector */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Reverse Type</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setType("win_reverse")}
              className={`p-4 rounded-lg border-2 transition-all ${
                type === "win_reverse"
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <div className="font-semibold">Win Reverse</div>
              <div className="text-sm text-muted-foreground mt-1">
                Trigger only on wins
              </div>
            </button>
            <button
              onClick={() => setType("action_reverse")}
              className={`p-4 rounded-lg border-2 transition-all ${
                type === "action_reverse"
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <div className="font-semibold">Action Reverse</div>
              <div className="text-sm text-muted-foreground mt-1">
                Trigger on wins, pushes, or cancellations
              </div>
            </button>
          </div>
        </div>

        {/* Selections */}
        <div className="bg-card border border-border rounded-lg p-6">
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
                className="flex items-center justify-between p-4 bg-card rounded-lg border border-border"
              >
                <div className="flex-1">
                  <div className="font-semibold text-foreground">
                    {bet.game.awayTeam.shortName} @ {bet.game.homeTeam.shortName}
                  </div>
                  <div className="text-sm text-muted-foreground capitalize flex items-center gap-2">
                    <span>{bet.betType === "spread" ? "Spread" : bet.betType === "total" ? "Total" : bet.betType}</span>
                    <span className="text-accent">•</span>
                    <span className="font-medium text-foreground">
                      {bet.betType === "spread" 
                        ? (bet.selection === "home" ? bet.game.homeTeam.shortName : bet.game.awayTeam.shortName)
                        : bet.betType === "total"
                        ? (bet.selection === "over" ? "Over" : "Under")
                        : bet.selection}
                      {bet.line !== null && bet.line !== undefined && (
                        <span className="ml-1">
                          {bet.betType === "spread" ? (bet.line > 0 ? `+${bet.line}` : bet.line) : bet.line}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-accent text-accent-foreground">{formatOdds(bet.odds)}</Badge>
                  <button
                    onClick={() => removeBet(bet.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {betSlip.bets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Add 2-4 picks to create a Reverse Bet</p>
            </div>
          )}
        </div>

        {/* Sequences Preview */}
        {sequences.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Generated Sequences ({sequences.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sequences.slice(0, 10).map((seq, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-background rounded text-sm border border-border/50"
                >
                  <span className="text-muted-foreground font-mono">#{index + 1}</span>
                  <span className="flex-1 font-medium">
                    {seq.map((id, idx) => {
                      const bet = betSlip.bets.find(b => b.id === id);
                      if (!bet) return id;
                      const displaySelection = bet.betType === "spread" 
                        ? (bet.selection === "home" ? bet.game.homeTeam.shortName : bet.game.awayTeam.shortName)
                        : bet.betType === "total"
                        ? (bet.selection === "over" ? "O" : "U")
                        : bet.selection;
                      return (
                        <span key={id}>
                          {idx > 0 && <span className="text-accent mx-1">→</span>}
                          {displaySelection}
                        </span>
                      );
                    })}
                  </span>
                </div>
              ))}
              {sequences.length > 10 && (
                <div className="text-center text-muted-foreground text-sm py-2">
                  ... and {sequences.length - 10} more sequences
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stake Input */}
        {betSlip.bets.length >= 2 && (
          <div className="bg-card border border-border rounded-lg p-6">
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
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Sequences</span>
                <span className="text-2xl font-bold">{sequences.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Stake Per Sequence</span>
                <span className="text-xl font-semibold">${stakeValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Reverse Type</span>
                <span className="text-sm font-medium">
                  {type === "win_reverse" ? "Win Reverse" : "Action Reverse"}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-center">
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
