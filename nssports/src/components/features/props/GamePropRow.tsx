"use client";

import { Button } from "@/components/ui";
import { formatOdds } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useBetSlip } from "@/context";
import { useCallback } from "react";
import { Game } from "@/types";

interface GamePropRowProps {
  prop: {
    marketID: string;
    marketCategory: string;
    propType: string;
    outcomes: Array<{
      id: string;
      description: string;
      selection: string;
      odds: number;
      line?: number;
      sideID: string;
    }>;
  };
  game: Game;
}

export function GamePropRow({ prop, game }: GamePropRowProps) {
  const { addGamePropBet, removeBet, betSlip } = useBetSlip();

  const getBetId = useCallback(
    (outcomeId: string) => {
      return `${game.id}-gameprop-${outcomeId}`;
    },
    [game.id]
  );

  const isBetInSlip = useCallback(
    (outcomeId: string) => {
      const betId = getBetId(outcomeId);
      return betSlip.bets.some((b) => b.id === betId);
    },
    [betSlip, getBetId]
  );

  const handleBetClick = (
    outcome: {
      id: string;
      description: string;
      selection: string;
      odds: number;
      line?: number;
    },
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    const betId = getBetId(outcome.id);

    if (isBetInSlip(outcome.id)) {
      removeBet(betId);
    } else {
      addGamePropBet(
        game,
        outcome.id,
        outcome.selection,
        outcome.odds,
        outcome.line,
        {
          marketCategory: prop.marketCategory,
          propType: prop.propType,
          description: outcome.description,
        }
      );
    }
  };

  // If only 2 outcomes, display side by side (like over/under)
  if (prop.outcomes.length === 2) {
    return (
      <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1.5fr_auto_auto] gap-2 md:gap-3 items-center py-3 border-b border-border/50 hover:bg-muted/20 transition-colors px-2 md:px-3 -mx-2 md:-mx-3 last:border-b-0">
        <div className="flex flex-col min-w-0">
          <span className="text-xs md:text-sm font-semibold text-foreground">
            {prop.marketCategory}
          </span>
          <span className="text-xs text-muted-foreground mt-0.5">
            {prop.propType.replace(/_/g, ' ')}
          </span>
        </div>

        {prop.outcomes.map((outcome) => (
          <div key={outcome.id} className="flex flex-col items-center flex-shrink-0">
            <Button
              size="sm"
              variant={isBetInSlip(outcome.id) ? "default" : "outline"}
              onClick={(e) => handleBetClick(outcome, e)}
              className={cn(
                "min-w-[70px] md:min-w-[80px] h-8 md:h-9 text-xs font-medium",
                isBetInSlip(outcome.id) &&
                  "bg-primary text-primary-foreground border-primary"
              )}
            >
              <div className="flex flex-col items-center leading-tight">
                <span className="text-[10px] opacity-80 truncate max-w-full">
                  {outcome.description}
                </span>
                <span className="font-semibold text-[11px] md:text-xs">
                  {formatOdds(outcome.odds)}
                </span>
              </div>
            </Button>
          </div>
        ))}
      </div>
    );
  }

  // For multiple outcomes, display as a grid
  return (
    <div className="py-3 border-b border-border/50 hover:bg-muted/20 transition-colors px-2 md:px-3 -mx-2 md:-mx-3 last:border-b-0">
      <div className="flex flex-col gap-2">
        <div className="text-xs md:text-sm font-semibold text-foreground">
          {prop.marketCategory}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {prop.outcomes.map((outcome) => (
            <Button
              key={outcome.id}
              size="sm"
              variant={isBetInSlip(outcome.id) ? "default" : "outline"}
              onClick={(e) => handleBetClick(outcome, e)}
              className={cn(
                "h-auto py-2 px-2 text-xs font-medium whitespace-normal text-center",
                isBetInSlip(outcome.id) &&
                  "bg-primary text-primary-foreground border-primary"
              )}
            >
              <div className="flex flex-col gap-0.5 w-full">
                <span className="text-[10px] font-semibold truncate">
                  {outcome.description}
                </span>
                {outcome.line !== undefined && (
                  <span className="text-[9px] opacity-70">
                    {outcome.line}
                  </span>
                )}
                <span className="font-bold text-xs">
                  {formatOdds(outcome.odds)}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
