"use client";

import { useBetSlip, useBetHistory } from "@/context";
import { useLenisScroll } from "@/hooks";
import { Button, Input, Separator } from "@/components/ui";
import { X, Stack, Target } from "@phosphor-icons/react/dist/ssr";
import { formatOdds, formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import { BetCardSingle, BetCardParlay } from "@/components/bets/BetCard";
import { CustomBetSlipContent } from "./CustomBetSlipContent";
import { TeaserSelector } from "@/components/betting/TeaserSelector";
import { validateBetPlacement } from "@/lib/betting-rules";

export function BetSlipPanel() {
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

    // Validate betting rules before placement
    const stakes = betSlip.bets.reduce((acc, bet) => {
      acc[bet.id] = bet.stake || 0;
      return acc;
    }, {} as { [betId: string]: number });

    const validationType: "single" | "parlay" | "teaser" | "round_robin" | "if_bet" | "reverse" | "bet_it_all" = betSlip.betType === "custom" ? "parlay" : betSlip.betType;
    // Validate teaserType to ensure it matches TeaserType
    const validTeaserTypes = [
      "2T_TEASER",
      "3T_SUPER_TEASER",
      "3T_TEASER",
      "4T_MONSTER_TEASER",
      "4T_TEASER",
      "5T_TEASER",
      "6T_TEASER",
      "7T_TEASER",
      "8T_TEASER"
    ];
    const teaserType =
      betSlip.betType === "teaser" &&
      validTeaserTypes.includes(betSlip.teaserType as string)
        ? (betSlip.teaserType as import("@/types/teaser").TeaserType)
        : undefined;
    const violation = validateBetPlacement(
      betSlip.bets, 
      validationType, 
      stakes,
      teaserType
    );
    if (violation) {
      toast.error(violation.message, {
        description: violation.rule.replace(/_/g, " "),
        duration: 4000,
      });
      return;
    }
    
    // Validate teaser type selection
    if (betSlip.betType === "teaser" && !betSlip.teaserType) {
      toast.error("Please select a teaser type");
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
        // Handle single, parlay, or teaser mode
        if (betSlip.betType === "teaser") {
          // Construct teaser metadata with adjusted lines
          const { getTeaserConfig, calculateAdjustedLine } = await import("@/types/teaser");
          const config = getTeaserConfig(betSlip.teaserType as import("@/types/teaser").TeaserType);
          
          const adjustedLines: Record<string, number> = {};
          const originalLines: Record<string, number> = {};
          
          betSlip.bets.forEach((bet) => {
            if (bet.line !== undefined && bet.line !== null) {
              originalLines[bet.id] = bet.line;
              // Get the correct point adjustment for the league
              const leagueId = bet.game?.leagueId?.toUpperCase();
              const isNBA = leagueId === "NBA" || leagueId === "NCAAB";
              const pointAdjustment = isNBA && config.nbaPointAdjustment 
                ? config.nbaPointAdjustment 
                : config.pointAdjustment;
              
              adjustedLines[bet.id] = calculateAdjustedLine(
                bet.line,
                bet.selection,
                pointAdjustment,
                bet.betType as "spread" | "total"
              );
            }
          });
          
          await addPlacedBet(
            betSlip.bets,
            "teaser",
            betSlip.totalStake,
            betSlip.totalPayout,
            betSlip.totalOdds,
            betSlip.teaserType,
            {
              adjustedLines,
              originalLines,
              pointAdjustment: config.pointAdjustment,
              pushRule: config.pushRule,
            }
          );
        } else {
          // Handle single or parlay mode
          await addPlacedBet(
            betSlip.bets,
            betSlip.betType,
            betSlip.totalStake,
            betSlip.totalPayout,
            betSlip.totalOdds
          );
        }
        clearBetSlip();
        const betTypeLabel = betSlip.betType === "parlay" ? "Parlay" : betSlip.betType === "teaser" ? "Teaser" : "Bet";
        toast.success(
          `${betTypeLabel} placed successfully!`,
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
        
        {/* Bet Type Tabs - Teaser bets can only be created from /teasers page */}
        {betSlip.betType !== "teaser" && (
          <div className="grid grid-cols-3 gap-1">
            <Button
              variant={betSlip.betType === "single" ? "default" : "outline"}
              size="sm"
              onClick={() => setBetType("single")}
              className="text-xs"
            >
              Single
            </Button>
            <Button
              variant={betSlip.betType === "parlay" ? "default" : "outline"}
              size="sm"
              onClick={() => setBetType("parlay")}
              disabled={betSlip.bets.length < 2}
              className="text-xs"
            >
              Parlay
            </Button>
            <Button
              variant={betSlip.betType === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setBetType("custom")}
              className="text-xs"
            >
              Custom
            </Button>
          </div>
        )}
        
        {betSlip.betType === "parlay" && betSlip.bets.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Parlay mode: all bets must win
          </div>
        )}
        
        {betSlip.betType === "teaser" && betSlip.bets.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Adjust spreads/totals in your favor
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

        {/* Teaser Mode - Only from /teasers page */}
        {betSlip.betType === "teaser" && (
          <div className="space-y-3">
            {/* Teaser Page Indicator */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
              <div className="text-sm font-semibold text-blue-400">
                🎯 Teaser Bets
              </div>
              <div className="text-xs text-blue-400/70 mt-1">
                From /teasers page • Adjusted lines
              </div>
            </div>

            <TeaserSelector />
            
            {betSlip.teaserType && betSlip.bets.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="text-sm font-medium mb-3">Teaser Legs ({betSlip.bets.length})</h4>
                <div className="space-y-2">
                  {betSlip.bets.map((bet) => (
                    <div key={bet.id} className="flex justify-between items-center text-xs p-2 bg-background/50 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{bet.game.awayTeam.shortName} @ {bet.game.homeTeam.shortName}</div>
                        <div className="text-muted-foreground">{bet.betType} - {bet.selection}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBet(bet.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <Separator className="my-3" />
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Stake ($)</label>
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
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Teaser Odds:</span>
                    <span className="font-medium text-accent">{formatOdds(betSlip.totalOdds)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Potential Payout:</span>
                    <span className="font-semibold">{formatCurrency(betSlip.totalPayout)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
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
            betSlip.totalStake <= 0
          }
        >
          {placing ? "Placing..." : `Place ${betSlip.betType === "parlay" ? "Parlay" : betSlip.betType === "custom" ? "Bets" : "Bets"}`}
        </Button>
      </div>
    </div>
  );
}
