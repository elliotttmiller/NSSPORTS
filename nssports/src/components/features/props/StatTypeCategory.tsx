"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerPropRow } from "./PlayerPropRow";
import { Game } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface StatTypeCategoryProps {
  statType: {
    name: string;
    displayName: string;
    icon?: string;
    props: Array<{
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
  };
  game: Game;
  defaultOpen?: boolean;
}

// Stat type metadata with display names (no emoji icons)
const statTypeMetadata: Record<string, { displayName: string }> = {
  Points: { displayName: "Points" },
  Rebounds: { displayName: "Rebounds" },
  Assists: { displayName: "Assists" },
  Steals: { displayName: "Steals" },
  Blocks: { displayName: "Blocks" },
  "Three-Pointers Made": { displayName: "Three-Pointers Made" },
  "Receiving Yards": { displayName: "Receiving Yards" },
  Receptions: { displayName: "Receptions" },
  "Rushing Yards": { displayName: "Rushing Yards" },
  "Passing Yards": { displayName: "Passing Yards" },
  "Passing TDs": { displayName: "Passing TDs" },
  Touchdowns: { displayName: "Touchdowns" },
};

export function StatTypeCategory({ statType, game, defaultOpen = false }: StatTypeCategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const metadata = statTypeMetadata[statType.name] || {
    displayName: statType.name,
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3.5 transition-colors",
          "hover:bg-muted/50 active:bg-muted",
          isOpen && "bg-muted/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0"></div>
          <div className="text-left">
            <h3 className="text-sm md:text-base font-semibold text-foreground">
              {metadata.displayName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {statType.props.length} {statType.props.length === 1 ? 'player' : 'players'} available
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium hidden md:inline">
            {isOpen ? "Collapse" : "Expand"}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-muted/10 backdrop-blur-sm border-t border-border/30">
              <div 
                className="max-h-[300px] overflow-y-auto seamless-scroll px-2 md:px-4 py-3"
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                style={{ overscrollBehavior: 'contain' }}
              >
                <div className="space-y-1">
                  {statType.props.map((prop) => (
                    <PlayerPropRow key={prop.id} prop={prop} game={game} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
