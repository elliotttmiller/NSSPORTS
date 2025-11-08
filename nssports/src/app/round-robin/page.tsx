"use client";

import { useState } from "react";
import { useBetSlip } from "@/context";
import { 
  calculateRoundRobinParlays, 
  generateCombinations,
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
            <h1 className="text-xl font-bold">Round Robin Builder</h1>
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
        {/* Selections */}
        <div className="bg-slate-900 rounded-lg p-6">
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
              <p>Add at least 3 picks to create a Round Robin</p>
            </div>
          )}
        </div>

        {/* Parlay Type Selector */}
        {betSlip.bets.length >= 3 && (
          <div className="bg-slate-900 rounded-lg p-6">
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
                        ? "border-blue-500 bg-blue-500/10"
                        : isDisabled
                        ? "border-slate-700 bg-slate-800/50 opacity-50 cursor-not-allowed"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="font-semibold">{config.displayName}</div>
                    <div className="text-sm text-slate-400 mt-1">
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
          <div className="bg-slate-900 rounded-lg p-6">
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
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/80">Total Parlays</span>
                <span className="text-2xl font-bold">{numParlays}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Stake Per Parlay</span>
                <span className="text-xl font-semibold">${stakeValue.toFixed(2)}</span>
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
