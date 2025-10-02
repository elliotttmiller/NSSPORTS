import { useState } from "react";
import type { Bet } from "@/types";
import { useBetSlip } from "@/context/BetSlipContext";
import { formatOdds } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Trash,
  Calculator,
  Target,
  Stack,
  TrendUp,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SmoothScrollContainer } from "@/components/VirtualScrolling";

export const ActionHubPanel = () => {
  const { betSlip, removeBet, updateStake, setBetType, clearBetSlip } =
    useBetSlip();
  const [isPlacing, setIsPlacing] = useState(false);

  const handleStakeChange = (betId: string, value: string) => {
    const stake = parseFloat(value) || 0;
    if (stake >= 0) {
      updateStake(betId, stake);
    }
  };

  const handlePlaceBet = async () => {
    if (betSlip.bets.length === 0) {
      toast.error("No bets selected");
      return;
    }

    if (betSlip.totalStake === 0) {
      toast.error("Please enter stake amounts");
      return;
    }

    setIsPlacing(true);

    // Simulate placing bet
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(
        `${betSlip.betType === "single" ? "Bets" : "Parlay"} placed! Potential payout: $${betSlip.totalPayout.toFixed(2)}`,
      );
      clearBetSlip();
    } catch {
      toast.error("Failed to place bet. Please try again.");
    } finally {
      setIsPlacing(false);
    }
  };

  const formatBetDescription = (bet: Bet) => {
    switch (bet.betType) {
      case "spread": {
        const team =
          bet.selection === "home"
            ? bet.game.homeTeam.shortName
            : bet.game.awayTeam.shortName;
        const line =
          bet.line !== undefined
            ? bet.line > 0
              ? `+${bet.line}`
              : bet.line
            : "";
        return `${team} ${line}`;
      }
      case "moneyline": {
        const team =
          bet.selection === "home"
            ? bet.game.homeTeam.shortName
            : bet.game.awayTeam.shortName;
        return `${team} Win`;
      }
      case "total": {
        const overUnder = bet.selection === "over" ? "Over" : "Under";
        return `${overUnder} ${bet.line ?? ""}`;
      }
      case "player_prop": {
        if (bet.playerProp) {
          return `${bet.playerProp.playerName} ${bet.playerProp.statType} ${bet.selection === "over" ? "Over" : "Under"} ${bet.line ?? ""}`;
        }
        return "Player Prop";
      }
      case "parlay":
        return "Parlay Bet";
      default:
        return "Unknown Bet";
    }
  };

  if (betSlip.bets.length === 0) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="actionhubpanel-empty"
          className="h-full bg-muted/10 flex flex-col overflow-hidden"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="p-4 border-b border-border flex-shrink-0"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <Calculator size={20} className="text-accent" />
              <h2 className="text-lg font-semibold text-card-foreground">
                Bet Slip
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Build your perfect bet
            </p>
          </motion.div>

          <div className="flex-1 flex items-center justify-center p-6">
            <motion.div
              className="text-center max-w-xs"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-accent/20 to-accent/40 rounded-full flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Calculator size={32} className="text-accent" />
              </motion.div>
              <h3 className="font-semibold text-card-foreground mb-3 text-lg">
                Build Your Bet
              </h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Click on odds in the games to create single bets or combine them
                into a parlay.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                    <Target size={14} className="text-accent" />
                  </div>
                  <span className="text-muted-foreground">
                    Single bets win independently
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                    <Stack size={14} className="text-accent" />
                  </div>
                  <span className="text-muted-foreground">
                    Parlays multiply your winnings
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="actionhubpanel-main"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
        className="h-full bg-muted/10 flex flex-col overflow-hidden z-40"
        style={{ "--bet-slip-panel-width": "340px" } as React.CSSProperties}
      >
        <motion.div
          className="p-4 border-b border-border flex-shrink-0"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator size={20} className="text-accent" />
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">
                  Bet Slip
                </h2>
                <p className="text-sm text-muted-foreground">
                  {betSlip.bets.length} selection
                  {betSlip.bets.length > 1 ? "s" : ""} •{" "}
                  {betSlip.betType === "single" ? "Single Bets" : "Parlay"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearBetSlip}
              className="text-destructive hover:text-destructive"
            >
              Clear All
            </Button>
          </div>
        </motion.div>
  <SmoothScrollContainer className="flex-1 min-h-0" maxHeight="100vh" showScrollbar={false}>
          <div className="p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="mb-4">
                <Tabs
                  value={betSlip.betType}
                  onValueChange={(value) =>
                    setBetType(value as "single" | "parlay")
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="single"
                      className="flex items-center gap-2"
                    >
                      <Target size={14} />
                      Single Bets
                    </TabsTrigger>
                    <TabsTrigger
                      value="parlay"
                      className="flex items-center gap-2"
                    >
                      <Stack size={14} />
                      Parlay
                      {betSlip.bets.length > 1 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {betSlip.bets.length}x
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <div className="mt-3 p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {betSlip.betType === "single" ? (
                        <>
                          <Target size={12} />
                          <span>Each bet wins independently</span>
                        </>
                      ) : (
                        <>
                          <Stack size={12} />
                          <span>Parlay mode: all bets must win</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {betSlip.betType === "single" ? (
                      <AnimatePresence mode="popLayout">
                        {betSlip.bets.map((bet, index) => (
                          <motion.div
                            key={bet.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -100, scale: 0.95 }}
                            transition={{
                              duration: 0.3,
                              delay: index * 0.05,
                              ease: [0.4, 0.0, 0.2, 1],
                            }}
                            layout
                            whileHover={{ y: -2 }}
                          >
                            <Card className="relative border border-border/30 shadow-sm ring-1 ring-border/20 hover:border-border/50 bg-card/50 transition-colors duration-200">
                              <CardContent className="p-4">
                                {/* Header section with bet details and odds */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <div className="text-sm font-medium text-foreground truncate mb-1">
                                      {formatBetDescription(bet)}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {bet.game.awayTeam.shortName} @{" "}
                                      {bet.game.homeTeam.shortName}
                                    </div>
                                  </div>
                                  <Badge className="text-accent border-accent/40 bg-accent/15 font-mono px-3 py-1 text-xs font-bold min-w-[60px] text-center flex-shrink-0">
                                    {formatOdds(bet.odds)}
                                  </Badge>
                                </div>

                                <Separator className="opacity-20 mb-3" />

                                {/* Stakes and Win with delete button layout */}
                                <div className="flex items-center">
                                  <div className="flex-1 space-y-2 pr-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-muted-foreground font-semibold">
                                        Stake:
                                      </span>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={bet.stake || ""}
                                        onChange={(e) =>
                                          handleStakeChange(
                                            bet.id,
                                            e.target.value,
                                          )
                                        }
                                        className="w-20 h-7 text-xs bg-background/60 border-border/60 rounded-md text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0.00"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between text-xs bg-gradient-to-r from-secondary/15 to-secondary/25 rounded-md p-2 border border-border/30">
                                      <span className="text-muted-foreground font-semibold">
                                        To Win:
                                      </span>
                                      <span className="font-bold text-[color:var(--color-win)]">
                                        $
                                        {(
                                          bet.potentialPayout - bet.stake
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-center flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeBet(bet.id)}
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                                    >
                                      <Trash size={14} />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="border border-accent/30 shadow-sm ring-1 ring-accent/15 hover:border-accent/50 bg-card/50 transition-colors duration-200">
                          <CardContent className="p-4">
                            {/* Parlay Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Stack size={16} className="text-accent" />
                                <div className="text-sm font-bold text-foreground">
                                  Parlay ({betSlip.bets.length} picks)
                                </div>
                              </div>
                              <Badge className="text-accent border-accent/40 bg-accent/15 font-mono px-3 py-1 text-sm font-bold min-w-[70px] text-center">
                                {formatOdds(betSlip.totalOdds)}
                              </Badge>
                            </div>

                            {/* Parlay Legs */}
                            <div className="space-y-3 mb-4">
                              {betSlip.bets.map((bet, index) => (
                                <motion.div
                                  key={bet.id}
                                  className="flex items-start py-2 border-b border-border/15 last:border-b-0"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{
                                    duration: 0.3,
                                    delay: index * 0.1,
                                  }}
                                >
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0 pr-3">
                                        <div className="text-sm font-medium text-foreground truncate">
                                          {formatBetDescription(bet)}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          {bet.game.awayTeam.shortName} @{" "}
                                          {bet.game.homeTeam.shortName}
                                        </div>
                                      </div>
                                      <Badge className="text-accent border-accent/40 bg-accent/15 font-mono px-2 py-0.5 text-xs font-bold min-w-[55px] text-center flex-shrink-0">
                                        {formatOdds(bet.odds)}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-center ml-3 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeBet(bet.id)}
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                                    >
                                      <Trash size={12} />
                                    </Button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>

                            <Separator className="opacity-20 mb-4" />

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-foreground">
                                  Total Stake:
                                </span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={betSlip.bets[0]?.stake || ""}
                                  onChange={(e) =>
                                    betSlip.bets[0] &&
                                    handleStakeChange(
                                      betSlip.bets[0].id,
                                      e.target.value,
                                    )
                                  }
                                  className="w-24 h-8 text-sm bg-background/60 border-border/60 rounded-md text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="flex items-center justify-between text-sm bg-gradient-to-r from-secondary/15 to-secondary/25 rounded-lg p-3 border border-border/30">
                                <span className="text-muted-foreground font-semibold">
                                  Parlay Odds:
                                </span>
                                <span className="font-bold text-accent">
                                  {formatOdds(betSlip.totalOdds)}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </div>
                </Tabs>
              </div>
            </motion.div>
          </div>
        </SmoothScrollContainer>
        {/* Bet Slip Summary - Fixed at bottom */}
        <div
          className="border-t border-border bg-muted/20 backdrop-blur-sm flex-shrink-0"
          style={{
            padding: "var(--fluid-panel-padding)",
            borderRadius: "var(--fluid-radius)",
            fontSize: "var(--fluid-base)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div style={{ gap: "var(--fluid-gap)" }} className="flex flex-col">
              <div
                className="flex items-center justify-between"
                style={{ fontSize: "var(--fluid-lg)" }}
              >
                <span className="text-muted-foreground">Total Stake:</span>
                <span
                  className="font-semibold text-card-foreground"
                  style={{ fontSize: "var(--fluid-xl)" }}
                >
                  ${betSlip.totalStake.toFixed(2)}
                </span>
              </div>
              <div
                className="flex items-center justify-between"
                style={{ fontSize: "var(--fluid-lg)" }}
              >
                <span className="text-muted-foreground">Potential Payout:</span>
                <span
                  className="font-semibold text-accent"
                  style={{ fontSize: "var(--fluid-xl)" }}
                >
                  ${betSlip.totalPayout.toFixed(2)}
                </span>
              </div>
              {betSlip.totalPayout > betSlip.totalStake && (
                <div
                  className="flex items-center justify-between"
                  style={{ fontSize: "var(--fluid-base)" }}
                >
                  <span className="text-muted-foreground">Profit:</span>
                  <span
                    className="font-medium text-[color:var(--color-win)]"
                    style={{ fontSize: "var(--fluid-lg)" }}
                  >
                    +${(betSlip.totalPayout - betSlip.totalStake).toFixed(2)}
                  </span>
                </div>
              )}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handlePlaceBet}
                  disabled={isPlacing || betSlip.totalStake === 0}
                  className="w-full"
                  size="lg"
                >
                  {isPlacing ? (
                    "Placing Bet..."
                  ) : (
                    <div className="flex items-center gap-2">
                      <TrendUp size={16} />
                      Place {betSlip.betType === "single" ? "Bets" : "Parlay"}
                    </div>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
