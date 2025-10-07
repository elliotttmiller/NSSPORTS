"use client";

import { useBetSlip } from "@/context";
import { Button, Input, Separator, Checkbox } from "@/components/ui";
import { X } from "@phosphor-icons/react/dist/ssr";
import { formatOdds, formatCurrency } from "@/lib/formatters";
import { BetCardSingle } from "@/components/bets/BetCard";
import { calculatePayout } from "@/services/api";
import { useBetHistory } from "@/context";
import { useState, useCallback } from "react";
import { toast } from "sonner";

import type { Bet } from "../../types";

export function CustomBetSlipContent() {
  const { 
    betSlip, 
    removeBet, 
    toggleCustomStraight, 
    toggleCustomParlay, 
    updateCustomStake,
    clearBetSlip 
  } = useBetSlip();
  const { addPlacedBet } = useBetHistory();
  const [placing, setPlacing] = useState(false);

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

  // Validation functions
  const MIN_STAKE = 1;
  const MAX_STAKE = 10000;

  const hasValidStraightBets = () => {
    return customStraightBets.some(betId => {
      const stake = customStakes[betId] || 0;
      return stake >= MIN_STAKE && stake <= MAX_STAKE;
    });
  };

  const hasValidParlayBet = () => {
    const parlayStake = customStakes["parlay"] || 0;
    return customParlayBets.length >= 2 && parlayStake >= MIN_STAKE && parlayStake <= MAX_STAKE;
  };

  const isReadyToPlace = () => {
    return hasValidStraightBets() || hasValidParlayBet();
  };

  const getValidationMessage = () => {
    if (customStraightBets.length === 0 && customParlayBets.length === 0) {
      return "Select bets using the checkboxes above";
    }

    // Check for missing/finished games
    const now = new Date();
    const isValidGame = (bet: Bet) => bet && bet.game && bet.game.status !== "finished" && new Date(bet.game.startTime) > now;
    const invalidStraight = customStraightBets.filter(betId => {
      const bet = betSlip.bets.find((b) => b.id === betId);
      return !bet || !isValidGame(bet);
    });
    const parlayBets = betSlip.bets.filter((b) => customParlayBets.includes(b.id));
    const invalidParlay = parlayBets.filter(bet => !isValidGame(bet));
    if (invalidStraight.length > 0 || invalidParlay.length > 0) {
      return `Some bets reference missing or finished games. Please remove or update: ${[...invalidStraight, ...invalidParlay.map(b => b.id)].join(", ")}`;
    }

    const invalidStraightBets = customStraightBets.filter(betId => {
      const stake = customStakes[betId] || 0;
      return stake < MIN_STAKE || stake > MAX_STAKE;
    });

    const invalidParlayCount = customParlayBets.length > 0 && customParlayBets.length < 2;
    const invalidParlayStake = customParlayBets.length >= 2 && ((customStakes["parlay"] || 0) < MIN_STAKE || (customStakes["parlay"] || 0) > MAX_STAKE);

    const messages = [];

    if (invalidStraightBets.length > 0) {
      messages.push(`Enter stakes ($${MIN_STAKE}-$${MAX_STAKE}) for straight bets`);
    }

    if (invalidParlayCount) {
      messages.push("Parlays need at least 2 bets");
    }

    if (invalidParlayStake) {
      messages.push(`Enter parlay stake ($${MIN_STAKE}-$${MAX_STAKE})`);
    }

    return messages.length > 0 ? messages.join(" • ") : "Ready to place bets";
  };

  const getTotalStake = () => {
    let total = 0;
    
    // Add straight bet stakes
    customStraightBets.forEach(betId => {
      total += customStakes[betId] || 0;
    });
    
    // Add parlay stake
    if (customParlayBets.length > 0) {
      total += customStakes["parlay"] || 0;
    }
    
    return total;
  };

  const getTotalPayout = () => {
    let total = 0;
    
    // Add straight bet payouts
    customStraightBets.forEach(betId => {
      const stake = customStakes[betId] || 0;
      if (stake > 0) {
        const bet = betSlip.bets.find(b => b.id === betId);
        if (bet) {
          total += calculatePayout(stake, bet.odds) + stake;
        }
      }
    });
    
    // Add parlay payout
    total += calculateParlayPayout();
    
    return total;
  };


  const handlePlaceBets = useCallback(async () => {
    // Validate all bets reference a valid, upcoming game
    const now = new Date();
    const isValidGame = (bet: Bet) => bet && bet.game && bet.game.status !== "finished" && new Date(bet.game.startTime) > now;

    if (!isReadyToPlace()) {
      toast.error("Invalid bet configuration", {
        description: getValidationMessage(),
      });
      return;
    }

    // Check for missing/finished games
    const invalidStraight = customStraightBets.filter(betId => {
      const bet = betSlip.bets.find((b) => b.id === betId);
      return !bet || !isValidGame(bet);
    });
    const parlayBets = betSlip.bets.filter((b) => customParlayBets.includes(b.id));
    const invalidParlay = parlayBets.filter(bet => !isValidGame(bet));
    if (invalidStraight.length > 0 || invalidParlay.length > 0) {
      toast.error("Some bets reference missing or finished games", {
        description: `Invalid bets: ${[...invalidStraight, ...invalidParlay].join(", ")}`,
      });
      return;
    }

    setPlacing(true);
    try {
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // Place straight bets
      for (const betId of customStraightBets) {
        const bet = betSlip.bets.find((b) => b.id === betId);
        const stake = customStakes[betId] || 0;
        if (bet && stake > 0) {
          try {
            const potentialPayout = calculatePayout(stake, bet.odds) + stake;
            const betWithStake = {
              ...bet,
              stake,
              potentialPayout
            };
            await addPlacedBet(
              [betWithStake],
              "single",
              stake,
              potentialPayout,
              bet.odds
            );
            successCount++;
          } catch (_error) {
            failCount++;
            errors.push(`Failed to place bet on ${bet.game.awayTeam.shortName} @ ${bet.game.homeTeam.shortName}`);
          }
        }
      }

      // Place parlay bet
      if (customParlayBets.length > 0) {
        const parlayStake = customStakes["parlay"] || 0;
        if (parlayStake > 0) {
          let combinedOdds = 1;
          parlayBets.forEach((bet) => {
            const decimalOdds = bet.odds > 0 
              ? (bet.odds / 100) + 1 
              : (100 / Math.abs(bet.odds)) + 1;
            combinedOdds *= decimalOdds;
          });
          const americanOdds = combinedOdds >= 2 
            ? Math.round((combinedOdds - 1) * 100)
            : Math.round(-100 / (combinedOdds - 1));
          try {
            await addPlacedBet(
              parlayBets,
              "parlay",
              parlayStake,
              parlayStake * combinedOdds,
              americanOdds
            );
            successCount++;
          } catch (_error) {
            failCount++;
            errors.push("Failed to place parlay bet");
          }
        }
      }

      if (failCount === 0) {
        clearBetSlip();
        toast.success(
          `All bets placed successfully! (${successCount} bet${successCount > 1 ? 's' : ''})`,
          {
            description: `Total Stake: ${formatCurrency(getTotalStake())} • Potential Win: ${formatCurrency(getTotalPayout() - getTotalStake())}`,
          }
        );
      } else if (successCount > 0) {
        clearBetSlip();
        toast.warning(
          `${successCount} bet${successCount > 1 ? 's' : ''} placed, ${failCount} failed`,
          {
            description: errors.length > 0 ? errors.join(", ") : undefined,
          }
        );
      } else {
        toast.error("Failed to place bets", {
          description: errors.length > 0 ? errors.join(", ") : "Please try again",
        });
      }
    } catch (_error) {
      toast.error("Failed to place bets. Please try again.");
    } finally {
      setPlacing(false);
    }
  }, [betSlip, customStraightBets, customParlayBets, customStakes, addPlacedBet, clearBetSlip]);

  return (
    <div className="space-y-3">
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-2">
        <div className="text-sm font-medium text-accent">Custom Bet Mode</div>
        <div className="text-xs text-muted-foreground">
          Configure multiple bets at once. Use checkboxes to mark bets as straight bets or combine them into a parlay. 
          Enter individual stakes for straight bets, or a single stake for the parlay group.
        </div>
      </div>

      {betSlip.bets.map((bet) => {
        const isStraight = customStraightBets.includes(bet.id);
        const isParlay = customParlayBets.includes(bet.id);
        const stake = customStakes[bet.id] || 0;

        return (
          <div key={bet.id} className={`border rounded-lg p-3 space-y-3 transition-all ${
            isStraight || isParlay 
              ? 'border-accent/30 bg-accent/5' 
              : 'border-border hover:border-border/60'
          }`}>
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
              <div className={`flex items-center gap-2 p-2 rounded ${isStraight ? 'bg-green-50 border border-green-200' : 'hover:bg-muted/30'} transition-colors`}>
                <Checkbox
                  id={`straight-${bet.id}`}
                  checked={isStraight}
                  onCheckedChange={() => toggleCustomStraight(bet.id)}
                />
                <label
                  htmlFor={`straight-${bet.id}`}
                  className="text-sm font-medium cursor-pointer select-none"
                >
                  Straight Bet
                </label>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded ${isParlay ? 'bg-blue-50 border border-blue-200' : 'hover:bg-muted/30'} transition-colors`}>
                <Checkbox
                  id={`parlay-${bet.id}`}
                  checked={isParlay}
                  onCheckedChange={() => toggleCustomParlay(bet.id)}
                />
                <label
                  htmlFor={`parlay-${bet.id}`}
                  className="text-sm font-medium cursor-pointer select-none"
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
                    className={`h-8 text-sm ${stake > 0 && (stake < MIN_STAKE || stake > MAX_STAKE) ? 'border-destructive' : ''}`}
                    min={MIN_STAKE}
                    max={MAX_STAKE}
                    step="1"
                    placeholder={`$${MIN_STAKE}-$${MAX_STAKE}`}
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
                className={`h-8 text-sm ${(customStakes["parlay"] || 0) > 0 && ((customStakes["parlay"] || 0) < MIN_STAKE || (customStakes["parlay"] || 0) > MAX_STAKE) ? 'border-destructive' : ''}`}
                min={MIN_STAKE}
                max={MAX_STAKE}
                step="1"
                placeholder={`$${MIN_STAKE}-$${MAX_STAKE}`}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Potential payout: {formatCurrency(calculateParlayPayout())}
            </div>
          </div>
        </div>
      )}

      {/* Place Bets Footer */}
      {(customStraightBets.length > 0 || customParlayBets.length > 0) && (
        <div className="border-t border-border pt-4 mt-4 space-y-3 bg-muted/20 -mx-3 px-3 pb-3">
          <div className="text-sm font-medium mb-2">
            Summary: {customStraightBets.length} straight bet{customStraightBets.length !== 1 ? 's' : ''} 
            {customParlayBets.length > 0 && ` + 1 parlay (${customParlayBets.length} legs)`}
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Total Stake:</span>
              <span className="font-semibold">{formatCurrency(getTotalStake())}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Potential Payout:</span>
              <span className="font-semibold text-accent">{formatCurrency(getTotalPayout())}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Potential Win:</span>
              <span className={getTotalPayout() > getTotalStake() ? 'text-green-600 font-medium' : ''}>{formatCurrency(getTotalPayout() - getTotalStake())}</span>
            </div>
          </div>
          
          <Button
            onClick={handlePlaceBets}
            disabled={placing || !isReadyToPlace() || getValidationMessage().includes("missing or finished games")}
            className="w-full"
            size="lg"
          >
            {placing ? "Placing Bets..." : `Place ${customStraightBets.length + (customParlayBets.length > 0 ? 1 : 0)} Bet${(customStraightBets.length + (customParlayBets.length > 0 ? 1 : 0)) > 1 ? 's' : ''}`}
          </Button>
          
          <div className={`text-xs text-center transition-colors ${
            isReadyToPlace() 
              ? 'text-green-600 font-medium' 
              : 'text-muted-foreground'
          }`}>
            {getValidationMessage()}
          </div>
        </div>
      )}

      {/* Empty State */}
      {customStraightBets.length === 0 && customParlayBets.length === 0 && betSlip.bets.length > 0 && (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <div className="text-sm text-muted-foreground mb-2">
            Use the checkboxes above to configure your bets
          </div>
          <div className="text-xs text-muted-foreground">
            Mark bets as &quot;Straight&quot; for individual wagers or &quot;Add to Parlay&quot; to combine them
          </div>
        </div>
      )}
    </div>
  );
}
