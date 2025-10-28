"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useMobileScroll } from "@/context";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number;
  maxPull?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  maxPull = 120,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const wasAtTopOnStart = useRef(false);
  const { scrollContainerRef, isAtTop: contextIsAtTop } = useMobileScroll();

  const isAtTop = useCallback(() => {
    // Use context's isAtTop which checks the unified scroll container
    return contextIsAtTop();
  }, [contextIsAtTop]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) {
      wasAtTopOnStart.current = false;
      return;
    }
    
    // Record if we're at top when touch starts
    const atTop = isAtTop();
    wasAtTopOnStart.current = atTop;
    
    // Only initialize if we're at the absolute top
    if (atTop) {
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  }, [disabled, isRefreshing, isAtTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || disabled || isRefreshing || !wasAtTopOnStart.current) {
      return;
    }

    const container = scrollContainerRef.current;
    // Fallback to checking if we can get scroll position
    if (!container) {
      isDragging.current = false;
      wasAtTopOnStart.current = false;
      setPullDistance(0);
      return;
    }
    
    const currentScrollTop = container.scrollTop || 0;
    
    // If user has scrolled down AT ALL from start, cancel completely
    if (currentScrollTop > 0) {
      isDragging.current = false;
      wasAtTopOnStart.current = false;
      setPullDistance(0);
      return;
    }

    const touchY = e.touches[0].clientY;
    const pullDelta = touchY - touchStartY.current;

    // Only activate if:
    // 1. Was at top when started
    // 2. Still at exact top (scrollTop === 0)
    // 3. Pulling DOWN (positive delta)
    // 4. Pull is significant (> 15px threshold to avoid sensitive triggers)
    if (wasAtTopOnStart.current && currentScrollTop === 0 && pullDelta > 15) {
      // Prevent default to stop scroll bouncing
      e.preventDefault();
      
      // Apply resistance curve for smooth feel
      const resistance = 3.0; // Higher resistance for less sensitivity
      const distance = Math.min(pullDelta / resistance, maxPull);
      setPullDistance(distance);
    } else if (pullDelta < 0) {
      // User is scrolling up, not pulling down - cancel immediately
      isDragging.current = false;
      wasAtTopOnStart.current = false;
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, maxPull, scrollContainerRef]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current || disabled || !wasAtTopOnStart.current) {
      isDragging.current = false;
      wasAtTopOnStart.current = false;
      setPullDistance(0);
      return;
    }
    
    isDragging.current = false;
    const wasAtTop = wasAtTopOnStart.current;
    wasAtTopOnStart.current = false;

    // Trigger refresh if pulled past threshold AND still at top
    if (pullDistance >= threshold && !isRefreshing && wasAtTop && isAtTop()) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        // Smooth animation out
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 400);
      }
    } else {
      // Quick bounce back animation
      setPullDistance(0);
    }
  }, [pullDistance, threshold, disabled, isRefreshing, onRefresh, isAtTop]);

  // Attach listeners to document
  useEffect(() => {
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
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const isOverThreshold = pullDistance >= threshold;
  const spinnerRotation = progress * 360;
  const opacity = Math.min(pullDistance / 20, 1); // Fade in gradually

  return (
    <>
      {/* Pull to Refresh Indicator - Fixed position, smooth animations */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center justify-center pointer-events-none"
          style={{
            top: isRefreshing ? '80px' : `${Math.max(pullDistance + 20, 20)}px`,
            opacity: isRefreshing ? 1 : opacity,
            transition: isRefreshing 
              ? 'top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out' 
              : 'none',
          }}
        >
          {/* Spinner Circle */}
          <div
            className={cn(
              "relative flex items-center justify-center rounded-full shadow-lg backdrop-blur-md",
              "transition-all duration-300 ease-out",
              isRefreshing 
                ? "w-12 h-12 bg-primary/95" 
                : isOverThreshold
                ? "w-12 h-12 bg-primary/90"
                : "w-10 h-10 bg-primary/70"
            )}
            style={{
              transform: isRefreshing 
                ? 'scale(1)' 
                : `rotate(${spinnerRotation}deg) scale(${isOverThreshold ? 1.15 : 1})`,
              animation: isRefreshing ? 'spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite' : undefined,
            }}
          >
            <svg
              className={cn(
                "text-primary-foreground transition-all duration-200",
                isRefreshing ? "w-6 h-6" : isOverThreshold ? "w-5 h-5" : "w-4 h-4"
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
              "mt-3 text-xs font-semibold px-4 py-1.5 rounded-full backdrop-blur-md shadow-sm",
              "transition-all duration-300 ease-out",
              isRefreshing 
                ? "text-primary bg-primary/15 scale-100" 
                : isOverThreshold
                ? "text-primary bg-primary/15 scale-105"
                : "text-muted-foreground bg-background/70 scale-95"
            )}
            style={{
              opacity: pullDistance > 15 || isRefreshing ? 1 : pullDistance / 15,
            }}
          >
            {isRefreshing 
              ? "Refreshing..." 
              : isOverThreshold 
              ? "Release to refresh" 
              : "Pull down to refresh"}
          </div>
        </div>
      )}

      {/* Content - No wrapper interference */}
      {children}

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
