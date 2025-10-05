"use client";

import { PlayerPropRow } from "./PlayerPropRow";
import { Game } from "@/types";

interface PlayerPropsListProps {
  game: Game;
  playerProps: Array<{
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
  }>;
}

export function PlayerPropsList({ game, playerProps }: PlayerPropsListProps) {
  if (!playerProps || playerProps.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No player props available for this game.
      </div>
    );
  }

  // Group props by category
  const propsByCategory = playerProps.reduce((acc, prop) => {
    if (!acc[prop.category]) {
      acc[prop.category] = [];
    }
    acc[prop.category].push(prop);
    return acc;
  }, {} as Record<string, typeof playerProps>);

  const categories = Object.keys(propsByCategory);

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No player props available for this game.
      </div>
    );
  }

  // Show all props in one list
  return (
    <div className="space-y-1">
      {playerProps.map((prop) => (
        <PlayerPropRow key={prop.id} prop={prop} game={game} />
      ))}
    </div>
  );
}
