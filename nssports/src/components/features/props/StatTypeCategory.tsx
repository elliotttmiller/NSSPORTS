"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerPropRow } from "./PlayerPropRow";
import { Game } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { formatStatType } from "@/lib/formatStatType";

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

export function StatTypeCategory({ statType, game, defaultOpen = false }: StatTypeCategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // Use the formatStatType utility for consistent naming across all sports
  const displayName = formatStatType(statType.name);

  return (
    <div className="relative z-0 border border-border rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm transition-shadow duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3.5 transition-colors",
          "hover:bg-muted/30 active:bg-muted",
          isOpen && "bg-muted/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent shrink-0"></div>
          <div className="text-left">
            <h3 className="text-sm md:text-base font-semibold text-foreground">
              {displayName}
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
              <div className="space-y-1 px-2 md:px-4 py-3">
                {statType.props.map((prop) => (
                  <PlayerPropRow key={prop.id} prop={prop} game={game} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
