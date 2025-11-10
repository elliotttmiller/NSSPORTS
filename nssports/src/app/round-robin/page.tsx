"use client";

import { useState } from "react";
import { useBetSlip } from "@/context";
import { 
  calculateRoundRobinParlays,
  ROUND_ROBIN_CONFIGS 
} from "@/types/advanced-bets";
import type { RoundRobinType } from "@/types/advanced-bets";
import { Button, Badge, Input } from "@/components/ui";
import { X, ArrowLeft } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { formatOdds } from "@/lib/formatters";

export default function RoundRobinPage() {
  const router = useRouter();
  const { betSlip, removeBet, clearBetSlip } = useBetSlip();
  const [selectedTypes, setSelectedTypes] = useState<RoundRobinType[]>(["by_2s"]);
  const [stakePerParlay, setStakePerParlay] = useState("10");

  // Calculate total parlays and stake
  const numParlays = selectedTypes.reduce((sum, type) => {
    const config = ROUND_ROBIN_CONFIGS[type];
    return sum + calculateRoundRobinParlays(betSlip.bets.length, config.parlaySize);
  }, 0);

  const stakeValue = parseFloat(stakePerParlay) || 0;
  const totalStake = numParlays * stakeValue;

  // Place Round Robin mutation
  const placeRoundRobin = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/round-robin', {
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
          roundRobinTypes: selectedTypes,
          stakePerParlay: stakeValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to place Round Robin bet');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Round Robin placed! ${data.bet.numParlays} parlays created`);
      clearBetSlip();
      router.push('/my-bets');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleType = (type: RoundRobinType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const canPlace = betSlip.bets.length >= 3 && selectedTypes.length > 0 && stakeValue > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border" style={{ top: '64px' }}>
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-lg sm:text-xl font-bold">Round Robin Builder</h1>
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
        {/* Selections */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Your Selections ({betSlip.bets.length})
            </h2>
            {betSlip.bets.length < 3 && (
              <Badge variant="destructive">Need at least 3 picks</Badge>
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
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {betSlip.bets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Add at least 3 picks to create a Round Robin</p>
            </div>
          )}
        </div>

        {/* Parlay Type Selector */}
        {betSlip.bets.length >= 3 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Select Parlay Types</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(ROUND_ROBIN_CONFIGS).map(([key, config]) => {
                const isDisabled = config.parlaySize > betSlip.bets.length;
                const count = isDisabled ? 0 : calculateRoundRobinParlays(betSlip.bets.length, config.parlaySize);
                
                return (
                  <button
                    key={key}
                    onClick={() => !isDisabled && toggleType(key as RoundRobinType)}
                    disabled={isDisabled}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedTypes.includes(key as RoundRobinType)
                        ? "border-accent bg-accent/10 text-accent-foreground"
                        : isDisabled
                        ? "border-border bg-muted/50 opacity-50 cursor-not-allowed"
                        : "border-border hover:border-accent/50 hover:bg-accent/5"
                    }`}
                  >
                    <div className="font-semibold">{config.displayName}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {isDisabled ? "Not enough picks" : `${count} parlays`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stake Input */}
        {betSlip.bets.length >= 3 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Stake Per Parlay</h2>
            <Input
              type="number"
              value={stakePerParlay}
              onChange={(e) => setStakePerParlay(e.target.value)}
              placeholder="0.00"
              className="text-lg"
              min="0.01"
              step="0.01"
            />
          </div>
        )}

        {/* Summary */}
        {betSlip.bets.length >= 3 && selectedTypes.length > 0 && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Parlays</span>
                <span className="text-2xl font-bold">{numParlays}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Stake Per Parlay</span>
                <span className="text-xl font-semibold">${stakeValue.toFixed(2)}</span>
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
          onClick={() => placeRoundRobin.mutate()}
          disabled={!canPlace || placeRoundRobin.isPending}
          className="w-full py-6 text-lg font-semibold"
          size="lg"
        >
          {placeRoundRobin.isPending ? "Placing..." : "Place Round Robin Bet"}
        </Button>
      </div>
    </div>
  );
}
