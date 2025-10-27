"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { GamePropRow } from "./GamePropRow";
import { Game } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface GamePropCategoryProps {
  category: {
    name: string;
    displayName: string;
    props: Record<string, any[]>;
  };
  game: Game;
  defaultOpen?: boolean;
}

export function GamePropCategory({ category, game, defaultOpen = false }: GamePropCategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // Count total props across all prop types in this category
  const totalProps = Object.values(category.props).reduce(
    (sum, props) => sum + props.length, 
    0
  );

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
              {category.displayName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {totalProps} {totalProps === 1 ? 'market' : 'markets'} available
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
                data-mobile-scroll
                style={{ 
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y'
                }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <div className="space-y-2">
                  {Object.entries(category.props).map(([propType, props]) => (
                    <div key={propType} className="space-y-1">
                      {props.map((prop: any) => (
                        <GamePropRow key={prop.marketID} prop={prop} game={game} />
                      ))}
                    </div>
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
