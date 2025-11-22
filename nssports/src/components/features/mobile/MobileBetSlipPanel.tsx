"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Trash } from "@phosphor-icons/react";
import { Button, Badge, Input } from "@/components/ui";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBetHistory } from "@/context";
import { useBetSlip, useNavigation } from "@/context";
import { useIsMobile } from "@/hooks";
import { formatOdds } from "@/lib/formatters";
import { formatSelectionLabel } from "@/components/bets/BetCard";
import { TeaserSelector } from "@/components/betting/TeaserSelector";
import { getTeaserConfig, getPointAdjustment, calculateAdjustedLine } from "@/types/teaser";
import type { TeaserType } from "@/types/teaser";
import { toast } from "sonner";
import type { Bet } from "@/types";
import { MobileCustomBetSlipContent } from "./MobileCustomBetSlipContent";
import { validateBetPlacement } from "@/lib/betting-rules";

// Minimal mobile betslip panel
export function MobileBetSlipPanel() {
  const { betSlip, removeBet, updateStake, setBetType, clearBetSlip } = useBetSlip();
  const { addPlacedBet } = useBetHistory();
  const { isBetSlipOpen, setIsBetSlipOpen } = useNavigation();
  const isMobile = useIsMobile();
  const [placing, setPlacing] = useState(false);

  const handlePlaceBets = async () => {
    if (betSlip.bets.length === 0) return;

    // Validate betting rules before placement (treat custom as parlay for validation)
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
      setPlacing(false);
      return;
    }
    
    // Validate teaser type selection
    if (betSlip.betType === "teaser" && !betSlip.teaserType) {
      toast.error("Please select a teaser type");
      setPlacing(false);
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
            } catch {
              failCount++;
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
            } catch {
              failCount++;
            }
          }
        }

        if (failCount === 0) {
          toast.success(`All bets placed! (${successCount} bet${successCount > 1 ? 's' : ''})`);
        } else if (successCount > 0) {
          toast.warning(`${successCount} bet${successCount > 1 ? 's' : ''} placed, ${failCount} failed`);
        } else {
          toast.error("Failed to place bets");
        }
        
        clearBetSlip();
        setTimeout(() => {
          setIsBetSlipOpen(false);
        }, 1500);
      } else {
        // Prepare teaser metadata if it's a teaser bet
        let teaserMetadata;
        if (betSlip.betType === "teaser" && betSlip.teaserType) {
          const config = getTeaserConfig(betSlip.teaserType as TeaserType);
          const adjustedLines: Record<string, number> = {};
          const originalLines: Record<string, number> = {};
          
          betSlip.bets.forEach(bet => {
            const adjustment = getPointAdjustment(betSlip.teaserType as TeaserType, bet.game.leagueId);
            originalLines[bet.id] = bet.line || 0;
            adjustedLines[bet.id] = calculateAdjustedLine(
              bet.line || 0,
              bet.selection,
              adjustment,
              bet.betType as "spread" | "total"
            );
          });
          
          teaserMetadata = {
            adjustedLines,
            originalLines,
            pointAdjustment: config.nbaPointAdjustment || config.pointAdjustment,
            pushRule: config.pushRule,
          };
        }
        
        // Handle single, parlay, or teaser mode
        await addPlacedBet(
          betSlip.bets,
          betSlip.betType,
          betSlip.totalStake,
          betSlip.totalPayout,
          betSlip.totalOdds,
          betSlip.teaserType,
          teaserMetadata
        );
        toast.success("Bet(s) placed successfully!");
        clearBetSlip();
        setTimeout(() => {
          setIsBetSlipOpen(false);
        }, 1500);
      }
    } catch {
      toast.error("Failed to place bets. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // Format bet description for display using the same logic as desktop
  // For teaser bets, pass the adjusted line instead of original line
  const formatBetDescription = (bet: Bet, adjustedLine?: number) => {
    const lineToUse = adjustedLine !== undefined ? adjustedLine : bet.line;
    return formatSelectionLabel(bet.betType, bet.selection, lineToUse, {
      homeTeam: { shortName: bet.game.homeTeam.shortName },
      awayTeam: { shortName: bet.game.awayTeam.shortName }
    }, bet.playerProp);
  };

  const formatMatchup = (bet: Bet) => {
    return `${bet.game.awayTeam.shortName} @ ${bet.game.homeTeam.shortName}`;
  };

  if (!isMobile) return null;

  return (
    <AnimatePresence>
      {isBetSlipOpen && (
        <motion.div
          initial={{ y: "100%", opacity: 0.7, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: "100%", opacity: 0.7, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 180, damping: 32, mass: 0.8 }}
          className="fixed right-0 bottom-0 left-0 z-[99] flex h-[85vh] max-h-[90vh] flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl backdrop-blur-xl"
        >
          {/* Compact header */}
          <div className="relative flex items-center p-4 border-b border-border/20 h-14">
            {/* Centered title */}
            <h3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-lg m-0">Bet Slip</h3>
            {/* Badge, left aligned */}
            {betSlip.bets.length > 0 && (
              <Badge variant="secondary" className="font-bold ml-1">
                {betSlip.bets.length}
              </Badge>
            )}
            {/* Close button, right aligned */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBetSlipOpen(false)}
              className="h-8 w-8 p-0 ml-auto"
            >
              <X size={18} />
            </Button>
          </div>

          {/* Bet type toggle - always show when there are bets */}
          {/* Note: Teaser bets can only be created from /teasers page */}
          {betSlip.bets.length > 0 && betSlip.betType !== "teaser" && (
            <div className="px-4 py-2">
              <Tabs className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-9">
                  <TabsTrigger
                    value="single"
                    className={`text-xs ${betSlip.betType === "single" ? "bg-background text-foreground shadow-sm" : ""}`}
                    onClick={() => setBetType("single")}
                  >
                    Single
                  </TabsTrigger>
                  <TabsTrigger
                    value="parlay"
                    className={`text-xs ${betSlip.betType === "parlay" ? "bg-background text-foreground shadow-sm" : ""}`}
                    disabled={betSlip.bets.length < 2}
                    onClick={() => setBetType("parlay")}
                  >
                    Parlay
                  </TabsTrigger>
                  <TabsTrigger
                    value="custom"
                    className={`text-xs ${betSlip.betType === "custom" ? "bg-background text-foreground shadow-sm" : ""}`}
                    onClick={() => setBetType("custom")}
                  >
                    Custom
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Compact bet content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4 space-y-3">
              {betSlip.bets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-lg font-semibold text-muted-foreground mb-2">
                    Your bet slip is empty
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Tap odds on games to add bets
                  </div>
                </div>
              ) : betSlip.betType === "custom" ? (
                <MobileCustomBetSlipContent />
              ) : betSlip.betType === "teaser" ? (
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
                    <div className="bg-card border-2 border-blue-500/20 rounded-xl p-3 space-y-3">
                      {/* Teaser header */}
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-base">
                          Teaser Slip
                        </div>
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono px-3 py-1 text-sm font-bold">
                          {formatOdds(betSlip.totalOdds)}
                        </Badge>
                      </div>

                      {/* Teaser legs */}
                      <div className="space-y-2">
                        {betSlip.bets.map((bet, index) => {
                          // Calculate adjusted line for display
                          let adjustedLine = bet.line || 0;
                          let pointAdjustment = 0;
                          
                          if (betSlip.teaserType) {
                            pointAdjustment = getPointAdjustment(betSlip.teaserType as TeaserType, bet.game.leagueId);
                            adjustedLine = calculateAdjustedLine(
                              bet.line || 0,
                              bet.selection,
                              pointAdjustment,
                              bet.betType as "spread" | "total"
                            );
                          }
                          
                          return (
                            <div
                              key={bet.id}
                              className="flex items-start justify-between py-2 border-b border-border/10 last:border-b-0"
                            >
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <div className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium leading-tight whitespace-pre-line">
                                    {formatBetDescription(bet, adjustedLine)}
                                  </div>
                                  {pointAdjustment > 0 && bet.line !== undefined && bet.line !== null && (
                                    <div className="text-xs text-blue-400 leading-tight mt-0.5">
                                      <span className="text-muted-foreground line-through">{bet.line > 0 ? '+' : ''}{bet.line}</span>
                                      {' → '}
                                      <span className="font-semibold">{adjustedLine > 0 ? '+' : ''}{adjustedLine}</span>
                                      {' '}
                                      <span className="text-blue-400/70">({pointAdjustment > 0 ? '+' : ''}{pointAdjustment} pts)</span>
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground leading-tight">
                                    {formatMatchup(bet)}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBet(bet.id)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash size={10} />
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Teaser Summary */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/20 mt-3">
                        <div className="flex items-end gap-4 flex-1">
                          {/* Teaser Stake */}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-2">
                              Stake
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-muted-foreground">$</span>
                              <Input
                                type="number"
                                value={betSlip.bets[0]?.stake || 10}
                                onChange={(e) =>
                                  updateStake(
                                    betSlip.bets[0].id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-9 text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>

                          {/* To Win */}
                          <div className="flex-1 text-center">
                            <div className="text-xs text-muted-foreground mb-2">
                              To Win
                            </div>
                            <div className="text-sm font-bold text-white py-2.5 px-3 bg-white/10 rounded-md border border-white/30">
                              $
                              {(betSlip.totalPayout - betSlip.totalStake).toFixed(2)}
                            </div>
                          </div>

                          {/* Total */}
                          <div className="flex-1 text-center">
                            <div className="text-xs text-muted-foreground mb-2">
                              Total
                            </div>
                            <div className="text-sm font-bold text-blue-400 py-2.5 px-3 bg-blue-500/10 rounded-md border border-blue-500/30">
                              ${betSlip.totalPayout.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : betSlip.betType === "single" ? (
                betSlip.bets.map((bet) => (
                  <div
                    key={bet.id}
                    className="bg-card border border-border rounded-xl p-4 space-y-4"
                  >
                    {/* Bet header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Matchup at top - aligned left */}
                        <div className="text-[10px] sm:text-xs text-muted-foreground/60 uppercase tracking-wide font-medium leading-tight mb-3">
                          {formatMatchup(bet)}
                        </div>
                        {/* Player name/bet description - with odds badge aligned */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 font-semibold text-base leading-tight whitespace-pre-line">
                            {formatBetDescription(bet)}
                          </div>
                          <Badge className="bg-accent/10 text-accent border-accent/20 font-mono px-3 py-1 text-sm font-normal shrink-0">
                            {formatOdds(bet.odds)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Well-Spaced Professional Summary */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/20">
                      <div className="flex items-end gap-4 flex-1">
                        {/* Stake Input - Well Proportioned */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-2">
                            Stake
                          </div>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={bet.stake || ""}
                            onChange={(e) =>
                              updateStake(
                                bet.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-9 text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>

                        {/* To Win - Well Spaced */}
                        <div className="flex-1 text-center">
                          <div className="text-xs text-muted-foreground mb-2">
                            To Win
                          </div>
                          <div className="text-sm font-bold text-white py-2.5 px-3 bg-white/10 rounded-md border border-white/30">
                            $
                            {bet.stake > 0
                              ? (bet.potentialPayout - bet.stake).toFixed(2)
                              : "0.00"}
                          </div>
                        </div>

                        {/* Total - Well Spaced */}
                        <div className="flex-1 text-center">
                          <div className="text-xs text-muted-foreground mb-2">
                            Total
                          </div>
                          <div className="text-sm font-bold text-accent py-2.5 px-3 bg-accent/10 rounded-md border border-accent/30">
                            ${bet.potentialPayout.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Delete Button - Well Positioned */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBet(bet.id)}
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive ml-4"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>

                    {/* Place Button - Well Positioned */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/20">
                      <div className="flex items-end gap-4 flex-1">
                        {/* Additional space or content can go here */}
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={async () => {
                          if (bet.stake > 0) {
                            setPlacing(true);
                            try {
                              await addPlacedBet(
                                [bet],
                                "single",
                                bet.stake,
                                bet.potentialPayout,
                                bet.odds
                              );
                              toast.success("Bet placed!");
                              removeBet(bet.id);
                            } catch {
                              toast.error("Failed to place bet");
                            } finally {
                              setPlacing(false);
                            }
                          }
                        }}
                        disabled={placing || bet.stake <= 0}
                        className="ml-2 h-9 px-4"
                        aria-label="Place Single Bet"
                        title="Place Single Bet"
                      >
                        {placing ? "Placing..." : "Place"}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-card border-2 border-accent/20 rounded-xl p-3 space-y-3">
                  {/* Parlay header */}
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-base">
                      Parlay
                    </div>
                    <Badge className="bg-accent/10 text-accent border-accent/20 font-mono px-3 py-1 text-sm font-bold">
                      {formatOdds(betSlip.totalOdds)}
                    </Badge>
                  </div>

                  {/* Parlay legs */}
                  <div className="space-y-2">
                    {betSlip.bets.map((bet, index) => (
                      <div
                        key={bet.id}
                        className="flex items-start justify-between py-2 border-b border-border/10 last:border-b-0"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className="w-5 h-5 bg-accent/20 text-accent rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium leading-tight whitespace-pre-line">
                              {formatBetDescription(bet)}
                            </div>
                            <div className="text-xs text-muted-foreground leading-tight">
                              {formatMatchup(bet)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge
                            variant="outline"
                            className="font-mono px-2 py-0.5 text-xs"
                          >
                            {formatOdds(bet.odds)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBet(bet.id)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash size={10} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Well-Spaced Parlay Summary */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/20 mt-3">
                    <div className="flex items-end gap-4 flex-1">
                      {/* Parlay Stake - Well Proportioned */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-2">
                          Stake
                        </div>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={betSlip.bets[0]?.stake || ""}
                          onChange={(e) =>
                            betSlip.bets[0] &&
                            updateStake(
                              betSlip.bets[0].id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-9 text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      {/* To Win - Well Spaced */}
                      <div className="flex-1 text-center">
                        <div className="text-xs text-muted-foreground mb-2">
                          To Win
                        </div>
                        <div className="text-sm font-bold text-white py-2.5 px-3 bg-white/10 rounded-md border border-white/30">
                          $
                          {betSlip.totalPayout > betSlip.totalStake
                            ? (betSlip.totalPayout - betSlip.totalStake).toFixed(2)
                            : "0.00"}
                        </div>
                      </div>

                      {/* Total - Well Spaced */}
                      <div className="flex-1 text-center">
                        <div className="text-xs text-muted-foreground mb-2">
                          Total
                        </div>
                        <div className="text-sm font-bold text-accent py-2.5 px-3 bg-accent/10 rounded-md border border-accent/30">
                          ${betSlip.totalPayout.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compact footer */}
          {betSlip.bets.length > 0 && (
            <div className="border-t border-border/20 bg-muted/20 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>
                  Total Stake:{" "}
                  <span className="font-semibold">
                    ${betSlip.totalStake.toFixed(2)}
                  </span>
                </span>
                <span>
                  Payout:{" "}
                  <span className="font-semibold text-accent">
                    ${betSlip.totalPayout.toFixed(2)}
                  </span>
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearBetSlip}
                  className="flex-1 h-10"
                >
                  Clear
                </Button>
                <Button
                  onClick={handlePlaceBets}
                  disabled={placing || betSlip.totalStake === 0}
                  className="flex-[2] h-10"
                >
                  {placing
                    ? "Placing..."
                    : betSlip.betType === "parlay"
                      ? "Place Parlay"
                      : betSlip.betType === "teaser"
                        ? "Place Teaser"
                        : betSlip.betType === "single"
                          ? (betSlip.bets.length === 1
                              ? "Place Bet"
                              : `Place ${betSlip.bets.length} Bets`)
                          : (() => {
                              // Custom mode: count single bets + parlay (if selected)
                              const customStraightBets = betSlip.customStraightBets ?? [];
                              const customParlayBets = betSlip.customParlayBets ?? [];
                              const numBetSlips = customStraightBets.length + (customParlayBets.length > 0 ? 1 : 0);
                              return numBetSlips === 1
                                ? "Place Bet"
                                : `Place ${numBetSlips} Bets`;
                            })()
                  }
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
