"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerPropRow } from "./PlayerPropRow";
import { Game } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface PropCategoryProps {
  category: {
    name: string;
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

export function PropCategory({ category, game, defaultOpen = false }: PropCategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Group props by stat type within this category
  const propsByStatType = category.props.reduce((acc, prop) => {
    if (!acc[prop.statType]) {
      acc[prop.statType] = [];
    }
    acc[prop.statType].push(prop);
    return acc;
  }, {} as Record<string, typeof category.props>);

  const statTypes = Object.keys(propsByStatType);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 transition-colors",
          "hover:bg-muted/50 active:bg-muted",
          isOpen && "bg-muted/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0"></div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-foreground">
              {category.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {category.props.length} props available
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
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
                className="max-h-[400px] overflow-y-auto seamless-scroll px-4 py-3"
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                style={{ overscrollBehavior: 'contain' }}
              >
                {statTypes.map((statType, idx) => (
                  <div
                    key={statType}
                    className={cn(
                      "space-y-1",
                      idx > 0 && "mt-6 pt-6 border-t border-border/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {statType}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {propsByStatType[statType].length} {propsByStatType[statType].length === 1 ? 'player' : 'players'}
                      </span>
                    </div>
                    {propsByStatType[statType].map((prop) => (
                      <PlayerPropRow key={prop.id} prop={prop} game={game} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
