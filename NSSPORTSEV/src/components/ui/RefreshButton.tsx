"use client";

import { ArrowsClockwise } from "@phosphor-icons/react";
import { useState } from "react";

interface RefreshButtonProps {
  onRefresh: () => Promise<void> | void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Clean, subtle refresh button with smooth hover effects for desktop
 * - Soft hover state with color transition
 * - Spinning animation when loading
 * - Hidden on mobile (uses pull-to-refresh instead)
 */
export function RefreshButton({ onRefresh, isLoading = false, className = "" }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleClick = async () => {
    if (isRefreshing || isLoading) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Keep spinning for a moment to show completion
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const isSpinning = isRefreshing || isLoading;

  return (
    <button
      onClick={handleClick}
      disabled={isSpinning}
      className={`
        hidden md:flex
        items-center justify-center
        w-9 h-9
        rounded-lg
        bg-card/50
        border border-border/30
        text-muted-foreground
        hover:bg-accent/5
        hover:border-accent/30
        hover:text-accent
        active:scale-95
        disabled:opacity-50
        disabled:cursor-not-allowed
        transition-all duration-200
        shadow-sm hover:shadow-md
        ${className}
      `}
      aria-label="Refresh games"
      title="Refresh games"
    >
      <ArrowsClockwise
        size={18}
        weight="regular"
        className={`transition-transform duration-500 ${isSpinning ? 'animate-spin' : ''}`}
      />
    </button>
  );
}
