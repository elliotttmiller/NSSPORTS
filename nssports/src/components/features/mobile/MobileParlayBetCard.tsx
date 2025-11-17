"use client";

import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatOdds } from "@/lib/formatters";
import { formatSelectionLabel } from "@/components/bets/BetCard";
import type { PlacedBet } from "@/context/BetHistoryContext";
import type { ReactElement } from "react";

interface MobileParlayBetCardProps {
  bet: PlacedBet;
}

type BetStatus = "pending" | "won" | "lost" | "push";

// Helper function to render color-coded results for ALL bet types
function renderColorCodedResult(
  actualResult: string, 
  betType?: string, 
  status?: BetStatus,
  line?: number,
  selection?: string
): ReactElement | string {
  if (!actualResult) return actualResult;

  // Handle score-based results (spread, moneyline, game props with periods)
  const scoreMatch = actualResult.match(/^(?:([A-Z0-9]+):\s+)?([A-Z]+)\s+(\d+)\s+-\s+([A-Z]+)\s+(\d+)$/);
  if (scoreMatch) {
    const [, period, team1, score1, team2, score2] = scoreMatch;
    const score1Num = parseInt(score1, 10);
    const score2Num = parseInt(score2, 10);
    
    const team1Color = score1Num > score2Num ? "text-green-600" : score1Num < score2Num ? "text-red-600" : "text-foreground/80";
    const team2Color = score2Num > score1Num ? "text-green-600" : score2Num < score1Num ? "text-red-600" : "text-foreground/80";
    
    return (
      <span className="font-medium tabular-nums text-[9px]">
        {period && <span className="text-muted-foreground/60 mr-1">{period}:</span>}
        <span className={team1Color}>
          {team1} {score1}
        </span>
        <span className="text-muted-foreground/60 mx-1">-</span>
        <span className={team2Color}>
          {team2} {score2}
        </span>
      </span>
    );
  }

  // Handle total results
  if (betType === 'total' && actualResult.startsWith('Final: ')) {
    const total = actualResult.replace('Final: ', '');
    const totalNum = parseFloat(total);
    
    let color = "text-foreground/80";
    if (typeof line === 'number' && !isNaN(totalNum)) {
      if (totalNum > line) {
        color = selection === 'over' ? "text-green-600" : "text-red-600";
      } else if (totalNum < line) {
        color = selection === 'under' ? "text-green-600" : "text-red-600";
      }
    }
    
    return (
      <span className={cn("font-semibold tabular-nums text-[9px]", color)}>
        Final: {total}
      </span>
    );
  }

  // Handle player prop results
  if (betType === 'player_prop') {
    if (actualResult.includes('|')) {
      const parts = actualResult.split('|');
      const [statPart, linePart] = parts;
      const statMatch = statPart.trim().match(/^([\d.]+)\s+(.+)$/);
      const lineMatch = linePart?.trim().match(/^Line:\s+([\d.]+)$/);
      
      if (statMatch) {
        const [, statValue, statType] = statMatch;
        const statNum = parseFloat(statValue);
        const lineNum = lineMatch ? parseFloat(lineMatch[1]) : line;
        
        let color = "text-foreground/80";
        if (typeof lineNum === 'number' && !isNaN(statNum)) {
          if (statNum > lineNum) {
            color = selection === 'over' ? "text-green-600" : "text-red-600";
          } else if (statNum < lineNum) {
            color = selection === 'under' ? "text-green-600" : "text-red-600";
          } else {
            color = "text-blue-500";
          }
        }
        
        return (
          <span className="font-medium text-[9px]">
            <span className={cn("font-bold tabular-nums", color)}>{statValue}</span>
            <span className="text-muted-foreground/70 text-[8px] ml-0.5">{statType}</span>
          </span>
        );
      }
    }
    
    const match = actualResult.match(/^([\d.]+)\s+(.+)$/);
    if (match) {
      const [, statValue, statType] = match;
      const statNum = parseFloat(statValue);
      
      let color = "text-foreground/80";
      if (typeof line === 'number' && !isNaN(statNum)) {
        if (statNum > line) {
          color = selection === 'over' ? "text-green-600" : "text-red-600";
        } else if (statNum < line) {
          color = selection === 'under' ? "text-green-600" : "text-red-600";
        } else {
          color = "text-blue-500";
        }
      }
      
      return (
        <span className="font-medium text-[9px]">
          <span className={cn("font-bold tabular-nums", color)}>{statValue}</span>
          <span className="text-muted-foreground/70 text-[8px] ml-0.5">{statType}</span>
        </span>
      );
    }
  }

  // Handle game prop single team results
  if (betType === 'game_prop' && actualResult.includes(':')) {
    const match = actualResult.match(/^([A-Z]+):\s+(\d+)$/);
    if (match) {
      const [, team, score] = match;
      const scoreNum = parseInt(score, 10);
      
      let color = "text-foreground/80";
      if (typeof line === 'number' && !isNaN(scoreNum)) {
        if (scoreNum > line) {
          color = selection === 'over' ? "text-green-600" : "text-red-600";
        } else if (scoreNum < line) {
          color = selection === 'under' ? "text-green-600" : "text-red-600";
        } else {
          color = "text-blue-500";
        }
      }
      
      return (
        <span className="font-medium text-[9px]">
          <span className="text-muted-foreground/70">{team}:</span>
          <span className={cn("font-bold tabular-nums ml-1", color)}>{score}</span>
        </span>
      );
    }
  }

  // Default
  return <span className="text-foreground/80 font-medium text-[9px]">{actualResult}</span>;
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
                  {/* Actual Result - Show for settled parlays */}
                  {leg.actualResult && bet.status !== 'pending' && (
                    <div className="text-[9px] mt-1 font-medium">
                      <span className="text-muted-foreground/50">Result: </span>
                      <span>{renderColorCodedResult(leg.actualResult, leg.betType, bet.status, leg.line, leg.selection)}</span>
                    </div>
                  )}
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
