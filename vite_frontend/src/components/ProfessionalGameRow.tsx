import React, { memo, useCallback, useState } from "react";
import { Game } from "@/types";
import { TeamLogo } from "./TeamLogo";
import {
  formatOdds,
  formatSpreadLine,
  formatTotalLine,
} from "@/lib/formatters";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { useBetSlip } from "@/context/BetSlipContext";
import { cn } from "@/lib/utils";
import { provideBetFeedback } from "@/lib/betInteractions";

interface ProfessionalGameRowProps {
  game: Game;
  isFirstInGroup?: boolean;
  showTime?: boolean;
}

export const ProfessionalGameRow = memo(
  ({ game, isFirstInGroup, showTime }: ProfessionalGameRowProps) => {
    const { addBet, removeBet, betSlip } = useBetSlip();
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
      new Set(),
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

      // Provide feedback
      const teamName =
        selection === "away" ? game.awayTeam.name : game.homeTeam.name;
      provideBetFeedback(true, betType, selection, teamName);
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ backgroundColor: "rgba(var(--muted), 0.5)" }}
        className={cn(
          "group transition-colors duration-200 border-b border-border/20 last:border-b-0 cursor-pointer",
          isFirstInGroup && "border-t border-border",
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Game Row */}
        <div className="grid grid-cols-[80px_1fr_120px_120px_120px_32px] gap-4 items-center py-2 px-4 min-h-[60px]">
          {/* League Column (now on left) */}
          <div className="text-xs text-muted-foreground font-medium">
            {game.leagueId}
          </div>

          {/* Teams Column */}
          <div className="space-y-1">
            {/* Away Team */}
            <div className="flex items-center gap-3">
              <TeamLogo
                team={game.awayTeam.id || game.awayTeam.shortName || game.awayTeam.name}
                league={game.leagueId}
                size="sm"
                variant="minimal"
                fallbackToAbbreviation={false}
              />
              <span className="font-medium text-foreground">
                {game.awayTeam.name}
              </span>
              <span className="text-sm text-muted-foreground">
                ({game.awayTeam.shortName})
              </span>
            </div>
            {/* Home Team */}
            <div className="flex items-center gap-3">
              <TeamLogo
                team={game.homeTeam.id || game.homeTeam.shortName || game.homeTeam.name}
                league={game.leagueId}
                size="sm"
                variant="minimal"
                fallbackToAbbreviation={false}
              />
              <span className="font-medium text-foreground">
                {game.homeTeam.name}
              </span>
              <span className="text-sm text-muted-foreground">
                ({game.homeTeam.shortName})
              </span>
            </div>
          </div>

          {/* Spread Column */}
          <div className="space-y-1">
            {/* Away Spread */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
            >
              <Button
                variant={isBetInSlip("spread", "away") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("spread", "away", e)}
                className={cn(
                  "w-full h-8 text-xs px-2 transition-all duration-200 font-medium",
                  isBetInSlip("spread", "away")
                    ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
                )}
              >
                {formatSpreadLine(game.odds.spread.away.line || 0)}{" "}
                {formatOdds(game.odds.spread.away.odds)}
              </Button>
            </motion.div>
            {/* Home Spread */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
            >
              <Button
                variant={isBetInSlip("spread", "home") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("spread", "home", e)}
                className={cn(
                  "w-full h-8 text-xs px-2 transition-all duration-200 font-medium",
                  isBetInSlip("spread", "home")
                    ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
                )}
              >
                {formatSpreadLine(game.odds.spread.home.line || 0)}{" "}
                {formatOdds(game.odds.spread.home.odds)}
              </Button>
            </motion.div>
          </div>

          {/* Total Column */}
          <div className="space-y-1">
            {/* Over */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
            >
              <Button
                variant={isBetInSlip("total", "over") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("total", "over", e)}
                className={cn(
                  "w-full h-8 text-xs px-2 transition-all duration-200 font-medium",
                  isBetInSlip("total", "over")
                    ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
                )}
              >
                O{formatTotalLine(game.odds.total.over?.line || 0)}{" "}
                {formatOdds(game.odds.total.over?.odds || 0)}
              </Button>
            </motion.div>
            {/* Under */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
            >
              <Button
                variant={isBetInSlip("total", "under") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("total", "under", e)}
                className={cn(
                  "w-full h-8 text-xs px-2 transition-all duration-200 font-medium",
                  isBetInSlip("total", "under")
                    ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
                )}
              >
                U{formatTotalLine(game.odds.total.under?.line || 0)}{" "}
                {formatOdds(game.odds.total.under?.odds || 0)}
              </Button>
            </motion.div>
          </div>

          {/* Money Line Column */}
          <div className="space-y-1">
            {/* Away ML */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
            >
              <Button
                variant={
                  isBetInSlip("moneyline", "away") ? "default" : "outline"
                }
                size="sm"
                onClick={(e) => handleBetClick("moneyline", "away", e)}
                className={cn(
                  "w-full h-8 text-xs px-2 transition-all duration-200 font-medium",
                  isBetInSlip("moneyline", "away")
                    ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
                )}
              >
                {formatOdds(game.odds.moneyline.away.odds)}
              </Button>
            </motion.div>
            {/* Home ML */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
            >
              <Button
                variant={
                  isBetInSlip("moneyline", "home") ? "default" : "outline"
                }
                size="sm"
                onClick={(e) => handleBetClick("moneyline", "home", e)}
                className={cn(
                  "w-full h-8 text-xs px-2 transition-all duration-200 font-medium",
                  isBetInSlip("moneyline", "home")
                    ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
                )}
              >
                {formatOdds(game.odds.moneyline.home.odds)}
              </Button>
            </motion.div>
          </div>

          {/* More Options Column */}
          <div className="flex justify-center">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100 transition-all duration-200 hover:bg-accent/20"
                aria-label="Expand"
              >
                <Plus size={16} />
              </Button>
            </motion.div>
          </div>
          {/* Time Column (now on right) */}
          <div className="text-xs text-muted-foreground font-medium text-right">
            {showTime && timeString}
          </div>
        </div>

        {/* Expanded Section */}
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden border-t border-border/30 bg-muted/20"
            >
              <div className="p-4 space-y-4">
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
                      {new Date(game.startTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-muted-foreground text-center">
                  Click row to expand/collapse additional game information
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  },
);

ProfessionalGameRow.displayName = "ProfessionalGameRow";
