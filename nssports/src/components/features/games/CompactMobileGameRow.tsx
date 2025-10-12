"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamLogo } from "./TeamLogo";
import { Button } from "@/components/ui";
import { useBetSlip } from "@/context";
import { formatOdds, formatSpreadLine } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { PlayerPropsView, GamePropsView } from "@/components/features/props";
import { useLiveOdds } from "@/hooks/useLiveOdds";
import { usePlayerProps, useGameProps } from "@/hooks";
import type { Game } from "@/types";

// Helper component for displaying props with tabs - same as desktop
function PropsDisplay({ game }: { game: Game }) {
  const [activeTab, setActiveTab] = useState<'player' | 'game'>('player');
  
  // On-demand fetching: only fetch when tab is active
  const { data: playerProps = [], isLoading: playerPropsLoading } = usePlayerProps(
    game.id,
    activeTab === 'player'
  );
  
  const { data: gameProps = {}, isLoading: gamePropsLoading } = useGameProps(
    game.id,
    activeTab === 'game'
  );

  return (
    <div className="w-full">
      <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground mb-4">
        <button
          onClick={() => setActiveTab('player')}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
            activeTab === 'player' && "bg-background text-foreground shadow-sm"
          )}
        >
          Player Props
        </button>
        <button
          onClick={() => setActiveTab('game')}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
            activeTab === 'game' && "bg-background text-foreground shadow-sm"
          )}
        >
          Game Props
        </button>
      </div>

      {activeTab === 'player' && (
        playerPropsLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Loading player props...
          </div>
        ) : (
          <PlayerPropsView game={game} playerProps={playerProps} />
        )
      )}

      {activeTab === 'game' && (
        gamePropsLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Loading game props...
          </div>
        ) : (
          <GamePropsView game={game} gameProps={gameProps} />
        )
      )}
    </div>
  );
}

interface Props {
  game: Game;
}

