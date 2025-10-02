import { useState, useEffect, useCallback, memo } from "react";
import type { Bet } from "@/types";
import { useBetsContext } from "@/context/BetsContext";
import { useBetSlip } from "@/context/BetSlipContext";
import { useNavigation } from "@/context/NavigationContext";
import { formatOdds } from "@/lib/formatters";
import { formatBetDescription, formatMatchup } from "@/lib/betFormatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Trash,
  X,
  Target,
  Stack,
  TrendUp,
  Calculator,
  CheckCircle,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SmoothScrollContainer } from "@/components/VirtualScrolling";

const BetSlipModalComponent = () => {
  const { betSlip, removeBet, updateStake, setBetType, clearBetSlip } = useBetSlip();
  const { addBet, refreshBets } = useBetsContext();
  const { navigation, setIsBetSlipOpen } = useNavigation();
  const [isPlacing, setIsPlacing] = useState(false);
  const [placementStage, setPlacementStage] = useState<"idle" | "validating" | "processing" | "success">("idle");

  const isOpen = navigation.isBetSlipOpen;

  const handleClose = useCallback(() => {
    if (isPlacing) return;
    setPlacementStage("idle");
    setIsBetSlipOpen(false);
  }, [setIsBetSlipOpen, isPlacing]);

  const handleStakeChange = useCallback((betId: string, value: string) => {
    const stake = parseFloat(value) || 0;
    if (stake >= 0 && stake <= 10000) {
      updateStake(betId, stake);
    }
  }, [updateStake]);

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
    try {
      setPlacementStage("validating");
      await new Promise((resolve) => setTimeout(resolve, 600));
      setPlacementStage("processing");
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (betSlip.betType === "single") {
        for (const bet of betSlip.bets) {
          await addBet({
            ...bet,
            betType: bet.betType,
            selection: bet.selection,
            line: bet.line,
            game: bet.game,
          });
        }
      } else if (betSlip.betType === "parlay") {
        const parlayBet: Bet = {
          id: `parlay-${Date.now()}`,
          gameId: `parlay-${Date.now()}`,
          betType: "parlay",
          selection: "home", // Use a valid selection value, e.g. "home" for parlay
          odds: betSlip.totalOdds,
          line: undefined,
          stake: betSlip.totalStake,
          potentialPayout: betSlip.totalPayout,
          game: {
            id: `parlay-${Date.now()}`,
            homeTeam: { name: "Parlay Bet", shortName: "PAR", id: "parlay-home", logo: "" },
            awayTeam: { name: `${betSlip.bets.length} Picks`, shortName: `${betSlip.bets.length}P`, id: "parlay-away", logo: "" },
            leagueId: "PARLAY",
            startTime: new Date(),
            status: "upcoming",
            odds: {
              spread: { home: { odds: 0, lastUpdated: new Date() }, away: { odds: 0, lastUpdated: new Date() } },
              moneyline: { home: { odds: 0, lastUpdated: new Date() }, away: { odds: 0, lastUpdated: new Date() } },
              total: { home: { odds: 0, lastUpdated: new Date() }, away: { odds: 0, lastUpdated: new Date() } }
            },
          },
          legs: betSlip.bets.map((bet) => ({ ...bet })),
        };
        await addBet(parlayBet);
      }
      setPlacementStage("success");
      await refreshBets();
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success(`${betSlip.betType === "single" ? "Bets" : "Parlay"} placed successfully! Good luck!`);
      clearBetSlip();
      setTimeout(() => {
        handleClose();
      }, 300);
    } catch {
      toast.error("Failed to place bet. Please try again.");
      setPlacementStage("idle");
    } finally {
      setIsPlacing(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isPlacing) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen, handleClose, isPlacing]);

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <motion.div
          key="betslip-modal"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
          className="mobile-betslip-modal universal-responsive-container"
        >
          <DialogContent
            className="fixed inset-0 z-[60] w-full h-full max-w-none bg-muted/30 backdrop-blur-2xl border-0 rounded-none flex flex-col overflow-hidden p-0 sm:max-w-xl sm:left-1/2 sm:top-1/2 sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:border-border/40 sm:shadow-2xl professional-modal professional-scroll"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              height: "100vh",
              maxHeight: "100vh",
              transform: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
            onInteractOutside={(e) => {
              if (!isPlacing) handleClose();
              else e.preventDefault();
            }}
          >
            {/* Enhanced Header */}
            <DialogHeader className="flex-shrink-0 border-b border-border/40 professional-spacing-lg bg-gradient-to-r from-card/90 to-card/80 backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ rotate: -12, scale: 0.8 }}
                    animate={{
                      rotate: 0,
                      scale: 1,
                      ...(placementStage === "success" && {
                        scale: [1, 1.2, 1],
                      }),
                    }}
                    transition={{
                      duration: 0.4,
                      ...(placementStage === "success" && {
                        repeat: 1,
                        repeatType: "reverse",
                        duration: 0.6,
                      }),
                    }}
                    className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-300 ${
                      placementStage === "success"
                        ? "bg-[color:var(--color-win)]/20 border-[color:var(--color-win)]/40"
                        : betSlip.bets.length > 0
                          ? "bg-accent/20 border-accent/40"
                          : "bg-secondary/20 border-border/60"
                    }`}
                  >
                    {placementStage === "success" ? (
                      <CheckCircle
                        size={20}
                        className="text-[color:var(--color-win)]"
                        weight="fill"
                      />
                    ) : (
                      <Calculator size={20} className="text-accent" />
                    )}
                  </motion.div>
                  <div>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      Bet Slip
                      {betSlip.bets.length > 0 && (
                        <motion.span
                          key={betSlip.bets.length}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-sm font-medium text-accent"
                        >
                          ({betSlip.bets.length})
                        </motion.span>
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1">
                      {placementStage === "success"
                        ? "Bet placed successfully!"
                        : betSlip.bets.length === 0
                          ? "No bets selected"
                          : `${betSlip.betType === "single" ? "Individual" : "Parlay"} betting mode`}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {betSlip.bets.length > 1 && (
                    <Tabs
                      value={betSlip.betType}
                      onValueChange={setBetType}
                      className="w-auto"
                    >
                      <TabsList className="grid w-full grid-cols-2 h-9 bg-secondary/50 backdrop-blur-sm border border-border/40">
                        <TabsTrigger
                          value="single"
                          className="text-sm px-4 font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all duration-200"
                        >
                          Single
                        </TabsTrigger>
                        <TabsTrigger
                          value="parlay"
                          className="text-sm px-4 font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all duration-200"
                        >
                          Parlay
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    disabled={isPlacing}
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-xl transition-all duration-200"
                  >
                    <X size={18} />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Content Area with Enhanced Scrolling */}
            <SmoothScrollContainer className="flex-1 min-h-0 overflow-auto professional-scroll professional-container">
              <motion.div
                className="py-6 space-y-6 professional-spacing-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, staggerChildren: 0.1 }}
              >
                {betSlip.bets.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-20 text-center w-full max-w-full"
                    style={{ minHeight: "40vh", boxSizing: "border-box" }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="flex flex-col items-center justify-center"
                    >
                      <div style={{ width: "100vw" }}>
                        <motion.div
                          initial={{ scale: 0.8, rotate: -5 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            duration: 0.6,
                            delay: 0.3,
                            type: "spring",
                            stiffness: 200,
                          }}
                          className="w-24 h-24 bg-gradient-to-br from-accent/25 to-accent/35 rounded-3xl flex items-center justify-center mb-8 border border-accent/20 shadow-lg"
                        >
                          <Target
                            size={36}
                            className="text-accent"
                            weight="duotone"
                          />
                        </motion.div>
                      </div>
                      <motion.h3
                        className="text-2xl font-bold mb-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                      >
                        <span style={{ wordBreak: "break-word", width: "100%" }}>
                          Ready to Bet
                        </span>
                      </motion.h3>
                      <motion.p
                        className="text-muted-foreground text-base leading-relaxed"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                      >
                        <span style={{ maxWidth: "100vw", wordBreak: "break-word", width: "100%" }}>
                          Browse games and tap odds to start building your perfect bet slip
                        </span>
                      </motion.p>
                    </motion.div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {betSlip.betType === "single" ? (
                      <AnimatePresence mode="popLayout">
                        {betSlip.bets.map((bet, index) => (
                          <motion.div
                            key={bet.id}
                            layout
                            initial={{ opacity: 0, x: -30, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 30, scale: 0.9 }}
                            transition={{
                              duration: 0.4,
                              delay: index * 0.1,
                              type: "spring",
                              stiffness: 300,
                              damping: 25,
                            }}
                          >
                            <Card className="professional-card border border-border/30 shadow-sm ring-1 ring-border/20 hover:border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-colors duration-200">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <div className="text-base font-bold text-foreground truncate mb-1">
                                      {formatBetDescription(bet)}
                                    </div>
                                    <div className="text-sm text-muted-foreground truncate">
                                      {formatMatchup(bet)}
                                    </div>
                                    {bet.game && bet.game.leagueId && (
                                      <div className="text-xs text-muted-foreground/80 mt-1">
                                        {bet.game.leagueId}
                                      </div>
                                    )}
                                  </div>
                                  <Badge className="text-accent border-accent/40 bg-accent/15 font-mono px-4 py-2 text-sm font-bold min-w-[85px] text-center flex-shrink-0">
                                    {formatOdds(bet.odds)}
                                  </Badge>
                                </div>
                                <Separator className="opacity-20 mb-3" />
                                <div className="flex items-center">
                                  <div className="flex-1 space-y-3 pr-4">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-muted-foreground font-semibold">
                                        Stake:
                                      </span>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="10000"
                                        step="1"
                                        value={bet.stake || ""}
                                        onChange={(e) => handleStakeChange(bet.id, e.target.value)}
                                        className="w-24 h-9 text-sm bg-background/60 backdrop-blur-sm border-border/60 focus:border-accent/60 rounded-lg font-medium text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0.00"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between text-sm bg-gradient-to-r from-secondary/15 to-secondary/25 rounded-xl p-3 border border-border/30">
                                      <span className="text-muted-foreground font-semibold">
                                        To Win:
                                      </span>
                                      <span className="font-bold text-[color:var(--color-win)]">
                                        ${bet.stake > 0 ? (bet.potentialPayout - bet.stake).toFixed(2) : "0.00"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-center flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeBet(bet.id)}
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200"
                                    >
                                      <Trash size={16} />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    ) : (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <Card className="professional-card border border-accent/30 shadow-sm ring-1 ring-accent/15 hover:border-accent/50 bg-card/50 backdrop-blur-sm transition-colors duration-200">
                          <CardContent className="p-8">
                            <div className="flex flex-col gap-8">
                              {/* Header */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-4">
                                  <Stack size={24} className="text-accent" />
                                  <span className="text-xl font-bold text-foreground">
                                    Parlay ({betSlip.bets.length} picks)
                                  </span>
                                </div>
                                <Badge className="text-accent border-accent/40 bg-accent/15 font-mono px-6 py-2 text-lg font-bold min-w-[120px] text-center">
                                  {formatOdds(betSlip.totalOdds)}
                                </Badge>
                              </div>
                              {/* Bets List */}
                              <div className="flex flex-col gap-3">
                                <AnimatePresence>
                                  {betSlip.bets.map((bet, index) => (
                                    <motion.div
                                      key={bet.id}
                                      layout
                                      className="flex items-center justify-between py-3 border-b border-border/20 last:border-b-0"
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: 20 }}
                                      transition={{ duration: 0.3, delay: index * 0.1 }}
                                    >
                                      <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-7 h-7 bg-accent/20 text-accent rounded-full flex items-center justify-center text-base font-bold">
                                          {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-base font-semibold text-foreground">
                                            {formatBetDescription(bet)}
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            {formatMatchup(bet)}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 ml-2">
                                        <Badge className="text-accent border-accent/40 bg-accent/15 font-mono px-5 py-1 text-base font-bold min-w-[90px] text-center">
                                          {formatOdds(bet.odds)}
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeBet(bet.id)}
                                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                        >
                                          <Trash size={16} />
                                        </Button>
                                      </div>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                              </div>
                              {/* Summary Section */}
                              <div className="bg-card/80 backdrop-blur border border-border/30 rounded-xl px-8 py-6 mt-4 flex flex-col gap-6 shadow-lg">
                                <div className="flex flex-row gap-8 px-12">
                                  <div className="flex-1">
                                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                      Parlay Stake
                                    </label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="10000"
                                      step="1"
                                      value={betSlip.bets[0]?.stake || ""}
                                      onChange={(e) => betSlip.bets[0] && handleStakeChange(betSlip.bets[0].id, e.target.value)}
                                      className="h-11 text-base bg-background/80 backdrop-blur border-border/50 focus:border-accent/60 rounded-lg font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                      To Win
                                    </label>
                                    <div className="h-11 flex items-center justify-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-5">
                                      <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                                        ${betSlip.totalPayout > betSlip.totalStake ? (betSlip.totalPayout - betSlip.totalStake).toFixed(2) : "0.00"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-border/20 px-12">
                                  <span className="text-base font-semibold text-muted-foreground">
                                    Total Payout:
                                  </span>
                                  <span className="font-bold text-accent text-xl">
                                    ${betSlip.totalPayout.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </SmoothScrollContainer>
            {betSlip.bets.length > 0 && (
              <div style={{ width: "100%", boxSizing: "border-box" }}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="border-t border-border/40 professional-spacing-lg bg-gradient-to-t from-muted/40 to-muted/20 backdrop-blur-2xl flex-shrink-0"
                >
                  <div className="space-y-6 professional-spacing-lg">
                    <div className="professional-card space-y-4 bg-gradient-to-r from-secondary/15 to-secondary/25 border border-border/40 rounded-xl">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-semibold w-20">
                          Stake:
                        </span>
                        <span className="font-bold text-foreground text-base w-24 text-right">
                          ${betSlip.totalStake.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-semibold w-20">
                          To Win:
                        </span>
                        <span className="font-bold text-[color:var(--color-win)] text-base w-24 text-right">
                          ${betSlip.totalPayout > betSlip.totalStake ? (betSlip.totalPayout - betSlip.totalStake).toFixed(2) : "0.00"}
                        </span>
                      </div>
                      <Separator className="opacity-30" />
                      <div className="flex items-center justify-between text-sm pt-1">
                        <span className="text-muted-foreground font-semibold w-20">
                          Payout:
                        </span>
                        <span className="font-bold text-accent text-lg w-24 text-right">
                          ${betSlip.totalPayout.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <motion.div whileHover={!isPlacing ? { scale: 1.02 } : {}} whileTap={!isPlacing ? { scale: 0.98 } : {}}>
                      <Button
                        onClick={handlePlaceBet}
                        disabled={isPlacing || betSlip.totalStake === 0}
                        className={`w-full h-14 font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 ${placementStage === "success" ? "bg-[color:var(--color-win)] hover:bg-[color:var(--color-win)] text-white" : "bg-accent hover:bg-accent/90 text-accent-foreground"}`}
                      >
                        {isPlacing ? (
                          <div className="flex items-center gap-3">
                            {placementStage === "validating" && (
                              <>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="w-6 h-6 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full"
                                />
                                <span>Validating...</span>
                              </>
                            )}
                            {placementStage === "processing" && (
                              <>
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 0.8, repeat: Infinity }}
                                  className="w-6 h-6 bg-accent-foreground rounded-full"
                                />
                                <span>Processing Bet...</span>
                              </>
                            )}
                            {placementStage === "success" && (
                              <>
                                <CheckCircle size={24} weight="fill" />
                                <span>Bet Placed!</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <TrendUp size={22} />
                            <span>Place {betSlip.betType === "single" ? "Bets" : "Parlay"}</span>
                          </div>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            )}
          </DialogContent>
        </motion.div>
      </Dialog>
    </AnimatePresence>
  );
};
BetSlipModalComponent.displayName = "BetSlipModal";
export const BetSlipModal = memo(BetSlipModalComponent);
