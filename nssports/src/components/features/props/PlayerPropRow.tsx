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
    team: "home" | "away";
    statType: string;
    line: number;
    overOdds: number;
    underOdds: number;
    category: string;
  };
  game: Game;
}

export function PlayerPropRow({ prop, game }: PlayerPropRowProps) {
  const { addBet, removeBet, betSlip } = useBetSlip();

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
      // Use the standard addBet API - for props we'll use the same signature
      // but the line will represent the prop line
      addBet(game, "total", selection as any, odds, prop.line);
    }
  };

  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center py-3 border-b border-border/50 hover:bg-muted/20 transition-colors px-3 -mx-3">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {prop.playerName}
          </span>
          <span className="text-xs text-muted-foreground">
            {prop.position}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {prop.statType}
        </div>
      </div>

      <div className="flex flex-col items-center">
        <Button
          size="sm"
          variant={isBetInSlip("over") ? "default" : "outline"}
          onClick={(e) => handleBetClick("over", prop.overOdds, e)}
          className={cn(
            "min-w-[80px] h-9 text-xs font-medium",
            isBetInSlip("over") &&
              "bg-primary text-primary-foreground border-primary"
          )}
        >
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[10px] opacity-80">O {prop.line}</span>
            <span className="font-semibold">{formatOdds(prop.overOdds)}</span>
          </div>
        </Button>
      </div>

      <div className="flex flex-col items-center">
        <Button
          size="sm"
          variant={isBetInSlip("under") ? "default" : "outline"}
          onClick={(e) => handleBetClick("under", prop.underOdds, e)}
          className={cn(
            "min-w-[80px] h-9 text-xs font-medium",
            isBetInSlip("under") &&
              "bg-primary text-primary-foreground border-primary"
          )}
        >
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[10px] opacity-80">U {prop.line}</span>
            <span className="font-semibold">{formatOdds(prop.underOdds)}</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
