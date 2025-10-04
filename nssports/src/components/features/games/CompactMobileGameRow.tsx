"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamLogo } from "./TeamLogo";
import { Button } from "@/components/ui";
import { useBetSlip } from "@/context";
import { formatOdds, formatSpreadLine } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Game } from "@/types";

interface Props {
  game: Game;
}

export const CompactMobileGameRow = memo(({ game }: Props) => {
  const { betSlip, addBet, removeBet } = useBetSlip();
  const [expanded, setExpanded] = useState(false);

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
    (betType: "spread" | "total" | "moneyline", selection: "home" | "away" | "over" | "under") => {
      const betId = getBetId(betType, selection);
      return (
        Array.isArray(betSlip?.bets) &&
        betSlip.bets.some((b) => b.id === betId)
      );
    },
    [betSlip, getBetId]
  );

  const handleBetClick = (
    betType: "spread" | "total" | "moneyline",
    selection: "away" | "home" | "over" | "under",
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation(); // Prevent card expansion
    const betId = getBetId(betType, selection);
    const isSelected = isBetInSlip(betType, selection);

    if (isSelected) {
      removeBet(betId);
      return;
    }

    let odds: number;
    let line: number | undefined;

    switch (betType) {
      case "spread":
        odds =
          selection === "away"
            ? game.odds.spread.away.odds
            : game.odds.spread.home.odds;
        line =
          selection === "away"
            ? game.odds.spread.away.line
            : game.odds.spread.home.line;
        break;
      case "total":
        odds =
          selection === "over"
            ? game.odds.total.over?.odds || 0
            : game.odds.total.under?.odds || 0;
        line =
          selection === "over"
            ? game.odds.total.over?.line
            : game.odds.total.under?.line;
        break;
      case "moneyline":
        odds =
          selection === "away"
            ? game.odds.moneyline.away.odds
            : game.odds.moneyline.home.odds;
        line = undefined;
        break;
      default:
        return;
    }

    addBet(game, betType, selection, odds, line);
  };

  const formatTotalLine = (line: number | undefined) => {
    if (!line) return "—";
    return line.toString();
  };

  return (
    <motion.div
      className="bg-card/40 border border-border rounded-lg mb-2 hover:bg-card/60 hover:shadow-md transition-all duration-200 overflow-hidden"
      initial={false}
      animate={{ boxShadow: expanded ? "0 8px 32px rgba(0,0,0,0.10)" : "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      {/* Main Card Content - Clickable */}
      <div
        className="p-2.5 cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        {/* Time Header */}
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs text-muted-foreground">{game.leagueId.toUpperCase()}</div>
          <div className="text-xs text-muted-foreground font-medium">
            {timeString}
          </div>
        </div>

        {/* Teams and Odds Grid - 4 columns to match header */}
        <div className="grid grid-cols-4 gap-2">
          {/* Teams Column */}
          <div className="flex flex-col justify-between h-[60px]">
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
              </motion.div>
            </div>
          </div>

          {/* Spread Column */}
          <div className="flex flex-col justify-between h-[60px]">
            {/* Away Spread */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                variant={
                  isBetInSlip("spread", "away") ? "default" : "outline"
                }
                size="sm"
                onClick={(e) => handleBetClick("spread", "away", e)}
                className={cn(
                  "w-full h-7 px-1 py-0 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-0",
                  isBetInSlip("spread", "away")
                    ? "bg-accent text-accent-foreground shadow-lg ring-2 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                )}
              >
                <span className="text-[10px] font-bold leading-none">
                  {formatSpreadLine(game.odds.spread.away.line || 0)}
                </span>
                <span className="text-[8px] opacity-75 leading-none -mt-px">
                  {formatOdds(game.odds.spread.away.odds)}
                </span>
              </Button>
            </motion.div>
            {/* Home Spread */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                variant={
                  isBetInSlip("spread", "home") ? "default" : "outline"
                }
                size="sm"
                onClick={(e) => handleBetClick("spread", "home", e)}
                className={cn(
                  "w-full h-7 px-1 py-0 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-0",
                  isBetInSlip("spread", "home")
                    ? "bg-accent text-accent-foreground shadow-lg ring-2 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                )}
              >
                <span className="text-[10px] font-bold leading-none">
                  {formatSpreadLine(game.odds.spread.home.line || 0)}
                </span>
                <span className="text-[8px] opacity-75 leading-none -mt-px">
                  {formatOdds(game.odds.spread.home.odds)}
                </span>
              </Button>
            </motion.div>
          </div>

          {/* Total Column */}
          <div className="flex flex-col justify-between h-[60px]">
            {/* Over */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                variant={isBetInSlip("total", "over") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("total", "over", e)}
                className={cn(
                  "w-full h-7 px-1 py-0 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-0",
                  isBetInSlip("total", "over")
                    ? "bg-accent text-accent-foreground shadow-lg ring-2 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                )}
              >
                <span className="text-[10px] font-bold leading-none">
                  O{formatTotalLine(game.odds.total.over?.line || 0)}
                </span>
                <span className="text-[8px] opacity-75 leading-none -mt-px">
                  {formatOdds(game.odds.total.over?.odds || 0)}
                </span>
              </Button>
            </motion.div>
            {/* Under */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                variant={
                  isBetInSlip("total", "under") ? "default" : "outline"
                }
                size="sm"
                onClick={(e) => handleBetClick("total", "under", e)}
                className={cn(
                  "w-full h-7 px-1 py-0 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-0",
                  isBetInSlip("total", "under")
                    ? "bg-accent text-accent-foreground shadow-lg ring-2 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                )}
              >
                <span className="text-[10px] font-bold leading-none">
                  U{formatTotalLine(game.odds.total.under?.line || 0)}
                </span>
                <span className="text-[8px] opacity-75 leading-none -mt-px">
                  {formatOdds(game.odds.total.under?.odds || 0)}
                </span>
              </Button>
            </motion.div>
          </div>

          {/* Money Line Column */}
          <div className="flex flex-col justify-between h-[60px]">
            {/* Away ML */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                variant={
                  isBetInSlip("moneyline", "away") ? "default" : "outline"
                }
                size="sm"
                onClick={(e) => handleBetClick("moneyline", "away", e)}
                className={cn(
                  "w-full h-7 px-1 transition-all duration-200 font-medium flex items-center justify-center",
                  isBetInSlip("moneyline", "away")
                    ? "bg-accent text-accent-foreground shadow-lg ring-2 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                )}
              >
                <span className="text-[10px] font-semibold">
                  {formatOdds(game.odds.moneyline.away.odds)}
                </span>
              </Button>
            </motion.div>
            {/* Home ML */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                variant={
                  isBetInSlip("moneyline", "home") ? "default" : "outline"
                }
                size="sm"
                onClick={(e) => handleBetClick("moneyline", "home", e)}
                className={cn(
                  "w-full h-7 px-1 transition-all duration-200 font-medium flex items-center justify-center",
                  isBetInSlip("moneyline", "home")
                    ? "bg-accent text-accent-foreground shadow-lg ring-2 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                )}
              >
                <span className="text-[10px] font-semibold">
                  {formatOdds(game.odds.moneyline.home.odds)}
                </span>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ maxHeight: 0, opacity: 0 }}
            animate={{ maxHeight: 500, opacity: 1 }}
            exit={{ maxHeight: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden bg-muted/20 border-t border-border px-4 py-4 rounded-b-lg shadow-md"
          >
            {/* Future: Player/Game Prop Bets UI goes here */}
            <div className="mb-3 text-center text-xs text-muted-foreground">
              Game props and player props coming soon...
            </div>
            <div className="mb-2 text-sm font-semibold text-accent">Game Info</div>
            <div className="mb-2 text-xs text-muted-foreground">Start Time: {timeString}</div>
            <div className="mb-2 text-xs text-muted-foreground">Teams: {game.awayTeam.name} vs {game.homeTeam.name}</div>
            <div className="mb-2 text-xs text-muted-foreground">League: {game.leagueId}</div>
            <div className="mt-4">
              <div className="text-xs font-semibold mb-1 text-muted-foreground">Upcoming Features:</div>
              <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                <li>Player prop bets</li>
                <li>Live stats</li>
                <li>Team analytics</li>
                <li>Bet recommendations</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

CompactMobileGameRow.displayName = "CompactMobileGameRow";
