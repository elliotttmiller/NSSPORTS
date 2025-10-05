"use client";

import { PropCategory } from "./PropCategory";
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

// Category metadata with icons and proper names
const categoryMetadata: Record<string, { name: string; icon: string; priority: number }> = {
  scoring: { name: "Scoring Props", icon: "🎯", priority: 1 },
  defense: { name: "Defensive Props", icon: "🛡️", priority: 2 },
  passing: { name: "Passing Props", icon: "🏈", priority: 3 },
  rushing: { name: "Rushing Props", icon: "🏃", priority: 4 },
  receiving: { name: "Receiving Props", icon: "🙌", priority: 5 },
  kicking: { name: "Kicking Props", icon: "⚽", priority: 6 },
};

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

  // Sort categories by priority
  const sortedCategories = Object.keys(propsByCategory).sort((a, b) => {
    const priorityA = categoryMetadata[a]?.priority || 999;
    const priorityB = categoryMetadata[b]?.priority || 999;
    return priorityA - priorityB;
  });

  if (sortedCategories.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No player props available for this game.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedCategories.map((categoryKey, index) => {
        const metadata = categoryMetadata[categoryKey] || {
          name: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1),
          icon: "📊",
          priority: 999,
        };

        return (
          <PropCategory
            key={categoryKey}
            category={{
              name: metadata.name,
              icon: metadata.icon,
              props: propsByCategory[categoryKey],
            }}
            game={game}
            defaultOpen={index === 0} // Open first category by default
          />
        );
      })}
    </div>
  );
}
