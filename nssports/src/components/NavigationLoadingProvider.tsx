"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoadingScreen } from "./LoadingScreen";
import { AnimatePresence } from "framer-motion";

/**
 * Global Navigation Loading Provider
 * Shows smooth loading transitions when navigating between pages
 * Ensures content doesn't render until fully ready
 */
export function NavigationLoadingProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // Show loading screen on navigation start
    setIsNavigating(true);
    setMinTimeElapsed(false);

    // Minimum display time to prevent flashing (500ms)
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 500);

    // Wait for page to be ready (simulates content loading)
    const readyTimer = setTimeout(() => {
      // Only hide loading when both conditions are met:
      // 1. Minimum time has elapsed (prevents flash)
      // 2. Content is ready
      if (minTimeElapsed) {
        setIsNavigating(false);
      }
    }, 800); // Adjust based on your data loading time

    // Check if minimum time elapsed, then hide loading
    const checkTimer = setInterval(() => {
      if (minTimeElapsed) {
        setIsNavigating(false);
        clearInterval(checkTimer);
      }
    }, 100);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(readyTimer);
      clearInterval(checkTimer);
    };
  }, [pathname, searchParams, minTimeElapsed]);

  return (
    <>
      <AnimatePresence mode="wait">
        {isNavigating && (
          <LoadingScreen 
            title="Loading page..." 
            subtitle="Preparing content" 
            showLogo={false}
          />
        )}
      </AnimatePresence>
      {!isNavigating && children}
    </>
  );
}
