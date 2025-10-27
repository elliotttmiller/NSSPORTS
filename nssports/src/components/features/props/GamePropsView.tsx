"use client";

import { useState, useMemo } from "react";
import { Game } from "@/types";
import { GamePropsMap } from "@/hooks/useGameProps";
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
  "Other Props": 99,
};

export function GamePropsView({ game, gameProps }: GamePropsViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Group props by market category
  const propsByCategory = useMemo(() => {
    const grouped: Record<string, typeof gameProps> = {};
    
    Object.entries(gameProps).forEach(([propType, props]) => {
      props.forEach((prop: any) => {
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

  // Get sorted categories
  const categories = useMemo(() => {
    const cats = Object.keys(propsByCategory).sort((a, b) => {
      const priorityA = categoryPriority[a] || 999;
      const priorityB = categoryPriority[b] || 999;
      return priorityA - priorityB;
    });
    return cats;
  }, [propsByCategory]);

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
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="border-b border-border">
        <div 
          className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide"
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
          {categories.map((category, index) => (
            <GamePropCategory
              key={category}
              category={{
                name: category,
                displayName: category,
                props: propsByCategory[category],
              }}
              game={game}
              defaultOpen={index === 0}
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
