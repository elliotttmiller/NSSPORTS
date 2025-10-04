"use client";

import { Game } from "@/types";
import { TeamLogo } from "./TeamLogo";
import { formatOdds, formatSpreadLine, formatGameTime } from "@/lib/formatters";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useBetSlip } from "@/context";
import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ProfessionalGameRowProps {
  game: Game;
  isFirstInGroup?: boolean;
  showTime?: boolean;
}

export function ProfessionalGameRow({
  game,
  isFirstInGroup,
  showTime = true,
}: ProfessionalGameRowProps) {
  const timeString = formatGameTime(game.startTime);
  const { addBet, removeBet, betSlip } = useBetSlip();
  const [expanded, setExpanded] = useState(false);

  const getBetId = useCallback(
    (betType: string, selection: string) => {
      return `${game.id}-${betType}-${selection}`;
    },
    [game.id],
  );

  const isBetInSlip = useCallback(
    (betType: string, selection: string) => {
      const betId = getBetId(betType, selection);
      return betSlip.bets.some((b) => b.id === betId);
    },
    [betSlip, getBetId],
  );

  const handleBetClick = (
    betType: "spread" | "total" | "moneyline",
    selection: "away" | "home" | "over" | "under",
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();
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

  return (
    <motion.div
      className="bg-card/40 border border-border rounded-lg mb-2 hover:bg-card/60 hover:shadow-md transition-all duration-200 overflow-hidden"
      initial={false}
      animate={{
        boxShadow: expanded
          ? "0 8px 32px rgba(0,0,0,0.10)"
          : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {/* Main Card Content - Clickable */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        {/* Game Row */}
        <div
          className={cn(
            "group transition-colors duration-200 border-b border-border/20 last:border-b-0",
            isFirstInGroup && "border-t border-border",
          )}
        >
          {/* League/Time Column */}
          <div className="text-xs space-y-0.5">
            <div className="text-muted-foreground font-medium uppercase">
              {game.leagueId}
            </div>
            {showTime && (
              <div className="text-muted-foreground">{timeString}</div>
            )}
          </div>

          {/* Teams Column */}
          <div className="space-y-1">
            {/* Away Team */}
            <div className="flex items-center gap-3">
              <TeamLogo
                src={game.awayTeam.logo}
                alt={game.awayTeam.name}
                size={24}
              />
              <span className="font-medium text-foreground">
                {game.awayTeam.name}
              </span>
              <span className="text-sm text-muted-foreground">
                ({game.awayTeam.shortName})
              </span>
              {game.awayTeam.record && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {game.awayTeam.record}
                </span>
              )}
            </div>
            {/* Home Team */}
            <div className="flex items-center gap-3">
              <TeamLogo
                src={game.homeTeam.logo}
                alt={game.homeTeam.name}
                size={24}
              />
              <span className="font-medium text-foreground">
                {game.homeTeam.name}
              </span>
              <span className="text-sm text-muted-foreground">
                ({game.homeTeam.shortName})
              </span>
              {game.homeTeam.record && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {game.homeTeam.record}
                </span>
              )}
            </div>
          </div>

          {/* Spread Column */}
          <div className="space-y-1">
            <Button
              variant={isBetInSlip("spread", "away") ? "default" : "outline"}
              size="sm"
              onClick={(e) => handleBetClick("spread", "away", e)}
              className={cn(
                "w-full h-8 text-xs px-2 transition-all duration-200 font-medium",
                isBetInSlip("spread", "away")
                  ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {formatSpreadLine(game.odds.spread.away.line || 0)}{" "}
              {formatOdds(game.odds.spread.away.odds)}
            </Button>
            <Button
              variant={isBetInSlip("spread", "home") ? "default" : "outline"}
              size="sm"
              onClick={(e) => handleBetClick("spread", "home", e)}
              className={cn(
                "w-full h-8 text-xs px-2 transition-all duration-200 font-medium",
                isBetInSlip("spread", "home")
                  ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {formatSpreadLine(game.odds.spread.home.line || 0)}{" "}
              {formatOdds(game.odds.spread.home.odds)}
            </Button>
          </div>

          {/* Total Column */}
          <div className="space-y-1">
            <Button
              variant={isBetInSlip("total", "over") ? "default" : "outline"}
              size="sm"
              onClick={(e) => handleBetClick("total", "over", e)}
              className={cn(
                "w-full h-8 text-xs px-2 transition-all duration-200 font-medium",
                isBetInSlip("total", "over")
                  ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              O {game.odds.total.over?.line}{" "}
              {formatOdds(game.odds.total.over?.odds || 0)}
            </Button>
            <Button
              variant={isBetInSlip("total", "under") ? "default" : "outline"}
              size="sm"
              onClick={(e) => handleBetClick("total", "under", e)}
              className={cn(
                "w-full h-8 text-xs px-2 transition-all duration-200 font-medium",
                isBetInSlip("total", "under")
                  ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              U {game.odds.total.under?.line}{" "}
              {formatOdds(game.odds.total.under?.odds || 0)}
            </Button>
          </div>

          {/* Moneyline Column */}
          <div className="space-y-1">
            <Button
              variant={isBetInSlip("moneyline", "away") ? "default" : "outline"}
              size="sm"
              onClick={(e) => handleBetClick("moneyline", "away", e)}
              className={cn(
                "w-full h-8 text-xs px-2 transition-all duration-200 font-medium",
                isBetInSlip("moneyline", "away")
                  ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {formatOdds(game.odds.moneyline.away.odds)}
            </Button>
            <Button
              variant={isBetInSlip("moneyline", "home") ? "default" : "outline"}
              size="sm"
              onClick={(e) => handleBetClick("moneyline", "home", e)}
              className={cn(
                "w-full h-8 text-xs px-2 transition-all duration-200 font-medium",
                isBetInSlip("moneyline", "home")
                  ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {formatOdds(game.odds.moneyline.home.odds)}
            </Button>
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden bg-muted/20 border-t border-border px-4 py-4 rounded-b-lg shadow-md"
          >
            {/* Future: Player/Game Prop Bets UI goes here */}
            <div className="mb-3 text-center text-xs text-muted-foreground">
              Game props and player props coming soon...
            </div>
            <div className="mb-2 text-sm font-semibold text-accent">Game Info</div>
            <div className="mb-2 text-xs text-muted-foreground">Start Time: {formatGameTime(game.startTime)}</div>
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
}