export const CompactMobileGameRow = memo(({ game }: Props) => {
  const { betSlip, addBet, removeBet } = useBetSlip();
  const [expanded, setExpanded] = useState(false);
  const [shouldRenderDropdown, setShouldRenderDropdown] = useState(false);
  const { data: liveData } = useLiveOdds(game.status === 'live' ? game.id : undefined);
  const oddsSource = liveData?.game?.odds ?? game.odds;

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
            ? oddsSource.spread.away.odds
            : oddsSource.spread.home.odds;
        line =
          selection === "away"
            ? (oddsSource.spread.away.line ?? undefined)
            : (oddsSource.spread.home.line ?? undefined);
        break;
      case "total":
        odds =
          selection === "over"
            ? oddsSource.total.over?.odds || 0
            : oddsSource.total.under?.odds || 0;
        line =
          selection === "over"
            ? (oddsSource.total.over?.line ?? undefined)
            : (oddsSource.total.under?.line ?? undefined);
        break;
      case "moneyline":
        odds =
          selection === "away"
            ? oddsSource.moneyline.away.odds
            : oddsSource.moneyline.home.odds;
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
      className="bg-card/40 border border-accent/20 ring-1 ring-accent/10 rounded-lg mb-2 hover:bg-card/60 hover:shadow-md transition-all duration-200 overflow-hidden"
      initial={false}
      animate={{ boxShadow: expanded ? "0 8px 32px rgba(0,0,0,0.10)" : "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      {/* Main Card Content - Clickable */}
      <div
  className="p-3 cursor-pointer"
        onClick={() => {
          if (expanded) {
            setExpanded(false);
          } else {
            setExpanded(true);
            setShouldRenderDropdown(true);
          }
        }}
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
          <div className="flex flex-col justify-between h-[72px] gap-2">
            {/* Away Spread */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant={isBetInSlip("spread", "away") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("spread", "away", e)}
                className={cn(
                  "w-full h-8 px-2 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-0.5 text-center rounded-md border border-border",
                  isBetInSlip("spread", "away")
                    ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                )}
              >
                <span className="text-xs leading-none font-semibold">
                  {formatSpreadLine(oddsSource.spread.away.line || 0)}
                </span>
                <span className="text-xs text-foreground/90 font-semibold block w-full text-center leading-none">
                  {formatOdds(oddsSource.spread.away.odds)}
                </span>
              </Button>
            </motion.div>
            {/* Home Spread */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant={isBetInSlip("spread", "home") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("spread", "home", e)}
                className={cn(
                  "w-full h-8 px-2 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-0.5 text-center rounded-md border border-border",
                  isBetInSlip("spread", "home")
                    ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                )}
              >
                <span className="text-xs leading-none font-semibold">
                  {formatSpreadLine(oddsSource.spread.home.line || 0)}
                </span>
                <span className="text-xs text-foreground/90 font-semibold block w-full text-center leading-none">
                  {formatOdds(oddsSource.spread.home.odds)}
                </span>
              </Button>
            </motion.div>
          </div>

          {/* Total Column */}
          <div className="flex flex-col justify-between h-[72px] gap-2">
            {/* Over */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant={isBetInSlip("total", "over") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("total", "over", e)}
                className={cn(
                  "w-full h-8 px-2 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-0.5 text-center rounded-md border border-border",
                  isBetInSlip("total", "over")
                    ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                )}
              >
                <span className="text-xs leading-none font-semibold">
                  O<span className="mx-1">{formatTotalLine(oddsSource.total.over?.line || 0)}</span>
                </span>
                <span className="text-xs text-foreground/90 font-semibold block w-full text-center leading-none">
                  {formatOdds(oddsSource.total.over?.odds || 0)}
                </span>
              </Button>
            </motion.div>
            {/* Under */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant={isBetInSlip("total", "under") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("total", "under", e)}
                className={cn(
                  "w-full h-8 px-2 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-0.5 text-center rounded-md border border-border",
                  isBetInSlip("total", "under")
                    ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                )}
              >
                <span className="text-xs leading-none font-semibold">
                  U<span className="mx-1">{formatTotalLine(oddsSource.total.under?.line || 0)}</span>
                </span>
                <span className="text-xs text-foreground/90 font-semibold block w-full text-center leading-none">
                  {formatOdds(oddsSource.total.under?.odds || 0)}
                </span>
              </Button>
            </motion.div>
          </div>

          {/* Money Line Column */}
          <div className="flex flex-col justify-between h-[72px] gap-2">
            {/* Away ML */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant={isBetInSlip("moneyline", "away") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("moneyline", "away", e)}
                className={cn(
                  "w-full h-8 px-2 transition-all duration-200 font-medium flex items-center justify-center text-center rounded-md border border-border",
                  isBetInSlip("moneyline", "away")
                    ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                )}
              >
                <span className="text-xs font-semibold">
                  <span className="tracking-wide text-xs font-semibold leading-none">{formatOdds(oddsSource.moneyline.away.odds)}</span>
                </span>
              </Button>
            </motion.div>
            {/* Home ML */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant={isBetInSlip("moneyline", "home") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("moneyline", "home", e)}
                className={cn(
                  "w-full h-8 px-2 transition-all duration-200 font-medium flex items-center justify-center text-center rounded-md border border-border",
                  isBetInSlip("moneyline", "home")
                    ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-accent/20"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                )}
              >
                <span className="text-xs font-semibold">
                  <span className="tracking-wide text-xs font-semibold leading-none">{formatOdds(oddsSource.moneyline.home.odds)}</span>
                </span>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {shouldRenderDropdown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden bg-muted/20 border-t border-border rounded-b-lg shadow-md"
            onAnimationComplete={() => {
              if (!expanded) setShouldRenderDropdown(false);
            }}
          >
            <div 
              className="h-[400px] overflow-y-auto seamless-scroll px-4 py-4"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              style={{ overscrollBehavior: 'contain' }}
            >
              <PropsDisplay game={game} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

CompactMobileGameRow.displayName = "CompactMobileGameRow";