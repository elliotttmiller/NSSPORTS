'use client';

import { useBetSlip } from "@/context";
import { Button } from "@/components/ui";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

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
      className="group h-14 w-7 rounded-full shadow-lg border-2 border-border relative text-foreground/90 transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)] bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 hover:shadow-xl hover:-translate-y-1.5 hover:scale-[1.08] active:scale-95 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
      aria-label={`Toggle ${side} sidebar`}
      aria-pressed={isOpen}
    >
      <span
        className={cn(
          "transition-transform duration-300 will-change-transform", 
          side === "left"
            ? isOpen
              ? "group-hover:-translate-x-0.5"
              : "group-hover:translate-x-0.5"
            : isOpen
              ? "group-hover:translate-x-0.5"
              : "group-hover:-translate-x-0.5"
        )}
      >
        {side === "left" ? (
          isOpen ? (
            <CaretLeft size={16} weight="bold" />
          ) : (
            <CaretRight size={16} weight="bold" />
          )
        ) : isOpen ? (
          <CaretRight size={16} weight="bold" />
        ) : (
          <CaretLeft size={16} weight="bold" />
        )}
      </span>
      {side === "right" && betSlip.bets.length > 0 && (
        <span className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-bold shadow">
          {betSlip.bets.length}
        </span>
      )}
    </Button>
  );
}
