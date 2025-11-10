"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useMobileScroll, useRefresh } from "@/context";
import { useIsMobile } from "@/hooks";

/**
 * Global Pull-to-Refresh Component
 * 
 * Features:
 * - Automatically hooks into the global refresh context
 * - Smooth, natural pull interaction with physics-based resistance
 * - Works only on mobile devices
 * - Requires being at the absolute top of the scroll container
 * - Beautiful animated indicator with progress feedback
 * - Prevents conflicts with page scrolling
 */
export function GlobalPullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const wasAtTopOnStart = useRef(false);
  const { scrollContainerRef, isAtTop: contextIsAtTop } = useMobileScroll();
  const { triggerRefresh } = useRefresh();
  const isMobile = useIsMobile();

  const threshold = 80; // Pull distance needed to trigger refresh
  const maxPull = 140; // Maximum pull distance

  const isAtTop = useCallback(() => {
    return contextIsAtTop();
  }, [contextIsAtTop]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing || !isMobile) {
      wasAtTopOnStart.current = false;
      return;
    }
    
    const atTop = isAtTop();
    wasAtTopOnStart.current = atTop;
    
    if (atTop) {
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  }, [isRefreshing, isAtTop, isMobile]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || isRefreshing || !wasAtTopOnStart.current || !isMobile) {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) {
      isDragging.current = false;
      wasAtTopOnStart.current = false;
      setPullDistance(0);
      return;
    }
    
    const currentScrollTop = container.scrollTop || 0;
    
    // If user has scrolled down at all, cancel
    if (currentScrollTop > 0) {
      isDragging.current = false;
      wasAtTopOnStart.current = false;
      setPullDistance(0);
      return;
    }

    const touchY = e.touches[0].clientY;
    const pullDelta = touchY - touchStartY.current;

    // Only activate if pulling DOWN and past minimum threshold
    if (wasAtTopOnStart.current && currentScrollTop === 0 && pullDelta > 10) {
      // Prevent default to stop scroll bouncing
      e.preventDefault();
      
      // Apply resistance curve for smooth, natural feel
      const resistance = 2.5;
      const distance = Math.min(pullDelta / resistance, maxPull);
      setPullDistance(distance);
    } else if (pullDelta < 0) {
      // User is scrolling up, cancel
      isDragging.current = false;
      wasAtTopOnStart.current = false;
      setPullDistance(0);
    }
  }, [isRefreshing, maxPull, scrollContainerRef, isMobile]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current || !wasAtTopOnStart.current || !isMobile) {
      isDragging.current = false;
      wasAtTopOnStart.current = false;
      setPullDistance(0);
      return;
    }
    
    isDragging.current = false;
    const wasAtTop = wasAtTopOnStart.current;
    wasAtTopOnStart.current = false;

    // Trigger refresh if pulled past threshold
    if (pullDistance >= threshold && !isRefreshing && wasAtTop && isAtTop()) {
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
        }, 600);
      }
    } else {
      // Quick bounce back animation
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, triggerRefresh, isAtTop, isMobile]);

  // Attach listeners to document
  useEffect(() => {
    if (!isMobile) return;

    const options: AddEventListenerOptions = { passive: false };
    const passiveOptions: AddEventListenerOptions = { passive: true };
    
    document.addEventListener('touchstart', handleTouchStart, passiveOptions);
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd, passiveOptions);
    document.addEventListener('touchcancel', handleTouchEnd, passiveOptions);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isMobile]);

  // Don't render on desktop
  if (!isMobile) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const isOverThreshold = pullDistance >= threshold;
  const spinnerRotation = progress * 360;
  const opacity = Math.min(pullDistance / 20, 1);

  // Only show indicator if there's pull distance or refreshing
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <>
      {/* Pull to Refresh Indicator - Fixed position */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-9999 flex flex-col items-center justify-center pointer-events-none"
        style={{
          top: isRefreshing ? '100px' : `${Math.max(pullDistance + 40, 40)}px`,
          opacity: isRefreshing ? 1 : opacity,
          transition: isRefreshing 
            ? 'top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out' 
            : 'opacity 0.2s ease-out',
        }}
      >
        {/* Spinner Circle */}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full shadow-2xl backdrop-blur-lg border-2",
            "transition-all duration-300 ease-out",
            isRefreshing 
              ? "w-14 h-14 bg-primary/95 border-primary/50" 
              : isOverThreshold
              ? "w-14 h-14 bg-primary/90 border-primary/60 scale-110"
              : "w-11 h-11 bg-primary/75 border-primary/40"
          )}
          style={{
            transform: isRefreshing 
              ? 'scale(1) rotate(0deg)' 
              : `rotate(${spinnerRotation}deg) scale(${isOverThreshold ? 1.1 : 1})`,
            animation: isRefreshing ? 'spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite' : undefined,
          }}
        >
          <svg
            className={cn(
              "text-primary-foreground transition-all duration-200",
              isRefreshing ? "w-7 h-7" : isOverThreshold ? "w-6 h-6" : "w-5 h-5"
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
        <div
          className={cn(
            "mt-3 text-xs font-bold px-4 py-2 rounded-full backdrop-blur-lg shadow-lg border",
            "transition-all duration-300 ease-out",
            isRefreshing 
              ? "text-primary bg-primary/20 border-primary/30 scale-100" 
              : isOverThreshold
              ? "text-primary bg-primary/20 border-primary/30 scale-105"
              : "text-muted-foreground bg-background/80 border-border/50 scale-95"
          )}
          style={{
            opacity: pullDistance > 15 || isRefreshing ? 1 : pullDistance / 15,
          }}
        >
          {isRefreshing 
            ? "Refreshing odds..." 
            : isOverThreshold 
            ? "Release to refresh" 
            : "Pull down"}
        </div>
      </div>

      {/* Smooth spin animation */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
