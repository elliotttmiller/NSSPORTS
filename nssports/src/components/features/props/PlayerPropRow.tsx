"use client";

import { Button } from "@/components/ui";
import { formatOdds } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useBetSlip } from "@/context";
import { useCallback } from "react";
import { Game } from "@/types";

interface PlayerPropRowProps {
  prop: {
    id: string;
    playerId: string;
    playerName: string;
    position: string;
    team: string; // Team abbreviation (e.g., "DET", "CLE")
    statType: string;
    line: number;
    overOdds: number;
    underOdds: number;
    category: string;
  };
  game: Game;
}

export function PlayerPropRow({ prop, game }: PlayerPropRowProps) {
  const { addPlayerPropBet, removeBet, betSlip } = useBetSlip();

  const getBetId = useCallback(
    (selection: "over" | "under") => {
      return `${game.id}-prop-${prop.id}-${selection}`;
    },
    [game.id, prop.id]
  );

  const isBetInSlip = useCallback(
    (selection: "over" | "under") => {
      const betId = getBetId(selection);
      return betSlip.bets.some((b) => b.id === betId);
    },
    [betSlip, getBetId]
  );

  const handleBetClick = (
    selection: "over" | "under",
    odds: number,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    const betId = getBetId(selection);

    if (isBetInSlip(selection)) {
      removeBet(betId);
    } else {
      addPlayerPropBet(
        game,
        prop.id,
        selection,
        odds,
        prop.line,
        {
          playerId: prop.playerId,
          playerName: prop.playerName,
          statType: prop.statType,
          category: prop.category,
        }
      );
    }
  };

  return (
    <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1.5fr_auto_auto] gap-2 md:gap-3 items-center py-3 border-b border-border/50 hover:bg-muted/20 transition-colors px-2 md:px-3 -mx-2 md:-mx-3 last:border-b-0">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs md:text-sm font-semibold text-foreground truncate">
            {prop.playerName}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {prop.position}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {prop.team}
        </div>
      </div>

      <div className="flex flex-col items-center flex-shrink-0">
        <Button
          size="sm"
          variant={isBetInSlip("over") ? "default" : "outline"}
          onClick={(e) => handleBetClick("over", prop.overOdds, e)}
          className={cn(
            "min-w-[70px] md:min-w-[80px] h-8 md:h-9 text-xs font-medium",
            isBetInSlip("over") &&
              "bg-primary text-primary-foreground border-primary"
          )}
        >
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[10px] opacity-80">O {prop.line}</span>
            <span className="font-semibold text-[11px] md:text-xs">{formatOdds(prop.overOdds)}</span>
          </div>
        </Button>
      </div>

      <div className="flex flex-col items-center flex-shrink-0">
        <Button
          size="sm"
          variant={isBetInSlip("under") ? "default" : "outline"}
          onClick={(e) => handleBetClick("under", prop.underOdds, e)}
          className={cn(
            "min-w-[70px] md:min-w-[80px] h-8 md:h-9 text-xs font-medium",
            isBetInSlip("under") &&
              "bg-primary text-primary-foreground border-primary"
          )}
        >
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[10px] opacity-80">U {prop.line}</span>
            <span className="font-semibold text-[11px] md:text-xs">{formatOdds(prop.underOdds)}</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
