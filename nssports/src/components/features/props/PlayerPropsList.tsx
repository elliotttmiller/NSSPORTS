"use client";

import { StatTypeCategory } from "./StatTypeCategory";
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

// Stat type priority for sorting
const statTypePriority: Record<string, number> = {
  Points: 1,
  Rebounds: 2,
  Assists: 3,
  Steals: 4,
  Blocks: 5,
  "Three-Pointers Made": 6,
  "Passing Yards": 7,
  "Passing TDs": 8,
  "Rushing Yards": 9,
  "Receiving Yards": 10,
  Receptions: 11,
  Touchdowns: 12,
};

export function PlayerPropsList({ game, playerProps }: PlayerPropsListProps) {
  if (!playerProps || playerProps.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No player props available for this game.
      </div>
    );
  }

  // Group props by stat type (this is now the primary organization)
  const propsByStatType = playerProps.reduce((acc, prop) => {
    if (!acc[prop.statType]) {
      acc[prop.statType] = [];
    }
    acc[prop.statType].push(prop);
    return acc;
  }, {} as Record<string, typeof playerProps>);

  // Sort stat types by priority
  const sortedStatTypes = Object.keys(propsByStatType).sort((a, b) => {
    const priorityA = statTypePriority[a] || 999;
    const priorityB = statTypePriority[b] || 999;
    return priorityA - priorityB;
  });

  if (sortedStatTypes.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No player props available for this game.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedStatTypes.map((statType, index) => {
        return (
          <StatTypeCategory
            key={statType}
            statType={{
              name: statType,
              displayName: statType,
              props: propsByStatType[statType],
            }}
            game={game}
            defaultOpen={index === 0} // Open first stat type by default
          />
        );
      })}
    </div>
  );
}
