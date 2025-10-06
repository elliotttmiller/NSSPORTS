"use client";

import { useBetSlip } from "@/context";
import { Button, Input, Separator, Checkbox } from "@/components/ui";
import { X } from "@phosphor-icons/react/dist/ssr";
import { formatOdds, formatCurrency } from "@/lib/formatters";
import { BetCardSingle } from "@/components/bets/BetCard";
import type { Bet } from "@/types";
import { calculatePayout } from "@/services/api";

export function CustomBetSlipContent() {
  const { 
    betSlip, 
    removeBet, 
    toggleCustomStraight, 
    toggleCustomParlay, 
    updateCustomStake 
  } = useBetSlip();

  const customStraightBets = betSlip.customStraightBets || [];
  const customParlayBets = betSlip.customParlayBets || [];
  const customStakes = betSlip.customStakes || {};

  // Calculate parlay odds
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

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground px-1">
        Select which bets to place as straight bets or combine into a parlay
      </div>

      {betSlip.bets.map((bet) => {
        const isStraight = customStraightBets.includes(bet.id);
        const isParlay = customParlayBets.includes(bet.id);
        const stake = customStakes[bet.id] || 0;

        return (
          <div key={bet.id} className="border border-border rounded-lg p-3 space-y-3">
            <BetCardSingle
              id={bet.id}
              betType={bet.betType}
              placedAt={new Date()}
              status={"pending"}
              selection={bet.selection}
              odds={bet.odds}
              line={bet.line}
              stake={stake}
              payout={isStraight ? calculatePayout(stake, bet.odds) + stake : 0}
              game={{ 
                homeTeam: { shortName: bet.game.homeTeam.shortName }, 
                awayTeam: { shortName: bet.game.awayTeam.shortName } 
              }}
              showTotals={false}
              headerActions={(
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBet(bet.id)}
                  className="h-6 w-6 p-0"
                  aria-label="Remove bet"
                >
                  <X size={14} />
                </Button>
              )}
            />

            {/* Bet Assignment Controls */}
            <div className="flex items-center gap-4 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`straight-${bet.id}`}
                  checked={isStraight}
                  onCheckedChange={() => toggleCustomStraight(bet.id)}
                />
                <label
                  htmlFor={`straight-${bet.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  Straight
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`parlay-${bet.id}`}
                  checked={isParlay}
                  onCheckedChange={() => toggleCustomParlay(bet.id)}
                />
                <label
                  htmlFor={`parlay-${bet.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  Add to Parlay
                </label>
              </div>
            </div>

            {/* Wager Input for Straight Bets */}
            {isStraight && (
              <div className="pt-2">
                <label className="text-xs text-muted-foreground mb-1 block">Stake</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">$</span>
                  <Input
                    type="number"
                    value={stake}
                    onChange={(e) => updateCustomStake(bet.id, parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm"
                    min="0"
                    max="10000"
                    step="1"
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  To win: {formatCurrency(stake > 0 ? calculatePayout(stake, bet.odds) : 0)}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Parlay Section */}
      {customParlayBets.length > 0 && (
        <div className="border-2 border-accent/20 rounded-lg p-4 space-y-3 bg-accent/5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Parlay ({customParlayBets.length} legs)</h3>
            <span className="text-sm font-medium text-accent">
              {formatOdds(calculateParlayOdds())}
            </span>
          </div>

          <Separator />

          <div className="space-y-2">
            {customParlayBets.map((betId, index) => {
              const bet = betSlip.bets.find((b) => b.id === betId);
              if (!bet) return null;

              return (
                <div key={betId} className="flex items-center gap-2 text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/20 text-accent text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="flex-1">
                    {bet.game.awayTeam.shortName} @ {bet.game.homeTeam.shortName}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatOdds(bet.odds)}
                  </span>
                </div>
              );
            })}
          </div>

          <Separator />

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Parlay Stake</label>
            <div className="flex items-center gap-2">
              <span className="text-sm">$</span>
              <Input
                type="number"
                value={customStakes["parlay"] || 0}
                onChange={(e) => updateCustomStake("parlay", parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
                min="0"
                max="10000"
                step="1"
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Potential payout: {formatCurrency(calculateParlayPayout())}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
