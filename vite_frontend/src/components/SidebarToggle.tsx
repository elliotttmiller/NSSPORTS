import { motion, AnimatePresence } from "framer-motion";
import { CaretLeft, CaretRight, List } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBetSlip } from "@/context/BetSlipContext";
import { useNavigation } from "@/context/NavigationContext";
// ...existing code...

interface SidebarToggleProps {
  side: "left" | "right";
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function SidebarToggle({
  side,
  isOpen,
  onToggle,
  className,
}: SidebarToggleProps) {
  const isLeft = side === "left";
  const { betSlip } = useBetSlip();
  const { navigation } = useNavigation();
  const betCount = betSlip?.bets?.length || 0;
  // Only show badge on right toggle, when betslip is closed, and there are bets
  const showBetBadge = !isLeft && !navigation.isBetSlipOpen && betCount > 0;

  return (
    <motion.div
      className={cn(
        "fixed top-1/2 -translate-y-1/2 z-[99]",
        isLeft
          ? `transition-all duration-[350ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? "" : "left-2"}`
          : `transition-all duration-[350ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? "" : "right-2"}`,
        isLeft && isOpen && "left-[calc(var(--nav-panel-width,256px)+12px)]",
        !isLeft &&
          isOpen &&
          "right-[calc(var(--bet-slip-panel-width,340px)+60px)]",
        className,
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5 }}
    >
      <div className="relative">
        <Button
          variant="secondary"
          size="icon"
          onClick={onToggle}
          className={cn(
            "w-9 h-9 rounded-full shadow-lg border border-accent/70",
            "bg-card/80 hover:bg-accent/90 hover:border-accent/90",
            "transition-all duration-300 hover:scale-105 hover:shadow-xl",
            "opacity-95 hover:opacity-100",
            "backdrop-blur-md",
            "ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          style={{
            boxShadow: "0 2px 12px 0 rgba(0,0,0,0.13)",
            transition:
              "background 0.2s, border 0.2s, box-shadow 0.2s, opacity 0.2s, transform 0.2s",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isOpen ? "open" : "closed"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {isLeft ? (
                isOpen ? (
                  <CaretLeft size={18} />
                ) : (
                  <CaretRight size={18} />
                )
              ) : isOpen ? (
                <CaretRight size={18} />
              ) : (
                <CaretLeft size={18} />
              )}
            </motion.div>
          </AnimatePresence>
        </Button>
        {showBetBadge && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center bg-[color:var(--color-accent)] text-[color:var(--color-accent-contrast)] text-xs font-bold shadow-md border-2 border-white"
            style={{ zIndex: 2 }}
            data-testid="desktop-betslip-badge"
          >
            {betCount}
          </span>
        )}
      </div>
    </motion.div>
  );
}

interface MobileSidebarToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

export function MobileSidebarToggle({
  isActive,
  onToggle,
}: MobileSidebarToggleProps) {
  return (
    <motion.div
      className="fixed bottom-20 right-4 z-50 lg:hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Button
        variant={isActive ? "default" : "secondary"}
        size="icon"
        onClick={onToggle}
        className={cn(
          "w-12 h-12 rounded-full shadow-lg border border-border/50",
          "bg-card/90 backdrop-blur-sm transition-all duration-300",
          isActive && "bg-accent text-accent-foreground",
        )}
      >
        <List size={20} />
      </Button>
    </motion.div>
  );
}
