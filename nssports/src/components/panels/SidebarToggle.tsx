"use client";

import { Button } from "@/components/ui";
import { useBetSlip } from "@/context";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";

interface SidebarToggleProps {
  side: "left" | "right";
  isOpen: boolean;
  onToggle: () => void;
}

export function SidebarToggle({ side, isOpen, onToggle }: SidebarToggleProps) {
  const { betSlip } = useBetSlip();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className="h-16 w-8 rounded-full shadow-lg border-2 relative"
      aria-label={`Toggle ${side} sidebar`}
    >
      {side === "left" ? (
        isOpen ? (
          <CaretLeft size={16} />
        ) : (
          <CaretRight size={16} />
        )
      ) : isOpen ? (
        <CaretRight size={16} />
      ) : (
        <CaretLeft size={16} />
      )}
      {betSlip.bets.length > 0 && (
        <span className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-bold shadow">
          {betSlip.bets.length}
        </span>
      )}
    </Button>
  );
}
