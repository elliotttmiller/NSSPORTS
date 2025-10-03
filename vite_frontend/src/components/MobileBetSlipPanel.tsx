import { useState } from "react";
import type { Bet, Game } from "@/types";
import { useBetSlip } from "@/context/BetSlipContext";
import { useBetsContext } from "@/context/BetsContext";
import { useNavigation } from "@/context/NavigationContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { formatBetDescription, formatMatchup } from "@/lib/betFormatters";
import { AnimatePresence, motion } from "framer-motion";
import { X, TrendUp, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatOdds } from "@/lib/formatters";
import { SmoothScrollContainer } from "@/components/VirtualScrolling";

// Minimal mobile betslip panel, can be styled further
export function MobileBetSlipPanel() {
  const { betSlip, removeBet, updateStake, setBetType, clearBetSlip } =
    useBetSlip();
  const { addBet, refreshBets } = useBetsContext();
  const { navigation, setIsBetSlipOpen } = useNavigation();
  const isMobile = useIsMobile();
  const [placing, setPlacing] = useState(false);
  const [toast, setToast] = useState<string>("");

  const isOpen = navigation.isBetSlipOpen;

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2000);
  };

  const handlePlaceBets = async () => {
    if (betSlip.bets.length === 0) return;

    setPlacing(true);

    try {
      if (betSlip.betType === "single") {
        for (const bet of betSlip.bets) {
          // Create a proper Bet object with all required fields
          const newBet: Bet = {
            id: crypto.randomUUID(), // Generate new ID for the placed bet
            gameId: bet.gameId,
            betType: bet.betType,
            selection: bet.selection,
            odds: bet.odds,
            line: bet.line,
            stake: bet.stake,
            potentialPayout: bet.potentialPayout,
            game: bet.game,
            legs: bet.legs,
            periodOrQuarterOrHalf: bet.periodOrQuarterOrHalf,
            playerProp: bet.playerProp,
          };
          await addBet(newBet);
        }
      } else {
        // For parlay, create a single bet with all legs
        const parlayBet: Bet = {
          id: crypto.randomUUID(),
          gameId: "parlay",
          betType: "parlay" as const,
          selection: betSlip.bets[0]?.selection || "over", // Default selection for parlay
          odds: betSlip.totalOdds,
          line: undefined,
          stake: betSlip.totalStake,
          potentialPayout: betSlip.totalPayout,
          game: betSlip.bets[0]?.game || ({} as Game), // Use first game as representative
          legs: betSlip.bets, // This preserves individual bet details
        };
        await addBet(parlayBet);
      }

      // Refresh active bets to show newly placed bets
      await refreshBets();

      showToast("Bet(s) placed successfully!");
      clearBetSlip();

      // Close panel after a short delay
      setTimeout(() => {
        setIsBetSlipOpen(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to place bets:", error);
      showToast("Failed to place bets. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (!isMobile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed right-0 bottom-0 left-0 z-[99] flex h-[85vh] max-h-[90vh] flex-col rounded-t-2xl border-t border-border bg-background/95 shadow-2xl backdrop-blur-xl"
        >
          {/* Compact header */}
          <div className="flex items-center justify-between p-4 border-b border-border/20">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg">Bet Slip</h3>
              {betSlip.bets.length > 0 && (
                <Badge variant="secondary" className="font-bold">
                  {betSlip.bets.length}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBetSlipOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X size={18} />
            </Button>
          </div>

          {/* Bet type toggle - always show when there are bets */}
          {betSlip.bets.length > 0 && (
            <div className="px-4 py-2">
              <Tabs
                value={betSlip.betType}
                onValueChange={setBetType}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="single" className="text-sm">
                    Straight
                  </TabsTrigger>
                  <TabsTrigger
                    value="parlay"
                    className="text-sm"
                    disabled={betSlip.bets.length < 2}
                  >
                    Parlay {betSlip.bets.length < 2 && "(2+ bets)"}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Compact bet content */}
          <SmoothScrollContainer
            className="flex-1 min-h-0"
            showScrollbar={false}
          >
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
              ) : betSlip.betType === "single" ? (
                betSlip.bets.map((bet) => (
                  <div
                    key={bet.id}
                    className="bg-card border border-border rounded-xl p-3 space-y-3"
                  >
                    {/* Bet header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-semibold text-sm leading-tight mb-1">
                          {formatBetDescription(bet)}
                        </div>
                        <div className="text-xs text-muted-foreground leading-tight">
                          {formatMatchup(bet)}
                        </div>
                      </div>
                      <Badge className="bg-accent/10 text-accent border-accent/20 font-mono px-3 py-1 text-sm font-bold">
                        {formatOdds(bet.odds)}
                      </Badge>
                    </div>

                    {/* Well-Spaced Professional Summary */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/20 mt-3">
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
                                parseFloat(e.target.value) || 0,
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
                          <div className="text-sm font-bold text-green-600 dark:text-green-400 py-2.5 px-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
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
                  </div>
                ))
              ) : (
                <div className="bg-card border-2 border-accent/20 rounded-xl p-3 space-y-3">
                  {/* Parlay header */}
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-base">
                      Parlay ({betSlip.bets.length} legs)
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
                            <div className="text-sm font-medium leading-tight">
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
                              parseFloat(e.target.value) || 0,
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
                        <div className="text-sm font-bold text-green-600 dark:text-green-400 py-2.5 px-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                          $
                          {betSlip.totalPayout > betSlip.totalStake
                            ? (
                                betSlip.totalPayout - betSlip.totalStake
                              ).toFixed(2)
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
          </SmoothScrollContainer>

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
                  {placing ? "Placing..." : "Place Bet"}
                </Button>
              </div>

              {toast && (
                <div className="text-center text-xs text-accent bg-accent/10 rounded py-1">
                  {toast}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
