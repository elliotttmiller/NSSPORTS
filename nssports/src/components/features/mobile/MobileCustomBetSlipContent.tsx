"use client";

import { useBetSlip, useBetHistory } from "@/context";
import { Button, Input, Badge, Checkbox } from "@/components/ui";
import { Trash } from "@phosphor-icons/react";
import { formatOdds } from "@/lib/formatters";
import { formatSelectionLabel } from "@/components/bets/BetCard";
import type { Bet } from "@/types";
import { calculatePayout } from "@/services/api";
import { toast } from "sonner";
import { useState } from "react";

export function MobileCustomBetSlipContent() {
  const {
    betSlip,
    removeBet,
    toggleCustomStraight,
    toggleCustomParlay,
    updateCustomStake,
  } = useBetSlip();
  const { addPlacedBet } = useBetHistory();
  const [placingIds, setPlacingIds] = useState<string[]>([]);

  const customStraightBets = betSlip.customStraightBets ?? [];
  const customParlayBets = betSlip.customParlayBets ?? [];
  const customStakes = betSlip.customStakes ?? {};

  const formatBetDescription = (bet: Bet) => {
    return formatSelectionLabel(bet.betType, bet.selection, bet.line, {
      homeTeam: { shortName: bet.game.homeTeam.shortName },
      awayTeam: { shortName: bet.game.awayTeam.shortName }
    }, bet.playerProp);
  };

  const formatMatchup = (bet: Bet) => {
    return `${bet.game.awayTeam.shortName} @ ${bet.game.homeTeam.shortName}`;
  };

  const calculateParlayOdds = () => {
    if (customParlayBets.length === 0) return 0;
    
    let combinedOdds = 1;
    customParlayBets.forEach((betId) => {
      const bet = betSlip.bets.find((b) => b.id === betId);
      if (bet) {
        const decimalOdds = bet.odds > 0 
          ? (bet.odds / 100) + 1 
          : (100 / Math.abs(bet.odds)) + 1;
        combinedOdds *= decimalOdds;
      }
    });
    
    const americanOdds = combinedOdds >= 2 
      ? Math.round((combinedOdds - 1) * 100)
      : Math.round(-100 / (combinedOdds - 1));
    
    return americanOdds;
  };

  const calculateParlayPayout = () => {
    if (customParlayBets.length === 0) return 0;
    
    const parlayStake = customStakes["parlay"] || 0;
    if (parlayStake === 0) return 0;
    
    let combinedOdds = 1;
    customParlayBets.forEach((betId) => {
      const bet = betSlip.bets.find((b) => b.id === betId);
      if (bet) {
        const decimalOdds = bet.odds > 0 
          ? (bet.odds / 100) + 1 
          : (100 / Math.abs(bet.odds)) + 1;
        combinedOdds *= decimalOdds;
      }
    });
    
    return parlayStake * combinedOdds;
  };

  const handlePlaceStraightBet = async (betId: string) => {
    const bet = betSlip.bets.find((b) => b.id === betId);
    const stake = customStakes[betId] || 0;
    if (!bet || stake <= 0) return;
    setPlacingIds((ids) => [...ids, betId]);
    try {
      await addPlacedBet(
        [bet],
        "single",
        stake,
        stake * ((bet.odds > 0 ? bet.odds / 100 : 100 / Math.abs(bet.odds)) + 1),
        bet.odds
      );
      toast.success("Bet placed!");
      removeBet(betId);
    } catch {
      toast.error("Failed to place bet");
    } finally {
      setPlacingIds((ids) => ids.filter((id) => id !== betId));
    }
  };

  const handlePlaceParlayBet = async () => {
    const parlayStake = customStakes["parlay"] || 0;
    if (customParlayBets.length === 0 || parlayStake <= 0) return;
    setPlacingIds((ids) => [...ids, "parlay"]);
    const parlayBets = betSlip.bets.filter((b) => customParlayBets.includes(b.id));
    let combinedOdds = 1;
    parlayBets.forEach((bet) => {
      const decimalOdds = bet.odds > 0 ? (bet.odds / 100) + 1 : (100 / Math.abs(bet.odds)) + 1;
      combinedOdds *= decimalOdds;
    });
    const americanOdds = combinedOdds >= 2 ? Math.round((combinedOdds - 1) * 100) : Math.round(-100 / (combinedOdds - 1));
    try {
      await addPlacedBet(
        parlayBets,
        "parlay",
        parlayStake,
        parlayStake * combinedOdds,
        americanOdds
      );
      toast.success("Parlay placed!");
      // Remove only parlay bets from betslip's parlay array, but keep straight bets
      parlayBets.forEach((bet) => {
        // Only remove if not also in straight bets
        if (!((betSlip.customStraightBets ?? []).includes(bet.id))) {
          removeBet(bet.id);
        }
      });
    } catch {
      toast.error("Failed to place parlay");
    } finally {
      setPlacingIds((ids) => ids.filter((id) => id !== "parlay"));
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground text-center">
        Select which bets to place as straight or combine into parlay
      </div>

      {betSlip.bets.map((bet) => {
        const isStraight = customStraightBets.includes(bet.id);
        const isParlay = customParlayBets.includes(bet.id);
        const stake = customStakes[bet.id] || 0;

        return (
          <div key={bet.id} className={`rounded-xl p-4 space-y-3 border ${
            isStraight 
              ? 'bet-selected-straight' 
              : isParlay
              ? 'bet-selected-parlay'
              : 'bet-unselected bg-card'
          }`}>
            {/* Bet header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-4">
                <div className="font-semibold text-base leading-tight mb-2">
                  {formatBetDescription(bet)}
                </div>
                <div className="text-sm text-muted-foreground leading-tight">
                  {formatMatchup(bet)}
                </div>
              </div>
              <Badge className="bg-accent/10 text-accent border-accent/20 font-mono px-3 py-1 text-sm font-normal">
                {formatOdds(bet.odds)}
              </Badge>
            </div>

            {/* Bet Assignment Controls */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all flex-1 justify-center ${
                isStraight 
                  ? 'bg-accent/20 border border-accent/40 ring-1 ring-accent/20' 
                  : 'hover:bg-muted/50 border border-transparent'
              }`}>
                <Checkbox
                  id={`straight-${bet.id}`}
                  checked={isStraight}
                  onCheckedChange={() => toggleCustomStraight(bet.id)}
                />
                <label
                  htmlFor={`straight-${bet.id}`}
                  className="text-sm font-medium cursor-pointer whitespace-nowrap"
                >
                  Straight
                </label>
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all flex-1 justify-center ${
                isParlay 
                  ? 'bg-blue-500/20 border border-blue-400/40 ring-1 ring-blue-400/20' 
                  : 'hover:bg-muted/50 border border-transparent'
              }`}>
                <Checkbox
                  id={`parlay-${bet.id}`}
                  checked={isParlay}
                  onCheckedChange={() => toggleCustomParlay(bet.id)}
                />
                <label
                  htmlFor={`parlay-${bet.id}`}
                  className="text-sm font-medium cursor-pointer whitespace-nowrap"
                >
                  Parlay
                </label>
              </div>
            </div>

            {/* Stake Input for Straight Bets */}
            {isStraight && (
              <div className="flex items-center justify-between pt-3 border-t border-border/20">
                <div className="flex items-end gap-3 flex-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-2">
                      Stake
                    </div>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={stake || ""}
                      onChange={(e) =>
                        updateCustomStake(bet.id, parseFloat(e.target.value) || 0)
                      }
                      className="h-9 text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div className="flex-1 text-center">
                    <div className="text-xs text-muted-foreground mb-2">
                      To Win
                    </div>
                    <div className="text-sm font-bold text-white py-2.5 px-3 bg-white/10 rounded-md border border-white/30">
                      $
                      {stake > 0
                        ? calculatePayout(stake, bet.odds).toFixed(2)
                        : "0.00"}
                    </div>
                  </div>

                  <div className="flex-1 text-center">
                    <div className="text-xs text-muted-foreground mb-2">
                      Total
                    </div>
                    <div className="text-sm font-bold text-accent py-2.5 px-3 bg-accent/10 rounded-md border border-accent/30">
                      ${stake > 0 ? (calculatePayout(stake, bet.odds) + stake).toFixed(2) : "0.00"}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBet(bet.id)}
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive ml-3"
                >
                  <Trash size={16} />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handlePlaceStraightBet(bet.id)}
                  disabled={placingIds.includes(bet.id) || (stake <= 0)}
                  className="ml-2 h-9 px-4"
                  aria-label="Place Straight Bet"
                  title="Place Straight Bet"
                >
                  {placingIds.includes(bet.id) ? "Placing..." : "Place"}
                </Button>
              </div>
            )}

            {/* Show delete button for non-straight bets */}
            {!isStraight && (
              <div className="flex justify-end pt-2 border-t border-border/20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBet(bet.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash size={16} />
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Parlay Section */}
      {customParlayBets.length > 0 && (
        <div className="bg-card border-2 border-accent/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-base">
              Parlay ({customParlayBets.length} legs)
            </div>
            <Badge className="bg-accent/10 text-accent border-accent/20 font-mono px-3 py-1 text-sm font-bold">
              {formatOdds(calculateParlayOdds())}
            </Badge>
          </div>

          {/* Parlay legs */}
          <div className="space-y-2">
            {customParlayBets.map((betId, index) => {
              const bet = betSlip.bets.find((b) => b.id === betId);
              if (!bet) return null;

              return (
                <div
                  key={betId}
                  className="flex items-start justify-between py-2 border-b border-border/10 last:border-b-0"
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="w-5 h-5 bg-accent/20 text-accent rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-tight">
                        {formatBetDescription(bet)}
                      </div>
                      <div className="text-xs text-muted-foreground leading-tight">
                        {formatMatchup(bet)}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="font-mono px-2 py-0.5 text-xs ml-2"
                  >
                    {formatOdds(bet.odds)}
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Parlay stake input */}
          <div className="flex items-center justify-between pt-3 border-t border-border/20">
            <div className="flex items-end gap-3 flex-1">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-2">
                  Stake
                </div>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={customStakes["parlay"] || ""}
                  onChange={(e) =>
                    updateCustomStake("parlay", parseFloat(e.target.value) || 0)
                  }
                  className="h-9 text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div className="flex-1 text-center">
                <div className="text-xs text-muted-foreground mb-2">
                  To Win
                </div>
                <div className="text-sm font-bold text-white py-2.5 px-3 bg-white/10 rounded-md border border-white/30">
                  $
                  {calculateParlayPayout() > (customStakes["parlay"] || 0)
                    ? (calculateParlayPayout() - (customStakes["parlay"] || 0)).toFixed(2)
                    : "0.00"}
                </div>
              </div>

              <div className="flex-1 text-center">
                <div className="text-xs text-muted-foreground mb-2">
                  Total
                </div>
                <div className="text-sm font-bold text-accent py-2.5 px-3 bg-accent/10 rounded-md border border-accent/30">
                  ${calculateParlayPayout().toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={handlePlaceParlayBet}
            disabled={placingIds.includes("parlay") || (customStakes["parlay"] <= 0)}
            className="ml-2 h-9 px-4"
            aria-label="Place Parlay Bet"
            title="Place Parlay Bet"
          >
            {placingIds.includes("parlay") ? "Placing..." : "Place Parlay"}
          </Button>
        </div>
      )}
    </div>
  );
}
