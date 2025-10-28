"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Game } from "@/types";
import { PlayerProp } from "@/hooks/usePlayerProps";
import { StatTypeCategory } from "./StatTypeCategory";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

// Helper function to format category names for display (capitalize first letter of each word)
const formatCategoryName = (category: string): string => {
  return category
    .split(/([+-])/) // Split on + or - while keeping the separators
    .map(part => {
      if (part === '+' || part === '-') return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
};

export function PlayerPropsView({ game, playerProps }: PlayerPropsViewProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [activeStatType, setActiveStatType] = useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get selected player display text
  const selectedPlayerText = useMemo(() => {
    if (selectedPlayer === "all") return "All Players";
    const player = players.find(p => p.id === selectedPlayer);
    return player ? player.name : "All Players";
  }, [selectedPlayer, players]);

  // Filter props based on selected player only (for generating available stat types)
  const playerFilteredProps = useMemo(() => {
    if (selectedPlayer === "all") {
      return playerProps;
    }
    return playerProps.filter((prop) => prop.playerId === selectedPlayer);
  }, [playerProps, selectedPlayer]);

  // Filter props based on selected player and stat type (for display)
  const filteredProps = useMemo(() => {
    let filtered = playerFilteredProps;

    if (activeStatType !== "all") {
      filtered = filtered.filter((prop) => prop.statType === activeStatType);
    }

    return filtered;
  }, [playerFilteredProps, activeStatType]);

  // Group props by stat type (using player-filtered props to keep all tabs visible)
  const propsByStatType = useMemo(() => {
    return playerFilteredProps.reduce((acc, prop) => {
      if (!acc[prop.statType]) {
        acc[prop.statType] = [];
      }
      acc[prop.statType].push(prop);
      return acc;
    }, {} as Record<string, typeof playerFilteredProps>);
  }, [playerFilteredProps]);

  // Get sorted stat types for tabs (based on available props for selected player)
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
      <div className="text-center py-8 px-4">
        <div className="text-sm text-muted-foreground mb-2">
          No player props available yet.
        </div>
        <div className="text-xs text-muted-foreground/70">
          Player props typically become available 1-2 hours before game time.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 isolate relative">
      {/* Sticky Filters & Categories Container - positioned below parent tabs (Player/Game Props tabs) */}
      <div 
        className="sticky z-[15] bg-background/95 backdrop-blur-sm border-b border-border pb-2 pt-2"
        style={{ top: 'calc(4.5rem + env(safe-area-inset-top))' }}
      >
        {/* Inner wrapper with proper padding that respects parent container */}
        <div className="space-y-4">
        {/* Player Filter - Styled Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 w-full">
          <label className="text-sm font-medium text-muted-foreground">
            Filter by Player
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                "flex h-10 w-full sm:w-[240px] items-center justify-between rounded-lg",
                "border border-border bg-background/80 px-3 py-2 text-sm",
                "shadow-xs transition-all duration-200",
                "hover:bg-accent/10 hover:border-accent/50",
                "focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent",
                isDropdownOpen && "ring-2 ring-accent/50 border-accent"
              )}
            >
              <span className={cn(
                "truncate",
                selectedPlayer === "all" ? "text-muted-foreground" : "text-foreground font-medium"
              )}>
                {selectedPlayerText}
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isDropdownOpen && "rotate-180"
              )} />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "absolute z-50 mt-2 w-full sm:w-[240px]",
                    "max-h-[300px] overflow-y-auto",
                    "rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-lg",
                    "seamless-scroll"
                  )}
                  data-mobile-scroll
                  style={{ 
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y'
                  }}
                >
                  <div className="p-1">
                    {/* All Players Option */}
                    <button
                      onClick={() => {
                        setSelectedPlayer("all");
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm transition-colors",
                        selectedPlayer === "all"
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="flex-1 text-left">All Players</span>
                      {selectedPlayer === "all" && (
                        <span className="text-xs text-muted-foreground">✓</span>
                      )}
                    </button>

                    {/* Divider */}
                    <div className="my-1 border-t border-border" />

                    {/* Player List */}
                    {players.map((player) => (
                      <button
                        key={player.id}
                        onClick={() => {
                          setSelectedPlayer(player.id);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-md text-sm transition-colors",
                          selectedPlayer === player.id
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{player.name}</span>
                          {selectedPlayer === player.id && (
                            <span className="text-xs text-muted-foreground">✓</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{player.team}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Category Tabs */}
        <div 
          className="flex gap-1 overflow-x-auto scrollbar-hide w-full max-w-full"
          data-mobile-scroll
          style={{ 
            overscrollBehaviorX: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x'
          }}
        >
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
            {formatCategoryName(statType)}
          </button>
        ))}
      </div>
      {/* End of Category Tabs */}
      </div>
      {/* End of space-y-4 wrapper */}
      </div>
      {/* End of Sticky Container */}

      {/* Props List - Isolated z-index context */}
      <div className="relative z-0">
      {filteredProps.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No props match the selected filters.
        </div>
      ) : activeStatType === "all" ? (
        <div className="space-y-3">
          {statTypes.map((statType) => (
            <StatTypeCategory
              key={statType}
              statType={{
                name: statType,
                displayName: statType,
                props: propsByStatType[statType],
              }}
              game={game}
              defaultOpen={false}
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
    </div>
  );
}
