"use client";

import { useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMobileScroll, useRefresh } from "@/context";
import { useIsMobile } from "@/hooks";

interface GlobalPullToRefreshProps {
  children: ReactNode;
}

/**
 * Global Pull-to-Refresh Component
 * 
 * Features:
 * - Seamlessly integrated inside scroll container for natural feel
 * - Content wrapper transforms down to reveal indicator above
 * - Smooth, physics-based pull interaction like Instagram/Twitter
 * - Works only on mobile devices at the top of scroll
 * - Professional PWA-style refresh experience
 */
export function GlobalPullToRefresh({ children }: GlobalPullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const { scrollContainerRef } = useMobileScroll();
  const { triggerRefresh } = useRefresh();
  const isMobile = useIsMobile();

  const threshold = 80; // Pull distance needed to trigger refresh
  const maxPull = 140; // Maximum pull distance

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing || !isMobile) return;
    
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Only initiate if at the very top
    if (container.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  }, [isRefreshing, scrollContainerRef, isMobile]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || isRefreshing || !isMobile) return;

    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Must still be at top
    if (container.scrollTop > 0) {
      isDragging.current = false;
      setPullDistance(0);
      return;
    }

    const touchY = e.touches[0].clientY;
    const pullDelta = touchY - touchStartY.current;

    // Only activate if pulling DOWN
    if (pullDelta > 5) {
      // Prevent default scrolling when pulling down from top
      e.preventDefault();
      
      // Apply resistance curve for natural feel (less resistance = more natural)
      const resistance = 2.5;
      const distance = Math.min(pullDelta / resistance, maxPull);
      setPullDistance(distance);
    } else if (pullDelta < -5) {
      // User is scrolling up
      isDragging.current = false;
      setPullDistance(0);
    }
  }, [isRefreshing, maxPull, scrollContainerRef, isMobile]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current || !isMobile) {
      isDragging.current = false;
      setPullDistance(0);
      return;
    }
    
    isDragging.current = false;

    // Trigger refresh if pulled past threshold
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Lock at threshold during refresh
      
      try {
        await triggerRefresh();
      } catch (error) {
        console.error('[PullToRefresh] Refresh failed:', error);
      } finally {
        // Smooth animation out
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      // Quick bounce back
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, triggerRefresh, isMobile]);

  // Attach listeners to scroll container
  useEffect(() => {
    if (!isMobile) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const options: AddEventListenerOptions = { passive: false };
    const passiveOptions: AddEventListenerOptions = { passive: true };
    
    container.addEventListener('touchstart', handleTouchStart, passiveOptions);
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd, passiveOptions);
    container.addEventListener('touchcancel', handleTouchEnd, passiveOptions);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, scrollContainerRef, isMobile]);

  // Don't render on desktop
  if (!isMobile) return <>{children}</>;

  const progress = Math.min(pullDistance / threshold, 1);
  const isOverThreshold = pullDistance >= threshold;
  const spinnerRotation = progress * 360;

  // Wrap content with pull transformation
  return (
    <div 
      className="relative min-h-full pb-4"
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: isRefreshing || pullDistance === 0
          ? 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          : 'none',
      }}
    >
      {/* Pull-to-Refresh Indicator - Positioned above visible area */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center justify-center pointer-events-none"
        style={{
          top: `-70px`, // Hidden above visible area
          height: '70px',
          opacity: Math.min(pullDistance / 30, 1),
        }}
      >
        {/* Spinner Circle */}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full shadow-lg backdrop-blur-md border-2",
            "transition-all duration-200 ease-out",
            isRefreshing 
              ? "w-11 h-11 bg-accent/95 border-accent/60" 
              : isOverThreshold
              ? "w-11 h-11 bg-accent/90 border-accent/70 scale-105"
              : "w-9 h-9 bg-accent/80 border-accent/50"
          )}
          style={{
            transform: isRefreshing 
              ? 'scale(1) rotate(0deg)' 
              : `rotate(${spinnerRotation}deg) scale(${isOverThreshold ? 1.05 : 1})`,
            animation: isRefreshing ? 'spin 1s linear infinite' : undefined,
          }}
        >
          <svg
            className={cn(
              "text-accent-foreground transition-all duration-200",
              isRefreshing ? "w-5 h-5" : isOverThreshold ? "w-5 h-5" : "w-4 h-4"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>

        {/* Status Text */}
        {pullDistance > 20 && (
          <div
            className={cn(
              "mt-2 text-[10px] font-semibold px-3 py-1 rounded-full backdrop-blur-md shadow-md border",
              "transition-all duration-200 ease-out",
              isRefreshing 
                ? "text-accent bg-accent/20 border-accent/30" 
                : isOverThreshold
                ? "text-accent bg-accent/20 border-accent/30"
                : "text-muted-foreground bg-background/80 border-border/50"
            )}
            style={{
              opacity: Math.min((pullDistance - 20) / 20, 1),
            }}
          >
            {isRefreshing 
              ? "Refreshing..." 
              : isOverThreshold 
              ? "Release to refresh" 
              : "Pull down"}
          </div>
        )}
      </div>

      {/* Page Content */}
      {children}

      {/* Smooth spin animation */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
