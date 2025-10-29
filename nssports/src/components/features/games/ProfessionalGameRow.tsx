"use client";

import { Game } from "@/types";
import { TeamLogo } from "./TeamLogo";
import { formatOdds, formatSpreadLine, formatGameTime } from "@/lib/formatters";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useBetSlip } from "@/context";
import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayerPropsView, GamePropsView } from "@/components/features/props";
import { usePlayerProps, useGameProps } from "@/hooks";
import { wouldBetCauseConflict } from "@/lib/betting-rules";

// Helper component for displaying props with tabs
function PropsDisplay({ game, expanded }: { game: Game; expanded: boolean }) {
  const [activeTab, setActiveTab] = useState<'player' | 'game'>('player');
  
  // ⭐ PHASE 2 OPTIMIZATION: On-demand fetching - only fetch when card expanded AND tab active
  // This prevents fetching props for all games on page load (90% reduction)
  const { data: playerProps = [], isLoading: playerPropsLoading } = usePlayerProps(
    game.id,
    expanded && activeTab === 'player' // Only enabled when card expanded AND player tab active
  );
  
  const { data: gameProps = {}, isLoading: gamePropsLoading } = useGameProps(
    game.id,
    expanded && activeTab === 'game' // Only enabled when card expanded AND game tab active
  );

  return (
    <div className="w-full">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-20 bg-background pb-4 -mx-6 px-6 md:-mx-8 md:px-8 xl:-mx-12 xl:px-12">
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
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

interface ProfessionalGameRowProps {
  game: Game;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showTime?: boolean;
}

export function ProfessionalGameRow({
  game,
  isFirstInGroup,
  isLastInGroup,
  showTime = true,
}: ProfessionalGameRowProps) {
  const timeString = formatGameTime(game.startTime);
  const { addBet, removeBet, betSlip } = useBetSlip();
  
  // ⭐ PHASE 4 OPTIMIZATION: Real-time updates via WebSocket streaming
  // No more polling - odds are updated in real-time via the store's WebSocket connection
  // The parent page enables streaming, and components receive updated odds through props
  const oddsSource = game.odds;
  
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

  const wouldBetConflict = useCallback(
    (betType: "spread" | "moneyline" | "total", selection: string) => {
      // Only check conflicts in parlay mode
      if (betSlip.betType === "single") return false;
      
      return wouldBetCauseConflict(
        betSlip.bets,
        {
          gameId: game.id,
          betType,
          selection,
        },
        betSlip.betType === "custom" ? "parlay" : betSlip.betType
      );
    },
    [betSlip, game.id],
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

  const cardClasses = cn(
  "bg-background text-card-foreground flex flex-col border border-border rounded-lg transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)] shadow-sm hover:shadow-md hover:-translate-y-1.5 hover:scale-[1.015] active:scale-95 focus-within:ring-1 focus-within:ring-white/20 cursor-pointer outline-[0.5px] outline-white/10 overflow-hidden",
    {
      "border-t rounded-t-lg": !isFirstInGroup,
      "border-b rounded-b-lg mb-2": !isFirstInGroup,
      "border-b-0": isFirstInGroup && !isLastInGroup,
      "border-b rounded-b-lg": isLastInGroup,
    },
  );

  return (
    <motion.div
      className={cardClasses}
      initial={false}
      animate={{
        boxShadow: expanded
          ? "0 8px 32px rgba(0,0,0,0.10)"
          : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {/* Main Card Content - Clickable */}
      <div
        className="cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded ? "true" : "false"}
      >
        {/* Game Row - Original Polished Layout */}
        <div
          className={cn(
            "group transition-colors duration-200 border-b border-border/20 last:border-b-0",
            isFirstInGroup && "border-t border-border",
          )}
        >
          {/* Responsive Grid - Adapts to container width */}
          <div className="grid grid-cols-[60px_1fr_auto_auto_auto] xl:grid-cols-[80px_1fr_120px_120px_120px] gap-2 xl:gap-4 items-center py-2 px-2 xl:px-4 min-h-[60px]">
            {/* League/Time Column */}
            <div className="text-xs space-y-0.5">
              <div className="text-muted-foreground font-medium uppercase text-[10px] xl:text-xs">
                {game.leagueId}
              </div>
              {showTime && (
                <div className="text-muted-foreground text-[10px] xl:text-xs">{timeString}</div>
              )}
            </div>

            {/* Teams Column */}
            <div className="space-y-1 min-w-0">
              {/* Away Team */}
              <div className="flex items-center gap-1 xl:gap-3 min-w-0">
                <TeamLogo
                  src={game.awayTeam.logo}
                  alt={game.awayTeam.name}
                  size={20}
                  className="xl:w-6 xl:h-6 flex-shrink-0"
                />
                <span className="font-medium text-foreground text-sm xl:text-base truncate">
                  {game.awayTeam.name}
                </span>
                {game.awayTeam.record && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {game.awayTeam.record}
                  </span>
                )}
              </div>
              {/* Home Team */}
              <div className="flex items-center gap-1 xl:gap-3 min-w-0">
                <TeamLogo
                  src={game.homeTeam.logo}
                  alt={game.homeTeam.name}
                  size={20}
                  className="xl:w-6 xl:h-6 flex-shrink-0"
                />
                <span className="font-medium text-foreground text-sm xl:text-base truncate">
                  {game.homeTeam.name}
                </span>
                {game.homeTeam.record && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {game.homeTeam.record}
                  </span>
                )}
              </div>
            </div>

            {/* Spread Column */}
            <div className="space-y-1 min-w-[80px] xl:min-w-[120px]">
              <Button
                variant={isBetInSlip("spread", "away") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("spread", "away", e)}
                disabled={wouldBetConflict("spread", "away") && !isBetInSlip("spread", "away")}
                className={cn(
                  "w-full h-9 px-2 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-1 text-center",
                  isBetInSlip("spread", "away")
                    ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                    : wouldBetConflict("spread", "away")
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
                title={wouldBetConflict("spread", "away") && !isBetInSlip("spread", "away") ? "Conflicts with existing bet in parlay" : undefined}
              >
                <span className="text-xs xl:text-sm font-medium leading-none tracking-wide">
                  {formatSpreadLine(oddsSource.spread.away.line || 0)}
                </span>
                <span className="text-[10px] xl:text-[11px] text-foreground/90 font-semibold leading-none">
                  {formatOdds(oddsSource.spread.away.odds)}
                </span>
              </Button>
              <Button
                variant={isBetInSlip("spread", "home") ? "default" : "outline"}
                size="sm"
                onClick={(e) => handleBetClick("spread", "home", e)}
                disabled={wouldBetConflict("spread", "home") && !isBetInSlip("spread", "home")}
                className={cn(
                  "w-full h-9 px-2 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-1 text-center",
                  isBetInSlip("spread", "home")
                    ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                    : wouldBetConflict("spread", "home")
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
                title={wouldBetConflict("spread", "home") && !isBetInSlip("spread", "home") ? "Conflicts with existing bet in parlay" : undefined}
              >
                <span className="text-xs xl:text-sm font-medium leading-none tracking-wide">
                  {formatSpreadLine(oddsSource.spread.home.line || 0)}
                </span>
                <span className="text-[10px] xl:text-[11px] text-foreground/90 font-semibold leading-none">
                  {formatOdds(oddsSource.spread.home.odds)}
                </span>
              </Button>
            </div>

          {/* Total Column */}
          <div className="space-y-1 min-w-[80px] xl:min-w-[120px]">
            <Button
              variant={isBetInSlip("total", "over") ? "default" : "outline"}
              size="sm"
              onClick={(e) => handleBetClick("total", "over", e)}
              disabled={wouldBetConflict("total", "over") && !isBetInSlip("total", "over")}
              className={cn(
                "w-full h-9 px-2 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-1 text-center",
                isBetInSlip("total", "over")
                  ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                  : wouldBetConflict("total", "over")
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
              title={wouldBetConflict("total", "over") && !isBetInSlip("total", "over") ? "Conflicts with existing bet in parlay" : undefined}
            >
              <span className="text-xs xl:text-sm font-medium leading-none tracking-wide">
                O<span className="mx-1">{oddsSource.total.over?.line}</span>
              </span>
              <span className="text-[10px] xl:text-[11px] text-foreground/90 font-semibold leading-none">
                {formatOdds(oddsSource.total.over?.odds || 0)}
              </span>
            </Button>
            <Button
              variant={isBetInSlip("total", "under") ? "default" : "outline"}
              size="sm"
              onClick={(e) => handleBetClick("total", "under", e)}
              disabled={wouldBetConflict("total", "under") && !isBetInSlip("total", "under")}
              className={cn(
                "w-full h-9 px-2 transition-all duration-200 font-medium flex flex-col justify-center items-center gap-1 text-center",
                isBetInSlip("total", "under")
                  ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                  : wouldBetConflict("total", "under")
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
              title={wouldBetConflict("total", "under") && !isBetInSlip("total", "under") ? "Conflicts with existing bet in parlay" : undefined}
            >
              <span className="text-xs xl:text-sm font-medium leading-none tracking-wide">
                U<span className="mx-1">{oddsSource.total.under?.line}</span>
              </span>
              <span className="text-[10px] xl:text-[11px] text-foreground/90 font-semibold leading-none">
                {formatOdds(oddsSource.total.under?.odds || 0)}
              </span>
            </Button>
          </div>

          {/* Moneyline Column */}
          <div className="space-y-1 min-w-[80px] xl:min-w-[120px]">
            <Button
              variant={isBetInSlip("moneyline", "away") ? "default" : "outline"}
              size="sm"
              onClick={(e) => handleBetClick("moneyline", "away", e)}
              disabled={wouldBetConflict("moneyline", "away") && !isBetInSlip("moneyline", "away")}
              className={cn(
                "w-full h-8 px-1 xl:px-2 transition-all duration-200 font-medium flex items-center justify-center text-center",
                isBetInSlip("moneyline", "away")
                  ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                  : wouldBetConflict("moneyline", "away")
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
              title={wouldBetConflict("moneyline", "away") && !isBetInSlip("moneyline", "away") ? "Conflicts with existing bet in parlay" : undefined}
            >
              <span className="text-xs xl:text-sm font-medium leading-none tracking-wide">
                {formatOdds(oddsSource.moneyline.away.odds)}
              </span>
            </Button>
            <Button
              variant={isBetInSlip("moneyline", "home") ? "default" : "outline"}
              size="sm"
              onClick={(e) => handleBetClick("moneyline", "home", e)}
              disabled={wouldBetConflict("moneyline", "home") && !isBetInSlip("moneyline", "home")}
              className={cn(
                "w-full h-8 px-1 xl:px-2 transition-all duration-200 font-medium flex items-center justify-center text-center",
                isBetInSlip("moneyline", "home")
                  ? "bg-accent text-accent-foreground shadow-md ring-2 ring-accent/20"
                  : wouldBetConflict("moneyline", "home")
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
              title={wouldBetConflict("moneyline", "home") && !isBetInSlip("moneyline", "home") ? "Conflicts with existing bet in parlay" : undefined}
            >
              <span className="text-xs xl:text-sm font-medium leading-none tracking-wide">
                {formatOdds(oddsSource.moneyline.home.odds)}
              </span>
            </Button>
          </div>
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
            className="overflow-hidden bg-muted/20 border-t border-border rounded-b-lg shadow-lg"
          >
            <div className="px-6 py-6 md:px-8 md:py-6 xl:px-12 xl:py-8">
              <PropsDisplay game={game} expanded={expanded} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
