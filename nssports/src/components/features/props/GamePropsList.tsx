"use client";

import { GamePropButton } from "./GamePropButton";
import { Game } from "@/types";

interface GamePropsListProps {
  game: Game;
  gameProps: Record<string, Array<{
    id: string;
    propType: string;
    description: string;
    selection: string | null;
    odds: number;
    line: number | null;
  }>>;
}

// Map prop types to readable names
const propTypeNames: Record<string, string> = {
  first_basket: "First Basket Scorer",
  total_threes: "Total Three-Pointers",
  winning_margin: "Winning Margin",
  double_double: "Double-Double",
  race_to: "Race To",
};

export function GamePropsList({ game, gameProps }: GamePropsListProps) {
  const propTypes = Object.keys(gameProps);

  if (propTypes.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No game props available for this game.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {propTypes.map((propType) => (
        <div key={propType} className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">
            {propTypeNames[propType] || propType.replace(/_/g, " ")}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {gameProps[propType].map((prop) => (
              <GamePropButton key={prop.id} prop={prop} game={game} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
