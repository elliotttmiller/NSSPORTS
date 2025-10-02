import React, { memo, useCallback, useState } from "react";
import { Game } from "@/types";
import { TeamLogo } from "./TeamLogo";
import {
  formatOdds,
  formatSpreadLine,
  formatTotalLine,
} from "@/lib/formatters";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { useBetSlip } from "@/context/BetSlipContext";
import { cn } from "@/lib/utils";
import {
  provideBetFeedback,
  mobileButtonAnimations,
  getStaggerDelay,
} from "@/lib/betInteractions";

interface CompactMobileGameRowProps {
  game: Game;
  index: number;
}

export const CompactMobileGameRow = memo(
  ({ game, index }: CompactMobileGameRowProps) => {
    const { addBet, removeBet, betSlip } = useBetSlip();
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
      new Set(["popular"]),
    );

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
      [game.id],
    );

    const isBetInSlip = useCallback(
      (betType: string, selection: string) => {
        const betId = getBetId(betType, selection);
        return (
          Array.isArray(betSlip?.bets) &&
          betSlip.bets.some((b) => b.id === betId)
        );
      },
      [betSlip, getBetId],
    );

    const handleBetClick = (
      betType: "spread" | "total" | "moneyline",
      selection: "away" | "home" | "over" | "under",
      e?: React.MouseEvent,
    ) => {
      e?.stopPropagation(); // Prevent card expansion
      const betId = getBetId(betType, selection);
      const isSelected = isBetInSlip(betType, selection);

      if (isSelected) {
        removeBet(betId);
        provideBetFeedback(false, betType, selection);
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

      // Provide mobile-specific feedback
      const teamName =
        selection === "away" ? game.awayTeam.name : game.homeTeam.name;
      provideBetFeedback(true, betType, selection, teamName);
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ delay: getStaggerDelay(index), duration: 0.3 }}
        className="bg-card/40 border border-border rounded-lg mb-2 hover:bg-card/60 hover:shadow-md transition-all duration-200 overflow-hidden"
      >
        {/* Main Card Content - Clickable */}
        <div
          className="p-2.5 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Time Header */}
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs text-muted-foreground">{game.leagueId}</div>
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
                    team={game.awayTeam.id || game.awayTeam.shortName || game.awayTeam.name}
                    league={game.leagueId}
                    size="xs"
                    variant="minimal"
                    className="flex-shrink-0 w-4 h-4"
                    fallbackToAbbreviation={false}
                  />
                  <span className="text-xs font-medium text-foreground truncate leading-tight">
                    {game.awayTeam.shortName || game.awayTeam.name}
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
                    team={game.homeTeam.id || game.homeTeam.shortName || game.homeTeam.name}
                    league={game.leagueId}
                    size="xs"
                    variant="minimal"
                    className="flex-shrink-0 w-4 h-4"
                    fallbackToAbbreviation={false}
                  />
                  <span className="text-xs font-medium text-foreground truncate leading-tight">
                    {game.homeTeam.shortName || game.homeTeam.name}
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
                      : "hover:bg-accent hover:text-accent-foreground hover:shadow-md",
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
                      : "hover:bg-accent hover:text-accent-foreground hover:shadow-md",
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
                      : "hover:bg-accent hover:text-accent-foreground hover:shadow-md",
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
                      : "hover:bg-accent hover:text-accent-foreground hover:shadow-md",
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

            {/* Money Line Column - Perfectly Aligned */}
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
                      : "hover:bg-accent hover:text-accent-foreground hover:shadow-md",
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
                      : "hover:bg-accent hover:text-accent-foreground hover:shadow-md",
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

        {/* Expanded Section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ transformOrigin: "top" } as React.CSSProperties}
              className="border-t border-border bg-card/20"
            >
              <div className="p-4 space-y-4">
                {/* Additional Game Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status: </span>
                    <span className="font-medium">
                      {game.status || "Scheduled"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">League: </span>
                    <span className="font-medium">{game.leagueId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Venue: </span>
                    <span className="font-medium">{game.venue || "TBD"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Start: </span>
                    <span className="font-medium">
                      {gameDate.toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Additional betting markets could go here */}
                <div className="text-center text-xs text-muted-foreground pt-2">
                  Tap anywhere on the card to collapse
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  },
);

CompactMobileGameRow.displayName = "CompactMobileGameRow";