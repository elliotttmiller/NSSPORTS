"use client";

import { useState, useMemo } from "react";
import { Game } from "@/types";
import { GamePropsMap } from "@/hooks/useGameProps";
import { GamePropButton } from "./GamePropButton";
import { cn } from "@/lib/utils";

interface GamePropsViewProps {
  game: Game;
  gameProps: GamePropsMap;
}

// Map prop types to readable names
const propTypeNames: Record<string, string> = {
  first_basket: "First Basket Scorer",
  total_threes: "Total Three-Pointers",
  winning_margin: "Winning Margin",
  double_double: "Double-Double",
  race_to: "Race To",
  handicap_win: "Handicap Win",
  total_points: "Total Points",
  to_win: "To Win",
  first_half: "1st Half",
  double_result: "Double Result",
  quarter_handicap: "Quarter Handicap",
};

// Priority order for prop type display
const propTypePriority: Record<string, number> = {
  handicap_win: 1,
  total_points: 2,
  to_win: 3,
  first_half: 4,
  double_result: 5,
  quarter_handicap: 6,
  first_basket: 7,
  total_threes: 8,
  winning_margin: 9,
  double_double: 10,
  race_to: 11,
};

export function GamePropsView({ game, gameProps }: GamePropsViewProps) {
  const propTypes = Object.keys(gameProps);
  const [activePropType, setActivePropType] = useState<string>(
    propTypes.length > 0 ? propTypes[0] : ""
  );

  // Sort prop types by priority
  const sortedPropTypes = useMemo(() => {
    return propTypes.sort((a, b) => {
      const priorityA = propTypePriority[a] || 999;
      const priorityB = propTypePriority[b] || 999;
      return priorityA - priorityB;
    });
  }, [propTypes]);

  if (propTypes.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No game props available for this game.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {sortedPropTypes.map((propType) => (
            <button
              key={propType}
              onClick={() => setActivePropType(propType)}
              className={cn(
                "px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-md transition-colors",
                activePropType === propType
                  ? "bg-muted text-foreground border-b-2 border-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {propTypeNames[propType] || propType.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Props for Active Category */}
      {activePropType && gameProps[activePropType] && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">
            {propTypeNames[activePropType] || activePropType.replace(/_/g, " ")}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {gameProps[activePropType].map((prop) => (
              <GamePropButton key={prop.id} prop={prop} game={game} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
