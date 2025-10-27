"use client";

import type { Bet } from "@/types";
import { useBetSlip, useBetHistory } from "@/context";
import { useLenisScroll } from "@/hooks";
import { Button, Input, Separator } from "@/components/ui";
import { X, Stack, Target } from "@phosphor-icons/react/dist/ssr";
import { formatOdds, formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import { BetCardSingle, BetCardParlay } from "@/components/bets/BetCard";
import { CustomBetSlipContent } from "./CustomBetSlipContent";

export function BetSlipPanel() {
  // Restriction: Cannot parlay both team moneylines from the same game
  function isParlayValid(bets: Bet[]): boolean {
    const moneylineBetsByGame: Record<string, Set<string>> = {};
    for (const bet of bets) {
      if (bet.betType === "moneyline") {
        if (!moneylineBetsByGame[bet.game.id]) {
          moneylineBetsByGame[bet.game.id] = new Set<string>();
        }
        moneylineBetsByGame[bet.game.id]!.add(bet.selection);
      }
    }
    // If any game has both 'home' and 'away' moneyline in the parlay, return false
    return !Object.values(moneylineBetsByGame).some((selections: Set<string>) =>
      selections.has("home") && selections.has("away")
    );
  }
  const { betSlip, removeBet, updateStake, setBetType, clearBetSlip } = useBetSlip();
  const { addPlacedBet } = useBetHistory();
  const [placing, setPlacing] = useState(false);
  
  // Initialize Lenis smooth scrolling for bet slip content
  const { containerRef } = useLenisScroll({
    enabled: true,
    duration: 1.2,
    lerp: 0.1,
    easing: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  });

  const handlePlaceBet = useCallback(async () => {
    if (betSlip.bets.length === 0) {
      toast.error("No bets in slip");
      return;
    }

    if (betSlip.totalStake <= 0) {
      toast.error("Please enter a stake amount");
      return;
    }

    setPlacing(true);

    try {
      if (betSlip.betType === "custom") {
        // Handle custom mode: place multiple bets
        const customStraightBets = betSlip.customStraightBets || [];
        const customParlayBets = betSlip.customParlayBets || [];
        const customStakes = betSlip.customStakes || {};
        
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        // Place straight bets
        for (const betId of customStraightBets) {
          const bet = betSlip.bets.find((b) => b.id === betId);
          const stake = customStakes[betId] || 0;
          
          if (bet && stake > 0) {
            try {
              await addPlacedBet(
                [bet],
                "single",
                stake,
                stake * ((bet.odds > 0 ? bet.odds / 100 : 100 / Math.abs(bet.odds)) + 1),
                bet.odds
              );
              successCount++;
            } catch (error) {
              failCount++;
              errors.push(`Failed to place bet on ${bet.game.awayTeam.shortName} @ ${bet.game.homeTeam.shortName}`);
              console.error("Failed to place straight bet:", error);
            }
          }
        }

        // Place parlay bet
        if (customParlayBets.length > 0) {
          const parlayStake = customStakes["parlay"] || 0;
          if (parlayStake > 0) {
            const parlayBets = betSlip.bets.filter((b) => customParlayBets.includes(b.id));
            
            // Calculate parlay odds
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
            } catch (error) {
              failCount++;
              errors.push("Failed to place parlay bet");
              console.error("Failed to place parlay bet:", error);
            }
          }
        }

        if (failCount === 0) {
          clearBetSlip();
          toast.success(
            `All bets placed successfully! (${successCount} bet${successCount > 1 ? 's' : ''})`,
            {
              description: `Total Stake: ${formatCurrency(betSlip.totalStake)}`,
            }
          );
        } else if (successCount > 0) {
          clearBetSlip();
          toast.warning(
            `${successCount} bet${successCount > 1 ? 's' : ''} placed, ${failCount} failed`,
            {
              description: errors.join(", "),
            }
          );
        } else {
          toast.error("Failed to place bets", {
            description: errors.join(", "),
          });
        }
      } else {
        // Handle single or parlay mode
        await addPlacedBet(
          betSlip.bets,
          betSlip.betType,
          betSlip.totalStake,
          betSlip.totalPayout,
          betSlip.totalOdds
        );
        clearBetSlip();
        toast.success(
          `${betSlip.betType === "parlay" ? "Parlay" : "Bet"} placed successfully!`,
          {
            description: `Stake: ${formatCurrency(betSlip.totalStake)} • Potential Win: ${formatCurrency(betSlip.totalPayout - betSlip.totalStake)}`,
          },
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to place bet. Please try again.";
      toast.error(errorMessage);
    } finally {
      setPlacing(false);
    }
  }, [betSlip, addPlacedBet, clearBetSlip]);

  if (betSlip.bets.length === 0) {
    return (
      <div className="w-96 border-l border-border h-full flex flex-col bg-transparent">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Stack size={20} className="text-accent" />
            Bet Slip
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add selections to create bets
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <Target size={48} className="mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              Click on odds to add bets to your slip
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
  <div className="w-96 border-l border-border h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Stack size={20} className="text-accent" />
            Bet Slip
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearBetSlip}
            className="h-8 px-2 text-xs"
          >
            Clear All
          </Button>
        </div>
        
        {/* Bet Type Tabs */}
        <div className="flex gap-2">
          <Button
            variant={betSlip.betType === "single" ? "default" : "outline"}
            size="sm"
            onClick={() => setBetType("single")}
            className="flex-1"
          >
            Single Bets
          </Button>
          <Button
            variant={betSlip.betType === "parlay" ? "default" : "outline"}
            size="sm"
            onClick={() => setBetType("parlay")}
            className="flex-1"
            disabled={!isParlayValid(betSlip.bets)}
            title={!isParlayValid(betSlip.bets) ? "Cannot parlay both team moneylines from the same game" : undefined}
          >
            Parlay ({betSlip.bets.length})
          </Button>
          <Button
            variant={betSlip.betType === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => setBetType("custom")}
            className="flex-1"
          >
            Custom
          </Button>
        </div>
        
        {betSlip.betType === "parlay" && betSlip.bets.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Parlay mode: all bets must win
            {!isParlayValid(betSlip.bets) && (
              <div className="text-destructive font-semibold mt-1">
                You cannot parlay both team moneylines from the same game.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bets List - Lenis Smooth Scrolling */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <div className="p-4 space-y-3">
          {betSlip.betType === "custom" ? (
            <CustomBetSlipContent />
          ) : betSlip.betType === "single" && betSlip.bets.map((bet) => (
            <BetCardSingle
              key={bet.id}
              id={bet.id}
              betType={bet.betType}
              placedAt={new Date()}
              status={"pending"}
              selection={bet.selection}
              odds={bet.odds}
              line={bet.line}
              stake={bet.stake}
              payout={bet.potentialPayout}
              game={{ homeTeam: { shortName: bet.game.homeTeam.shortName }, awayTeam: { shortName: bet.game.awayTeam.shortName } }}
              playerProp={bet.playerProp}
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
            >
              {betSlip.betType === "single" && (
                <div className="mt-3">
                  <label className="text-xs text-muted-foreground mb-1 block">Stake</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">$</span>
                    <Input
                      type="number"
                      value={bet.stake}
                      onChange={(e) => updateStake(bet.id, parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                      min="0"
                      max="10000"
                      step="1"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    To win: {formatCurrency(bet.potentialPayout - bet.stake)}
                  </div>
                </div>
              )}
            </BetCardSingle>
          ))}

        {/* Parlay Stake */}
        {betSlip.betType === "parlay" && betSlip.bets.length > 0 && (
          <BetCardParlay
            id="parlay-slip"
            betType="parlay"
            placedAt={new Date()}
            status={"pending"}
            stake={betSlip.bets[0]?.stake || 0}
            payout={betSlip.totalPayout}
            legs={betSlip.bets.map((b) => ({
              game: { homeTeam: { shortName: b.game.homeTeam.shortName }, awayTeam: { shortName: b.game.awayTeam.shortName } },
              selection: b.selection,
              odds: b.odds,
              line: b.line,
              betType: b.betType,
              playerProp: b.playerProp,
            }))}
            showTotals={false}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">Total Stake ($)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">$</span>
                <Input
                  type="number"
                  value={betSlip.bets[0]?.stake || 10}
                  onChange={(e) => updateStake(betSlip.bets[0].id, parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                  min="0"
                  max="10000"
                  step="1"
                />
              </div>
              <Separator className="my-3" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parlay Odds:</span>
                  <span className="font-medium text-accent">{formatOdds(betSlip.totalOdds)}</span>
                </div>
              </div>
            </div>
          </BetCardParlay>
        )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Stake:</span>
            <span className="font-semibold">{formatCurrency(betSlip.totalStake)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Potential Payout:</span>
            <span className="font-semibold text-accent">
              {formatCurrency(betSlip.totalPayout)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Profit:</span>
            <span className="font-semibold text-accent">
              {formatCurrency(betSlip.totalPayout - betSlip.totalStake)}
            </span>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handlePlaceBet}
          disabled={
            placing ||
            betSlip.bets.length === 0 ||
            betSlip.totalStake <= 0 ||
            (betSlip.betType === "parlay" && !isParlayValid(betSlip.bets))
          }
        >
          {placing ? "Placing..." : `Place ${betSlip.betType === "parlay" ? "Parlay" : betSlip.betType === "custom" ? "Bets" : "Bets"}`}
        </Button>
      </div>
    </div>
  );
}
