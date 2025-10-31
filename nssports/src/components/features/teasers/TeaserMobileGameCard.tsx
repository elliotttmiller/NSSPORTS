"use client";

import { useCallback, memo } from "react";
import { motion } from "framer-motion";
import { TeamLogo } from "../games/TeamLogo";
import { Button } from "@/components/ui";
import { useBetSlip } from "@/context";
import { cn } from "@/lib/utils";
import type { Game } from "@/types";
import type { TeaserType } from "@/types/teaser";
import { getTeaserConfig, getPointAdjustment, calculateAdjustedLine } from "@/types/teaser";

interface Props {
  game: Game;
  teaserType: TeaserType;
}

export const TeaserMobileGameCard = memo(({ game, teaserType }: Props) => {
  const { betSlip, addBet, removeBet } = useBetSlip();
  
  const oddsSource = game.odds;
  const teaserConfig = getTeaserConfig(teaserType);
  const pointAdjustment = getPointAdjustment(teaserType, game.leagueId);

  const gameDate = new Date(game.startTime);
  const timeString = gameDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Helper to check if a bet is in the bet slip
  const getBetId = useCallback(
    (betType: string, selection: string) => {
      return `${game.id}-${betType}-${selection}`;
    },
    [game.id]
  );

  const isBetInSlip = useCallback(
    (betType: "spread" | "total", selection: "home" | "away" | "over" | "under") => {
      const betId = getBetId(betType, selection);
      return betSlip.bets.some((b) => b.id === betId);
    },
    [betSlip.bets, getBetId]
  );

  const handleBetClick = (
    betType: "spread" | "total",
    selection: "away" | "home" | "over" | "under",
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    const betId = getBetId(betType, selection);
    const isSelected = isBetInSlip(betType, selection);

    if (isSelected) {
      removeBet(betId);
      return;
    }

    let odds: number;
    let originalLine: number | undefined;

    switch (betType) {
      case "spread":
        odds = selection === "away" 
          ? oddsSource.spread.away.odds 
          : oddsSource.spread.home.odds;
        originalLine = selection === "away"
          ? (oddsSource.spread.away.line ?? undefined)
          : (oddsSource.spread.home.line ?? undefined);
        break;
      case "total":
        odds = selection === "over"
          ? oddsSource.total.over?.odds || 0
          : oddsSource.total.under?.odds || 0;
        originalLine = selection === "over"
          ? (oddsSource.total.over?.line ?? undefined)
          : (oddsSource.total.under?.line ?? undefined);
        break;
      default:
        return;
    }

    // Store the ORIGINAL line in the bet - betslip will calculate adjusted line for display
    addBet(game, betType, selection, odds, originalLine);
  };

  // Calculate adjusted lines for display
  const getAdjustedSpreadDisplay = (selection: "home" | "away") => {
    const originalLine = selection === "away"
      ? oddsSource.spread.away.line
      : oddsSource.spread.home.line;
    
    if (originalLine === null || originalLine === undefined) return { original: "—", adjusted: "—" };
    
    const adjusted = calculateAdjustedLine(originalLine, selection, pointAdjustment, "spread");
    return {
      original: originalLine > 0 ? `+${originalLine}` : originalLine.toString(),
      adjusted: adjusted > 0 ? `+${adjusted}` : adjusted.toString(),
    };
  };

  const getAdjustedTotalDisplay = (selection: "over" | "under") => {
    const originalLine = selection === "over"
      ? oddsSource.total.over?.line
      : oddsSource.total.under?.line;
    
    if (originalLine === null || originalLine === undefined) return { original: "—", adjusted: "—" };
    
    const adjusted = calculateAdjustedLine(originalLine, selection, pointAdjustment, "total");
    return {
      original: originalLine.toString(),
      adjusted: adjusted.toString(),
    };
  };

  const awaySpread = getAdjustedSpreadDisplay("away");
  const homeSpread = getAdjustedSpreadDisplay("home");
  const overTotal = getAdjustedTotalDisplay("over");
  const underTotal = getAdjustedTotalDisplay("under");

  return (
    <motion.div
      className="bg-card/40 border-2 border-blue-500/30 ring-2 ring-blue-500/20 rounded-lg mb-3 hover:bg-card/60 hover:shadow-lg transition-all duration-200 overflow-hidden"
      initial={false}
    >
      {/* Teaser Indicator Badge */}
      <div className="bg-blue-500/10 border-b border-blue-500/20 px-3 py-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-blue-400 font-semibold">
            ⚡ {pointAdjustment > 0 ? '+' : ''}{pointAdjustment} Point Teaser
          </span>
          <span className="text-muted-foreground">
            {teaserConfig.displayName}
          </span>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="p-3">
        {/* Time Header */}
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs text-muted-foreground font-semibold">{game.leagueId.toUpperCase()}</div>
          <div className="text-xs text-muted-foreground font-medium">
            {timeString}
          </div>
        </div>

        {/* Teams and Adjusted Odds Grid - 3 columns (Teams, Spread, Total) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Teams Column */}
          <div className="flex flex-col justify-between h-[72px] gap-2">
            {/* Away Team */}
            <div className="flex items-center h-7">
              <motion.div
                className="flex items-center gap-1.5"
                whileHover={{ x: 2 }}
                transition={{ duration: 0.2 }}
              >
                <TeamLogo
                  src={game.awayTeam.logo}
                  alt={game.awayTeam.name}
                  size={16}
                />
                <span className="text-xs font-medium text-foreground truncate leading-tight">
                  {game.awayTeam.shortName}
                </span>
                {game.awayTeam.record && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {game.awayTeam.record}
                  </span>
                )}
              </motion.div>
            </div>

            {/* Home Team */}
            <div className="flex items-center h-7">
              <motion.div
                className="flex items-center gap-1.5"
                whileHover={{ x: 2 }}
                transition={{ duration: 0.2 }}
              >
                <TeamLogo
                  src={game.homeTeam.logo}
                  alt={game.homeTeam.name}
                  size={16}
                />
                <span className="text-xs font-medium text-foreground truncate leading-tight">
                  {game.homeTeam.shortName}
                </span>
                {game.homeTeam.record && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {game.homeTeam.record}
                  </span>
                )}
              </motion.div>
            </div>
          </div>

          {/* Spread Column - Show Original → Adjusted */}
          <div className="flex flex-col justify-between h-[72px] gap-2">
            {/* Away Spread */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant={isBetInSlip("spread", "away") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("spread", "away", e)}
                disabled={awaySpread.adjusted === "—"}
                className={cn(
                  "w-full h-8 px-1 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-0 text-center rounded-md border",
                  isBetInSlip("spread", "away")
                    ? "bg-blue-500 border-blue-500 text-white shadow-md ring-2 ring-blue-500/30"
                    : awaySpread.adjusted === "—"
                    ? "opacity-40 cursor-not-allowed border-border"
                    : "border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 hover:shadow-md"
                )}
              >
                {/* Original Line - Strikethrough */}
                <span className="text-[9px] text-muted-foreground/70 line-through leading-none">
                  {awaySpread.original}
                </span>
                {/* Adjusted Line - Bold Blue */}
                <span className={cn(
                  "text-xs font-bold leading-none mt-0.5",
                  isBetInSlip("spread", "away") ? "text-white" : "text-blue-400"
                )}>
                  {awaySpread.adjusted}
                </span>
              </Button>
            </motion.div>

            {/* Home Spread */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant={isBetInSlip("spread", "home") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("spread", "home", e)}
                disabled={homeSpread.adjusted === "—"}
                className={cn(
                  "w-full h-8 px-1 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-0 text-center rounded-md border",
                  isBetInSlip("spread", "home")
                    ? "bg-blue-500 border-blue-500 text-white shadow-md ring-2 ring-blue-500/30"
                    : homeSpread.adjusted === "—"
                    ? "opacity-40 cursor-not-allowed border-border"
                    : "border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 hover:shadow-md"
                )}
              >
                {/* Original Line - Strikethrough */}
                <span className="text-[9px] text-muted-foreground/70 line-through leading-none">
                  {homeSpread.original}
                </span>
                {/* Adjusted Line - Bold Blue */}
                <span className={cn(
                  "text-xs font-bold leading-none mt-0.5",
                  isBetInSlip("spread", "home") ? "text-white" : "text-blue-400"
                )}>
                  {homeSpread.adjusted}
                </span>
              </Button>
            </motion.div>
          </div>

          {/* Total Column - Show Original → Adjusted */}
          <div className="flex flex-col justify-between h-[72px] gap-2">
            {/* Over */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant={isBetInSlip("total", "over") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("total", "over", e)}
                disabled={overTotal.adjusted === "—"}
                className={cn(
                  "w-full h-8 px-1 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-0 text-center rounded-md border",
                  isBetInSlip("total", "over")
                    ? "bg-blue-500 border-blue-500 text-white shadow-md ring-2 ring-blue-500/30"
                    : overTotal.adjusted === "—"
                    ? "opacity-40 cursor-not-allowed border-border"
                    : "border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 hover:shadow-md"
                )}
              >
                {/* O Label */}
                <span className="text-[9px] text-muted-foreground/70 leading-none">O</span>
                {/* Original → Adjusted */}
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[8px] text-muted-foreground/70 line-through leading-none">
                    {overTotal.original}
                  </span>
                  <span className={cn(
                    "text-xs font-bold leading-none",
                    isBetInSlip("total", "over") ? "text-white" : "text-blue-400"
                  )}>
                    {overTotal.adjusted}
                  </span>
                </div>
              </Button>
            </motion.div>

            {/* Under */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant={isBetInSlip("total", "under") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("total", "under", e)}
                disabled={underTotal.adjusted === "—"}
                className={cn(
                  "w-full h-8 px-1 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-0 text-center rounded-md border",
                  isBetInSlip("total", "under")
                    ? "bg-blue-500 border-blue-500 text-white shadow-md ring-2 ring-blue-500/30"
                    : underTotal.adjusted === "—"
                    ? "opacity-40 cursor-not-allowed border-border"
                    : "border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 hover:shadow-md"
                )}
              >
                {/* U Label */}
                <span className="text-[9px] text-muted-foreground/70 leading-none">U</span>
                {/* Original → Adjusted */}
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[8px] text-muted-foreground/70 line-through leading-none">
                    {underTotal.original}
                  </span>
                  <span className={cn(
                    "text-xs font-bold leading-none",
                    isBetInSlip("total", "under") ? "text-white" : "text-blue-400"
                  )}>
                    {underTotal.adjusted}
                  </span>
                </div>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Point Adjustment Reminder */}
        <div className="mt-3 pt-2 border-t border-border/20 text-center text-[10px] text-blue-400/70">
          Lines adjusted by <span className="font-semibold">{pointAdjustment > 0 ? '+' : ''}{pointAdjustment} pts</span> • Odds: <span className="font-semibold">{teaserConfig.odds > 0 ? '+' : ''}{teaserConfig.odds}</span>
        </div>
      </div>
    </motion.div>
  );
});

TeaserMobileGameCard.displayName = "TeaserMobileGameCard";
