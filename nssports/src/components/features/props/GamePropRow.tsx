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

// Helper function to format prop types for display (removes SDK API IDs)
const formatPropType = (propType: string): string => {
  // Remove common SDK suffixes/patterns
  return propType
    .replace(/game_eo/gi, 'Even/Odd')
    .replace(/1q_eo/gi, '1st Quarter Even/Odd')
    .replace(/2q_eo/gi, '2nd Quarter Even/Odd')
    .replace(/3q_eo/gi, '3rd Quarter Even/Odd')
    .replace(/4q_eo/gi, '4th Quarter Even/Odd')
    .replace(/1h_eo/gi, '1st Half Even/Odd')
    .replace(/2h_eo/gi, '2nd Half Even/Odd')
    .replace(/1p_eo/gi, '1st Period Even/Odd')
    .replace(/2p_eo/gi, '2nd Period Even/Odd')
    .replace(/3p_eo/gi, '3rd Period Even/Odd')
    .replace(/_eo/gi, ' Even/Odd')
    .replace(/_ou/gi, ' Over/Under')
    .replace(/_ml3way/gi, ' 3-Way Moneyline')
    .replace(/ml3way/gi, '3-Way Moneyline')
    .replace(/_ml/gi, ' Moneyline')
    .replace(/_sp/gi, ' Spread')
    .replace(/_yn/gi, '')
    .replace(/game_/gi, '')
    .replace(/1q_/gi, '1Q ')
    .replace(/2q_/gi, '2Q ')
    .replace(/3q_/gi, '3Q ')
    .replace(/4q_/gi, '4Q ')
    .replace(/1h_/gi, '1H ')
    .replace(/2h_/gi, '2H ')
    .replace(/1p_/gi, '1P ')
    .replace(/2p_/gi, '2P ')
    .replace(/3p_/gi, '3P ')
    .replace(/_/g, ' ')
    .trim();
};

// Helper function to format outcome descriptions with team names
const formatOutcomeDescription = (description: string, game: Game, outcome: { sideID: string; selection: string }): string => {
  // Extract last word from team name (e.g., "Kansas City Chiefs" → "Chiefs")
  const homeTeam = game.homeTeam.name.split(' ').pop() || game.homeTeam.name;
  const awayTeam = game.awayTeam.name.split(' ').pop() || game.awayTeam.name;
  
  // Determine if this is Even or Odd based on sideID or selection
  const isEven = outcome.sideID.toLowerCase().includes('even') || outcome.selection.toLowerCase().includes('even');
  const isOdd = outcome.sideID.toLowerCase().includes('odd') || outcome.selection.toLowerCase().includes('odd');
  
  let formatted = description;
  
  // Handle 3-way moneyline specific outcomes
  if (outcome.selection === 'draw') {
    return 'Draw';
  } else if (outcome.selection === 'away+draw') {
    return `${awayTeam} or Draw`;
  } else if (outcome.selection === 'home+draw') {
    return `${homeTeam} or Draw`;
  } else if (outcome.selection === 'not_draw') {
    return 'No Draw';
  }
  
  // Replace with proper team name and Even/Odd
  if (description.toLowerCase().includes('home')) {
    if (isEven) {
      formatted = `${homeTeam} Even`;
    } else if (isOdd) {
      formatted = `${homeTeam} Odd`;
    } else {
      formatted = description.replace(/\bhome\b/gi, homeTeam);
    }
  } else if (description.toLowerCase().includes('away')) {
    if (isEven) {
      formatted = `${awayTeam} Even`;
    } else if (isOdd) {
      formatted = `${awayTeam} Odd`;
    } else {
      formatted = description.replace(/\baway\b/gi, awayTeam);
    }
  } else {
    // Generic replacements for other cases
    formatted = description
      .replace(/\bhome\b/gi, homeTeam)
      .replace(/\baway\b/gi, awayTeam)
      .replace(/\bdraw\b/gi, 'Draw')
      .replace(/\bnot_draw\b/gi, 'No Draw');
  }
  
  // Clean up common SDK patterns
  formatted = formatted
    .replace(/\s+eo$/gi, '')
    .replace(/\s+ou$/gi, '')
    .replace(/\s+ml3way$/gi, '')
    .replace(/\s+ml$/gi, '')
    .replace(/\s+sp$/gi, '')
    .replace(/\s+yn$/gi, '')
    .replace(/\+/g, ' or ')
    .trim();
  
  return formatted;
};

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
      // Extract period ID from prop type if present (e.g., "1q_ml", "2q_ou")
      const periodMatch = prop.propType.match(/^(1q|2q|3q|4q|1h|2h|1p|2p|3p)_/);
      const periodID = periodMatch ? periodMatch[1] : undefined;
      
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
          periodID, // Include period ID for proper settlement
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
            {formatPropType(prop.propType)}
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
                  {formatOutcomeDescription(outcome.description, game, outcome)}
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
                  {formatOutcomeDescription(outcome.description, game, outcome)}
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
