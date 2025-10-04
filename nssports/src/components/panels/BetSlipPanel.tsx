"use client";

import type { Bet } from "@/types";
import { useBetSlip, useBetHistory } from "@/context";
import { useLenisScroll } from "@/hooks";
import { Button, Card, CardContent, Input, Badge, Separator } from "@/components/ui";
import { X, Stack, Target } from "@phosphor-icons/react/dist/ssr";
import { formatOdds, formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { useCallback } from "react";

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

    try {
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
    } catch {
      toast.error("Failed to place bet. Please try again.");
    }
  }, [betSlip, addPlacedBet, clearBetSlip]);

  if (betSlip.bets.length === 0) {
    return (
      <div className="w-96 bg-card border-l border-border h-full flex flex-col">
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
    <div className="w-96 bg-card border-l border-border h-full flex flex-col">
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
          {betSlip.bets.map((bet) => (
          <Card key={bet.id} className="relative">
            <CardContent className="p-3">
              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeBet(bet.id)}
                className="absolute top-2 right-2 h-6 w-6 p-0"
              >
                <X size={14} />
              </Button>

              {/* Bet Details */}
              <div className="pr-8">
                <div className="text-xs text-muted-foreground mb-1">
                  {bet.betType.toUpperCase()}
                </div>
                <div className="font-medium text-sm">
                  {bet.selection === "over" ? "Over" : bet.selection === "under" ? "Under" : 
                   bet.selection === "away" ? bet.game.awayTeam.shortName : bet.game.homeTeam.shortName}
                  {bet.line && ` ${bet.line > 0 ? "+" : ""}${bet.line}`}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {bet.game.awayTeam.shortName} @ {bet.game.homeTeam.shortName}
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="text-xs">
                    {formatOdds(bet.odds)}
                  </Badge>
                </div>

                {/* Stake Input */}
                {betSlip.betType === "single" && (
                  <div className="mt-3">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Stake
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">$</span>
                      <Input
                        type="number"
                        value={bet.stake}
                        onChange={(e) =>
                          updateStake(bet.id, parseFloat(e.target.value) || 0)
                        }
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
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Parlay Stake */}
        {betSlip.betType === "parlay" && betSlip.bets.length > 0 && (
          <Card className="bg-accent/5">
            <CardContent className="p-4">
              <div className="text-sm font-medium mb-2">Parlay (3 picks)</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">Total Stake ($)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">$</span>
                <Input
                  type="number"
                  value={betSlip.bets[0]?.stake || 10}
                  onChange={(e) =>
                    updateStake(betSlip.bets[0].id, parseFloat(e.target.value) || 0)
                  }
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
                  <span className="font-medium text-accent">
                    {formatOdds(betSlip.totalOdds)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
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

        <Button className="w-full" size="lg" onClick={handlePlaceBet}>
          Place {betSlip.betType === "parlay" ? "Parlay" : "Bets"}
        </Button>
      </div>
    </div>
  );
}
