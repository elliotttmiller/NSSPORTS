"use client";

import { useState, useMemo, useEffect } from "react";
import { Game } from "@/types";
import { GamePropsMap, GamePropData } from "@/hooks/useGameProps";
import { GamePropCategory } from "./GamePropCategory";
import { cn } from "@/lib/utils";

interface GamePropsViewProps {
  game: Game;
  gameProps: GamePropsMap;
}

// Market category display order
const categoryPriority: Record<string, number> = {
  "Team Totals": 1,
  "1st Quarter": 2,
  "2nd Quarter": 3,
  "3rd Quarter": 4,
  "4th Quarter": 5,
  "1st Half": 6,
  "2nd Half": 7,
  "1st Period": 8,
  "2nd Period": 9,
  "3rd Period": 10,
  "Other Props": 99,
};

// Ordered category names for past-period detection
const QUARTER_CATEGORIES = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"] as const;
const PERIOD_CATEGORIES = ["1st Period", "2nd Period", "3rd Period"] as const;

/**
 * Returns the set of market category names whose periods have already
 * completed in a live game. These categories must not be available for
 * betting since the outcome of a past period is already known.
 */
function getPastPeriodCategories(game: Game): Set<string> {
  const past = new Set<string>();
  if (game.status !== "live") return past;

  const display = (game.periodDisplay || game.period || "").toLowerCase();

  // Quarter-based sports (NBA, NFL, NCAAB, NCAAF)
  // Matches: "3rd quarter", "3q", "q3"
  const quarterMatch =
    display.match(/\b([1-4])(?:st|nd|rd|th)?\s*quarter\b/) ||
    display.match(/\b([1-4])q\b/) ||
    display.match(/\bq([1-4])\b/);
  if (quarterMatch) {
    const current = parseInt(quarterMatch[1], 10);
    for (let i = 0; i < current - 1; i++) past.add(QUARTER_CATEGORIES[i]);
    // 1st Half ends when the 3rd quarter starts
    if (current >= 3) past.add("1st Half");
    return past;
  }

  // Half-based sports
  // Matches: "2nd half", "2h"
  const halfMatch =
    display.match(/\b([12])(?:st|nd)?\s*half\b/) ||
    display.match(/\b([12])h\b/);
  if (halfMatch && parseInt(halfMatch[1], 10) === 2) {
    past.add("1st Half");
    return past;
  }

  // Period-based sports (NHL)
  // Matches: "2nd period", "2p"
  const periodMatch =
    display.match(/\b([1-3])(?:st|nd|rd)?\s*period\b/) ||
    display.match(/\b([1-3])p\b/);
  if (periodMatch) {
    const current = parseInt(periodMatch[1], 10);
    for (let i = 0; i < current - 1; i++) past.add(PERIOD_CATEGORIES[i]);
    return past;
  }

  return past;
}

export function GamePropsView({ game, gameProps }: GamePropsViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Determine which period categories are no longer bettable for live games
  const pastCategories = useMemo(() => getPastPeriodCategories(game), [game]);

  // If the currently selected category becomes a past period (e.g. game
  // advances to the next quarter while the user has that tab open), reset
  // the selection so they are never looking at closed markets.
  useEffect(() => {
    if (activeCategory !== "all" && pastCategories.has(activeCategory)) {
      setActiveCategory("all");
    }
  }, [activeCategory, pastCategories]);

  // Group props by market category
  const propsByCategory = useMemo(() => {
    const grouped: Record<string, Record<string, GamePropData[]>> = {};
    
    Object.entries(gameProps).forEach(([propType, props]) => {
      props.forEach((prop) => {
        const category = prop.marketCategory || "Other Props";
        if (!grouped[category]) {
          grouped[category] = {};
        }
        if (!grouped[category][propType]) {
          grouped[category][propType] = [];
        }
        grouped[category][propType].push(prop);
      });
    });
    
    return grouped;
  }, [gameProps]);

  // Get sorted categories, excluding past periods for live games
  const categories = useMemo(() => {
    const cats = Object.keys(propsByCategory)
      .filter((cat) => !pastCategories.has(cat))
      .sort((a, b) => {
        const priorityA = categoryPriority[a] || 999;
        const priorityB = categoryPriority[b] || 999;
        return priorityA - priorityB;
      });
    return cats;
  }, [propsByCategory, pastCategories]);

  // Filter props based on selected category
  const filteredProps = useMemo(() => {
    if (activeCategory === "all") {
      return gameProps;
    }
    return propsByCategory[activeCategory] || {};
  }, [activeCategory, gameProps, propsByCategory]);

  if (Object.keys(gameProps).length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <div className="text-sm text-muted-foreground mb-2">
          No game props available yet.
        </div>
        <div className="text-xs text-muted-foreground/70">
          Game props typically become available 1-2 hours before game time.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 isolate">
      {/* Category Tabs - Sticky (positioned below Player/Game Props tabs) */}
      <div 
        className="sticky z-[15] bg-background/95 backdrop-blur-sm border-b border-border pb-2 -mx-6 px-6 md:-mx-8 md:px-8 xl:-mx-12 xl:px-12 pt-2"
        style={{ top: 'calc(4.5rem + env(safe-area-inset-top))' }}
      >
        <div 
          className="flex gap-1 overflow-x-auto scrollbar-hide min-w-0"
          data-mobile-scroll
          style={{ 
            overscrollBehaviorX: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x'
          }}
        >
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-md transition-colors",
              activeCategory === "all"
                ? "bg-muted text-foreground border-b-2 border-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-md transition-colors",
                activeCategory === category
                  ? "bg-muted text-foreground border-b-2 border-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Props List */}
      {Object.keys(filteredProps).length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No props match the selected category.
        </div>
      ) : activeCategory === "all" ? (
        <div className="space-y-3">
          {categories.map((category) => (
            <GamePropCategory
              key={category}
              category={{
                name: category,
                displayName: category,
                props: propsByCategory[category],
              }}
              game={game}
              defaultOpen={false}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <GamePropCategory
            category={{
              name: activeCategory,
              displayName: activeCategory,
              props: filteredProps,
            }}
            game={game}
            defaultOpen={true}
          />
        </div>
      )}
    </div>
  );
}
