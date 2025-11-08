"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { useNavigation } from "@/context";
import { useIsMobile } from "@/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * MobileOtherPanel - Right-side panel for additional bet types
 * 
 * Displays advanced betting options that will be implemented:
 * - Bet It All
 * - Teaser
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
  const router = useRouter();

  const isOpen = mobilePanel === "other";

  const handleClose = () => {
    setMobilePanel(null);
  };

  // Bet type categories - to be implemented one by one
  const betTypes = [
    { 
      id: "bet-it-all", 
      name: "Bet It All", 
      description: "Wager all winnings on next bet"
    },
    { 
      id: "teaser", 
      name: "Teaser", 
      description: "Adjust spreads in your favor"
    },
    { 
      id: "round-robin", 
      name: "Round Robin", 
      description: "Multiple parlay combinations"
    },
    { 
      id: "if-win-only", 
      name: "If Win Only", 
      description: "Conditional bet on win"
    },
    { 
      id: "if-win-or-tie", 
      name: "If Win or Tie", 
      description: "Conditional bet on win/tie"
    },
    { 
      id: "win-reverse", 
      name: "Win Reverse", 
      description: "Reverse action on win"
    },
    { 
      id: "action-reverse", 
      name: "Action Reverse", 
      description: "Reverse action regardless"
    },
    { 
      id: "fill-open", 
      name: "Fill Open", 
      description: "Fill remaining positions"
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
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-98"
            onClick={handleClose}
          />

          {/* Panel - Opens from RIGHT side */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-[280px] bg-background border-l border-border z-99 flex flex-col"
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
                      handleClose();
                      // Route to the appropriate page based on bet type
                      if (betType.id === "teaser") {
                        router.push("/teasers");
                      } else if (betType.id === "round-robin") {
                        router.push("/round-robin");
                      } else if (betType.id === "if-win-only" || betType.id === "if-win-or-tie") {
                        router.push("/if-bets");
                      } else if (betType.id === "win-reverse" || betType.id === "action-reverse") {
                        router.push("/reverse-bets");
                      } else if (betType.id === "bet-it-all") {
                        router.push("/bet-it-all");
                      } else if (betType.id === "fill-open") {
                        // Fill Open not yet implemented
                        toast.info(`${betType.name} coming soon!`, {
                          description: "This bet type is under development",
                          duration: 3000,
                        });
                      }
                    }}
                    className="w-full text-left p-3 rounded-lg border border-border bg-card hover:bg-accent/5 hover:border-accent/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm block">{betType.name}</span>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">
                          {betType.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
