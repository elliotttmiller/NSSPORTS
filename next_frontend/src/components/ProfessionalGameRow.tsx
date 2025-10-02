"use client";

import { Game } from "@/types";
import { TeamLogo } from "./TeamLogo";
import { formatOdds, formatSpreadLine, formatGameTime } from "@/lib/formatters";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

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

  return (
    <div
      className={cn(
        "group transition-colors duration-200 border-b border-border/20 last:border-b-0",
        isFirstInGroup && "border-t border-border",
      )}
    >
      {/* Game Row */}
      <div className="grid grid-cols-[80px_1fr_120px_120px_120px] gap-4 items-center py-2 px-4 min-h-[60px]">
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
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs px-2 transition-all duration-200 font-medium hover:bg-accent hover:text-accent-foreground"
          >
            {formatSpreadLine(game.odds.spread.away.line || 0)}{" "}
            {formatOdds(game.odds.spread.away.odds)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs px-2 transition-all duration-200 font-medium hover:bg-accent hover:text-accent-foreground"
          >
            {formatSpreadLine(game.odds.spread.home.line || 0)}{" "}
            {formatOdds(game.odds.spread.home.odds)}
          </Button>
        </div>

        {/* Total Column */}
        <div className="space-y-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs px-2 transition-all duration-200 font-medium hover:bg-accent hover:text-accent-foreground"
          >
            O {game.odds.total.over?.line} {formatOdds(game.odds.total.over?.odds || 0)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs px-2 transition-all duration-200 font-medium hover:bg-accent hover:text-accent-foreground"
          >
            U {game.odds.total.under?.line} {formatOdds(game.odds.total.under?.odds || 0)}
          </Button>
        </div>

        {/* Moneyline Column */}
        <div className="space-y-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs px-2 transition-all duration-200 font-medium hover:bg-accent hover:text-accent-foreground"
          >
            {formatOdds(game.odds.moneyline.away.odds)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs px-2 transition-all duration-200 font-medium hover:bg-accent hover:text-accent-foreground"
          >
            {formatOdds(game.odds.moneyline.home.odds)}
          </Button>
        </div>
      </div>
    </div>
  );
}
