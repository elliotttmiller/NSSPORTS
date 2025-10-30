"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Lightning } from "@phosphor-icons/react";
import { useNavigation } from "@/context";
import { useIsMobile } from "@/hooks";

/**
 * MobileOtherPanel - Right-side panel for additional bet types
 * 
 * Displays advanced betting options that will be implemented:
 * - Bet It All
 * - Teaser (already implemented, shown here for easy access)
 * - Round Robin
 * - If Win Only
 * - If Win or Tie
 * - Win Reverse
 * - Action Reverse
 * - Fill Open
 */
export function MobileOtherPanel() {
  const { mobilePanel, setMobilePanel } = useNavigation();
  const isMobile = useIsMobile();

  const isOpen = mobilePanel === "other";

  const handleClose = () => {
    setMobilePanel(null);
  };

  // Bet type categories - to be implemented one by one
  const betTypes = [
    { 
      id: "bet-it-all", 
      name: "Bet It All", 
      description: "Wager all winnings on next bet",
      implemented: false 
    },
    { 
      id: "teaser", 
      name: "Teaser", 
      description: "Adjust spreads in your favor",
      implemented: true 
    },
    { 
      id: "round-robin", 
      name: "Round Robin", 
      description: "Multiple parlay combinations",
      implemented: false 
    },
    { 
      id: "if-win-only", 
      name: "If Win Only", 
      description: "Conditional bet on win",
      implemented: false 
    },
    { 
      id: "if-win-or-tie", 
      name: "If Win or Tie", 
      description: "Conditional bet on win/tie",
      implemented: false 
    },
    { 
      id: "win-reverse", 
      name: "Win Reverse", 
      description: "Reverse action on win",
      implemented: false 
    },
    { 
      id: "action-reverse", 
      name: "Action Reverse", 
      description: "Reverse action regardless",
      implemented: false 
    },
    { 
      id: "fill-open", 
      name: "Fill Open", 
      description: "Fill remaining positions",
      implemented: false 
    },
  ];

  if (!isMobile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", duration: 0.35, stiffness: 160, damping: 28, mass: 0.7 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[98]"
            onClick={handleClose}
          />

          {/* Panel - Opens from RIGHT side */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-[280px] bg-background border-l border-border z-[99] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Other Bet Types</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-accent/10 rounded-md transition-colors"
                aria-label="Close other panel"
                title="Close other panel"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-2">
                {betTypes.map((betType) => (
                  <button
                    key={betType.id}
                    onClick={() => {
                      if (betType.implemented) {
                        // For implemented types (like Teaser), could navigate or trigger action
                        handleClose();
                      } else {
                        // For not yet implemented
                        // Just close for now, will be wired up later
                        handleClose();
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      betType.implemented
                        ? "border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent/50"
                        : "border-border bg-card hover:bg-accent/5 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{betType.name}</span>
                          {betType.implemented && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-accent/20 text-accent text-[10px] rounded-md">
                              <Lightning size={10} weight="fill" />
                              Active
                            </span>
                          )}
                          {!betType.implemented && (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-md">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">
                          {betType.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Info Section */}
              <div className="p-4 border-t border-border mt-4">
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-2">About These Bet Types</p>
                  <p className="leading-relaxed">
                    Advanced betting options provide more ways to structure your wagers. 
                    Each type will be implemented and integrated professionally with full validation and industry-standard rules.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
