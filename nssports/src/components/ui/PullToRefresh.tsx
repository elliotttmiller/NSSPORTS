"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

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
  console.log('[PullToRefresh] Component rendering, disabled:', disabled);
  
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Check if we're at the top of the document scroll
    const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    console.log('[PullToRefresh] Touch start - scrollTop:', scrollTop);
    if (scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = true;
      console.log('[PullToRefresh] Started dragging from:', touchStartY.current);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || disabled || isRefreshing) return;

    const touchY = e.touches[0].clientY;
    const pullDelta = touchY - touchStartY.current;

    console.log('[PullToRefresh] Touch move - pullDelta:', pullDelta);

    // Check scroll position
    const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    
    // Only activate pull when at very top and pulling down
    if (scrollTop <= 0 && pullDelta > 0) {
      console.log('[PullToRefresh] Activating pull refresh');
      // Only prevent default if we've pulled more than 10px to avoid blocking normal scrolling
      if (pullDelta > 10) {
        e.preventDefault();
      }
      
      // Apply resistance
      const resistance = 2.5;
      const distance = Math.min(pullDelta / resistance, maxPull);
      setPullDistance(distance);
      console.log('[PullToRefresh] Pull distance set to:', distance);
    } else {
      // Reset if user scrolls away from top
      if (isDragging.current && scrollTop > 5) {
        console.log('[PullToRefresh] Resetting - scrolled away from top');
        isDragging.current = false;
        setPullDistance(0);
      }
    }
  }, [disabled, isRefreshing, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current || disabled) return;
    
    isDragging.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh error:', error);
      } finally {
        // Animate out
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      // Quick bounce back
      setPullDistance(0);
    }
  }, [pullDistance, threshold, disabled, isRefreshing, onRefresh]);

  // Attach listeners to document body, not a container
  useEffect(() => {
    console.log('[PullToRefresh] Component mounted, attaching listeners');
    document.body.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.body.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.body.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.body.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      console.log('[PullToRefresh] Component unmounting, removing listeners');
      document.body.removeEventListener('touchstart', handleTouchStart);
      document.body.removeEventListener('touchmove', handleTouchMove);
      document.body.removeEventListener('touchend', handleTouchEnd);
      document.body.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const isOverThreshold = pullDistance >= threshold;
  const spinnerRotation = progress * 360;

  return (
    <>
      {/* Pull to Refresh Indicator - Fixed position, doesn't affect layout */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center justify-center transition-all pointer-events-none"
          style={{
            top: isRefreshing ? '60px' : `${Math.max(pullDistance - 20, 0)}px`,
            opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
            transition: isRefreshing ? 'top 0.3s ease-out, opacity 0.2s' : 'top 0.1s ease-out, opacity 0.1s',
          }}
        >
          <div
            className={cn(
              "relative flex items-center justify-center w-10 h-10 rounded-full shadow-lg",
              isRefreshing 
                ? "bg-primary" 
                : isOverThreshold
                ? "bg-primary scale-110"
                : "bg-primary/70"
            )}
            style={{
              transform: isRefreshing 
                ? undefined 
                : `rotate(${spinnerRotation}deg) scale(${isOverThreshold ? 1.1 : 1})`,
              transition: 'all 0.2s ease-out',
              animation: isRefreshing ? 'spin 1s linear infinite' : undefined,
            }}
          >
            <svg
              className="w-5 h-5 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>

          <div
            className={cn(
              "mt-2 text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm",
              isRefreshing ? "text-primary bg-primary/10" : "text-muted-foreground bg-background/80"
            )}
          >
            {isRefreshing 
              ? "Refreshing..." 
              : isOverThreshold 
              ? "Release to refresh" 
              : "Pull to refresh"}
          </div>
        </div>
      )}

      {/* Content - Render normally, no wrapper container */}
      {children}

      {/* CSS for spin animation */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
