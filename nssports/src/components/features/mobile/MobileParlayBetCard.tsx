"use client";

import { Badge } from "@/components/ui";
import { formatOdds } from "@/lib/formatters";
import { formatSelectionLabel } from "@/components/bets/BetCard";
import type { PlacedBet } from "@/context/BetHistoryContext";

interface MobileParlayBetCardProps {
  bet: PlacedBet;
}

export function MobileParlayBetCard({ bet }: MobileParlayBetCardProps) {
  const legs = bet.legs || [];
  const placed = bet.placedAt ? new Date(bet.placedAt) : null;
  const isWon = bet.status === "won";
  const isLost = bet.status === "lost";
  const profit = bet.potentialPayout - bet.stake;

  const formatLegDescription = (leg: NonNullable<PlacedBet["legs"]>[number]) => {
    if (!leg.game) return "N/A";
    
    return formatSelectionLabel(
      leg.betType || "unknown",
      leg.selection,
      leg.line,
      {
        homeTeam: { shortName: leg.game.homeTeam.shortName },
        awayTeam: { shortName: leg.game.awayTeam.shortName },
      },
      leg.playerProp,
      leg.gameProp
    );
  };

  const formatMatchup = (leg: NonNullable<PlacedBet["legs"]>[number]) => {
    if (!leg.game) return "";
    return `${leg.game.awayTeam.shortName} @ ${leg.game.homeTeam.shortName}`;
  };

  return (
    <div className="bg-card border-2 border-accent/20 rounded-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge 
            variant={isWon ? "default" : isLost ? "destructive" : "outline"}
            className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider ${
              isWon ? "bg-green-600 text-white border-green-600" : 
              isLost ? "bg-red-600 text-white border-red-600" : 
              "bg-yellow-50 text-yellow-700 border-yellow-200"
            }`}
          >
            {bet.status.toUpperCase()}
          </Badge>
          <Badge 
            variant="outline"
            className="text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider bg-accent/10 text-accent border-accent/30"
          >
            PARLAY
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">
          {placed ? placed.toLocaleDateString() : "-"}
        </span>
      </div>

      {/* Parlay legs */}
      <div className="space-y-2">
        {legs.map((leg, index) => {
          if (!leg.game?.awayTeam?.shortName || !leg.game?.homeTeam?.shortName) {
            return null;
          }
          
          return (
            <div
              key={index}
              className="flex items-start justify-between py-2 border-b border-border/10 last:border-b-0"
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className="w-5 h-5 bg-accent/20 text-accent rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight whitespace-pre-line">
                    {formatLegDescription(leg)}
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    {formatMatchup(leg)}
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className="font-mono px-2 py-0.5 text-xs ml-2 border-2"
              >
                {formatOdds(leg.odds)}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Parlay Summary */}
      <div className="flex items-center justify-between pt-3 border-t border-border/20">
        <div className="flex items-end gap-3 flex-1">
          {/* Stake */}
          <div className="flex-1 text-center">
            <div className="text-xs text-muted-foreground mb-1">
              Stake
            </div>
            <div className="text-sm font-bold py-2 px-2 bg-background/50 rounded-md">
              ${bet.stake.toFixed(2)}
            </div>
          </div>

          {/* To Win / Won / Lost */}
          <div className="flex-1 text-center">
            <div className="text-xs text-muted-foreground mb-1">
              {isWon ? "Won" : isLost ? "Lost" : "To Win"}
            </div>
            <div className={`text-sm font-bold py-2 px-2 rounded-md border ${
              isWon ? "text-green-600 bg-green-50 border-green-200" :
              isLost ? "text-red-600 bg-red-50 border-red-200" :
              "text-white bg-white/10 border-white/30"
            }`}>
              {isWon ? `+$${profit.toFixed(2)}` :
               isLost ? `-$${bet.stake.toFixed(2)}` :
               `$${profit.toFixed(2)}`}
            </div>
          </div>

          {/* Total */}
          <div className="flex-1 text-center">
            <div className="text-xs text-muted-foreground mb-1">
              Total
            </div>
            <div className="text-sm font-bold text-accent py-2 px-2 bg-accent/10 rounded-md border border-accent/30">
              ${bet.potentialPayout.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
