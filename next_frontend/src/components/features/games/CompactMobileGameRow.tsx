"use client";

import { useState } from "react";
import { TeamLogo } from "./TeamLogo";
import { Button, Badge } from "@/components/ui";
import { useBetSlip } from "@/context";
import { formatOdds, formatGameTime, formatSpreadLine } from "@/lib/formatters";
import type { Game } from "@/types";

interface Props {
  game: Game;
  index?: number;
}

export function CompactMobileGameRow({ game, index }: Props) {
  const { betSlip, addBet, removeBet } = useBetSlip();
  const [expanded, setExpanded] = useState(false);

  const isBetInSlip = (betType: "spread" | "total" | "moneyline", team: "home" | "away") => {
    return betSlip.bets.some(
      (bet) => bet.gameId === game.id && bet.betType === betType && bet.selection === team
    );
  };

  const handleBetClick = (
    betType: "spread" | "total" | "moneyline",
    team: "home" | "away",
    odds: number,
    line?: number
  ) => {
    const betId = `${game.id}-${betType}-${team}`;
    const existingBet = betSlip.bets.find((b) => b.id === betId);

    if (existingBet) {
      removeBet(betId);
    } else {
      addBet(game, betType, team, odds, line);
    }
  };

  const getOddsForBetType = (betType: "spread" | "total" | "moneyline") => {
    return game.odds[betType];
  };

  const getTotalOdds = () => {
    const total = game.odds.total;
    return {
      over: total.over || { odds: -110, line: 220 },
      under: total.under || { odds: -110, line: 220 },
    };
  };

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-3">
      {/* Header with Time and League */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs">
          {game.leagueId.toUpperCase()}
        </Badge>
        <span>{formatGameTime(game.startTime)}</span>
      </div>

      {/* Teams */}
      <div className="space-y-2">
        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <TeamLogo
              src={game.awayTeam.logo}
              alt={game.awayTeam.name}
              size={24}
            />
            <div className="flex flex-col">
              <span className="font-medium text-sm text-foreground">
                {game.awayTeam.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {game.awayTeam.record}
              </span>
            </div>
          </div>
          {game.status === "live" && game.awayScore !== undefined && (
            <span className="text-lg font-bold text-foreground">
              {game.awayScore}
            </span>
          )}
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <TeamLogo
              src={game.homeTeam.logo}
              alt={game.homeTeam.name}
              size={24}
            />
            <div className="flex flex-col">
              <span className="font-medium text-sm text-foreground">
                {game.homeTeam.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {game.homeTeam.record}
              </span>
            </div>
          </div>
          {game.status === "live" && game.homeScore !== undefined && (
            <span className="text-lg font-bold text-foreground">
              {game.homeScore}
            </span>
          )}
        </div>
      </div>

      {/* Quick Odds - Spread */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={isBetInSlip("spread", "away") ? "default" : "outline"}
          size="sm"
          className="text-xs"
          onClick={() =>
            handleBetClick(
              "spread",
              "away",
              getOddsForBetType("spread").away.odds,
              getOddsForBetType("spread").away.line
            )
          }
        >
          <span className="font-medium">{game.awayTeam.shortName}</span>
          <span className="ml-1">
            {formatSpreadLine(getOddsForBetType("spread").away.line)}
          </span>
          <span className="ml-1 text-muted-foreground">
            {formatOdds(getOddsForBetType("spread").away.odds)}
          </span>
        </Button>

        <Button
          variant={isBetInSlip("spread", "home") ? "default" : "outline"}
          size="sm"
          className="text-xs"
          onClick={() =>
            handleBetClick(
              "spread",
              "home",
              getOddsForBetType("spread").home.odds,
              getOddsForBetType("spread").home.line
            )
          }
        >
          <span className="font-medium">{game.homeTeam.shortName}</span>
          <span className="ml-1">
            {formatSpreadLine(getOddsForBetType("spread").home.line)}
          </span>
          <span className="ml-1 text-muted-foreground">
            {formatOdds(getOddsForBetType("spread").home.odds)}
          </span>
        </Button>
      </div>

      {/* Expand/Collapse Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-xs text-accent hover:text-accent/80 transition-colors"
      >
        {expanded ? "Show Less" : "Show More Odds"}
      </button>

      {/* Expanded Odds Section */}
      {expanded && (
        <div className="space-y-2 pt-2 border-t border-border">
          {/* Total */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Total</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={isBetInSlip("total", "away") ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() =>
                  handleBetClick(
                    "total",
                    "away",
                    getTotalOdds().over.odds,
                    getTotalOdds().over.line
                  )
                }
              >
                <span>O {getTotalOdds().over.line}</span>
                <span className="ml-1 text-muted-foreground">
                  {formatOdds(getTotalOdds().over.odds)}
                </span>
              </Button>

              <Button
                variant={isBetInSlip("total", "home") ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() =>
                  handleBetClick(
                    "total",
                    "home",
                    getTotalOdds().under.odds,
                    getTotalOdds().under.line
                  )
                }
              >
                <span>U {getTotalOdds().under.line}</span>
                <span className="ml-1 text-muted-foreground">
                  {formatOdds(getTotalOdds().under.odds)}
                </span>
              </Button>
            </div>
          </div>

          {/* Moneyline */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Moneyline</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={isBetInSlip("moneyline", "away") ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() =>
                  handleBetClick(
                    "moneyline",
                    "away",
                    getOddsForBetType("moneyline").away.odds
                  )
                }
              >
                <span>{game.awayTeam.shortName}</span>
                <span className="ml-1 text-muted-foreground">
                  {formatOdds(getOddsForBetType("moneyline").away.odds)}
                </span>
              </Button>

              <Button
                variant={isBetInSlip("moneyline", "home") ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() =>
                  handleBetClick(
                    "moneyline",
                    "home",
                    getOddsForBetType("moneyline").home.odds
                  )
                }
              >
                <span>{game.homeTeam.shortName}</span>
                <span className="ml-1 text-muted-foreground">
                  {formatOdds(getOddsForBetType("moneyline").home.odds)}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
