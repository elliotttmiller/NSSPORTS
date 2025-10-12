"use client";

import { useState, useMemo } from "react";
import { Game } from "@/types";
import { PlayerProp } from "@/hooks/usePlayerProps";
import { StatTypeCategory } from "./StatTypeCategory";
import { cn } from "@/lib/utils";

interface PlayerPropsViewProps {
  game: Game;
  playerProps: PlayerProp[];
}

// Stat type priority for sorting and display
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

export function PlayerPropsView({ game, playerProps }: PlayerPropsViewProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [activeStatType, setActiveStatType] = useState<string>("all");

  // Get unique players for filter
  const players = useMemo(() => {
    const uniquePlayers = Array.from(
      new Map(
        playerProps.map((prop) => [
          prop.playerId,
          { id: prop.playerId, name: prop.playerName, team: prop.team },
        ])
      ).values()
    );
    return uniquePlayers.sort((a, b) => a.name.localeCompare(b.name));
  }, [playerProps]);

  // Filter props based on selected player and stat type
  const filteredProps = useMemo(() => {
    let filtered = playerProps;

    if (selectedPlayer !== "all") {
      filtered = filtered.filter((prop) => prop.playerId === selectedPlayer);
    }

    if (activeStatType !== "all") {
      filtered = filtered.filter((prop) => prop.statType === activeStatType);
    }

    return filtered;
  }, [playerProps, selectedPlayer, activeStatType]);

  // Group props by stat type
  const propsByStatType = useMemo(() => {
    return filteredProps.reduce((acc, prop) => {
      if (!acc[prop.statType]) {
        acc[prop.statType] = [];
      }
      acc[prop.statType].push(prop);
      return acc;
    }, {} as Record<string, typeof filteredProps>);
  }, [filteredProps]);

  // Get sorted stat types for tabs
  const statTypes = useMemo(() => {
    const types = Object.keys(propsByStatType).sort((a, b) => {
      const priorityA = statTypePriority[a] || 999;
      const priorityB = statTypePriority[b] || 999;
      return priorityA - priorityB;
    });
    return types;
  }, [propsByStatType]);

  if (!playerProps || playerProps.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No player props available for this game.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Player Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="player-filter" className="text-sm font-medium text-muted-foreground">
          Player Filter (Optional)
        </label>
        <select
          id="player-filter"
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
          className="flex h-10 w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Players</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveStatType("all")}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-md transition-colors",
              activeStatType === "all"
                ? "bg-muted text-foreground border-b-2 border-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            All Categories
          </button>
          {statTypes.map((statType) => (
            <button
              key={statType}
              onClick={() => setActiveStatType(statType)}
              className={cn(
                "px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-md transition-colors",
                activeStatType === statType
                  ? "bg-muted text-foreground border-b-2 border-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {statType}
            </button>
          ))}
        </div>
      </div>

      {/* Props List */}
      {filteredProps.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No props match the selected filters.
        </div>
      ) : activeStatType === "all" ? (
        <div className="space-y-3">
          {statTypes.map((statType, index) => (
            <StatTypeCategory
              key={statType}
              statType={{
                name: statType,
                displayName: statType,
                props: propsByStatType[statType],
              }}
              game={game}
              defaultOpen={index === 0}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <StatTypeCategory
            statType={{
              name: activeStatType,
              displayName: activeStatType,
              props: propsByStatType[activeStatType],
            }}
            game={game}
            defaultOpen={true}
          />
        </div>
      )}
    </div>
  );
}
