"use client";

import { Button } from "@/components/ui";
import { formatOdds } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useBetSlip } from "@/context";
import { Game } from "@/types";

interface GamePropButtonProps {
  prop: {
    id: string;
    propType: string;
    description: string;
    selection: string | null;
    odds: number;
    line: number | null;
  };
  game: Game;
}

export function GamePropButton({ prop, game }: GamePropButtonProps) {
  const { addGamePropBet, removeBet, betSlip } = useBetSlip();

  const betId = `${game.id}-gameprop-${prop.id}`;

  const isBetInSlip = betSlip.bets.some((b) => b.id === betId);

  const handleBetClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (isBetInSlip) {
      removeBet(betId);
    } else {
      // Extract period ID from prop type if present (e.g., "1q_team_total_home_over")
      const periodMatch = prop.propType.match(/^(1q|2q|3q|4q|1h|2h|1p|2p|3p)_/);
      const periodID = periodMatch ? periodMatch[1] : undefined;
      
      // Add game prop bet with proper metadata including periodID for settlement
      addGamePropBet(
        game,
        prop.id,
        prop.selection || "over",
        prop.odds,
        prop.line ?? undefined,
        {
          marketCategory: "Game Props",
          propType: prop.propType,
          description: prop.description,
          periodID, // Include period ID for proper settlement
        }
      );
    }
  };

  return (
    <Button
      size="sm"
      variant={isBetInSlip ? "default" : "outline"}
      onClick={handleBetClick}
      className={cn(
        "h-auto py-2 px-3 text-xs font-medium whitespace-normal text-left",
        isBetInSlip && "bg-primary text-primary-foreground border-primary"
      )}
    >
      <div className="flex flex-col gap-0.5 w-full">
        {prop.selection && (
          <span className="text-xs font-semibold">{prop.selection}</span>
        )}
        {prop.line !== null && (
          <span className="text-[10px] opacity-80">
            Line: {prop.line}
          </span>
        )}
        <span className="font-bold text-sm">{formatOdds(prop.odds)}</span>
      </div>
    </Button>
  );
}
