"use client";

import { Button } from "./ui/button";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";

interface SidebarToggleProps {
  side: "left" | "right";
  isOpen: boolean;
  onToggle: () => void;
}

export function SidebarToggle({ side, isOpen, onToggle }: SidebarToggleProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className="h-16 w-8 rounded-full shadow-lg border-2"
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
    </Button>
  );
}
