"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue } from "framer-motion";
import { Receipt } from "@phosphor-icons/react";
import { useKV } from "@/hooks/useKV";
import { useBetSlip, useNavigation } from "@/context";
import { useIsMobile } from "@/hooks";
import { cn } from "@/lib/utils";

interface Position {
  x: number;
  y: number;
}

export function FloatingBetSlipButton() {
  const { betSlip } = useBetSlip();
  const { isBetSlipOpen, setIsBetSlipOpen } = useNavigation();
  const isMobile = useIsMobile();
  const [savedPosition, setSavedPosition] = useKV<Position>(
    "bet-slip-button-position",
    { x: 0, y: 0 }
  );

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const hasMoved = useRef(false);
  const initialPosition = useRef({ x: 0, y: 0 });
  const dragStartTime = useRef(0);

  const getDefaultPosition = useCallback(() => {
    const margin = 16;
    const buttonSize = 48;
    const safeHeight = window.innerHeight - 80; // Account for bottom nav
    return {
      x: window.innerWidth - buttonSize - margin,
      y: safeHeight - buttonSize - margin,
    };
  }, []);

  // Initialize position
  useEffect(() => {
    if (typeof window === "undefined") return;

    const defaultPos = getDefaultPosition();

    // Use saved position or default
    const initPos =
      savedPosition && savedPosition.x !== 0 && savedPosition.y !== 0
        ? savedPosition
        : defaultPos;

    x.set(initPos.x);
    y.set(initPos.y);

    setIsInitialized(true);
  }, [savedPosition, getDefaultPosition, x, y]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const currentX = x.get();
      const currentY = y.get();
      const buttonSize = 48;
      const margin = 16;
      const maxX = window.innerWidth - buttonSize - margin;
      const maxY = window.innerHeight - buttonSize - margin - 80;

      // Keep button within bounds
      if (currentX > maxX) x.set(maxX);
      if (currentY > maxY) y.set(maxY);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [x, y]);

  const handleDragStart = () => {
    setIsDragging(true);
    dragStartTime.current = Date.now();
    hasMoved.current = false;
    initialPosition.current = { x: x.get(), y: y.get() };
  };

  const handleDrag = () => {
    const currentX = x.get();
    const currentY = y.get();

    const buttonSize = 48;
    const margin = 16;
    const maxX = window.innerWidth - buttonSize - margin;
    const maxY = window.innerHeight - buttonSize - margin - 80;

    // Constrain to viewport bounds
    if (currentX < margin) x.set(margin);
    if (currentX > maxX) x.set(maxX);
    if (currentY < margin) y.set(margin);
    if (currentY > maxY) y.set(maxY);

    // Track if user has moved significantly
    const deltaX = Math.abs(currentX - initialPosition.current.x);
    const deltaY = Math.abs(currentY - initialPosition.current.y);
    if (deltaX > 5 || deltaY > 5) {
      hasMoved.current = true;
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);

    // Save position
    const finalPos = { x: x.get(), y: y.get() };
    setSavedPosition(finalPos);
  };

  if (!isInitialized || !isMobile) return null;

  return (
    <motion.div
      className="fixed z-50"
      style={{
        x,
        y,
        touchAction: "none",
        width: "min(56px, 15vw)",
        height: "min(56px, 15vw)",
        minWidth: 44,
        minHeight: 44,
        maxWidth: 72,
        maxHeight: 72,
        boxSizing: "border-box",
        padding: 0,
        WebkitTapHighlightColor: "transparent",
      }}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      whileHover={!isDragging ? { scale: 1.05 } : {}}
      whileTap={!isDragging ? { scale: 0.95 } : {}}
      onTap={() => {
        if (!hasMoved.current) {
          setIsBetSlipOpen(!isBetSlipOpen);
        }
      }}
      data-testid="floating-betslip-btn"
      aria-label={isBetSlipOpen ? "Close bet slip" : "Open bet slip"}
    >
      <div
        className={cn(
          "relative w-full h-full rounded-full flex items-center justify-center",
          "shadow-lg transition-colors duration-200",
          "cursor-pointer select-none border-2",
          "touch-none",
          isDragging && "cursor-grabbing scale-105",
          isBetSlipOpen
            ? "bg-accent/90 border-accent"
            : "bg-background border-border hover:bg-accent hover:border-accent"
        )}
        style={{
          WebkitTapHighlightColor: "transparent",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      >
        <Receipt
          className="w-6 h-6 text-accent-foreground"
          weight={isBetSlipOpen ? "fill" : "regular"}
        />
        {betSlip.bets.length > 0 && (
          <div
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center bg-accent text-accent-foreground text-xs font-medium shadow-lg border-2 border-card"
            style={{ zIndex: 100 }}
          >
            {betSlip.bets.length}
          </div>
        )}
      </div>
    {/* End of FloatingBetSlipButton content */}
    </motion.div>
  )
}
