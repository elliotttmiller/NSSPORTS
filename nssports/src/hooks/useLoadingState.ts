"use client";

import { useEffect, useState } from "react";

/**
 * Hook for managing loading states with proper waiting functions
 * Ensures minimum display time to prevent flashing
 * Waits for data to be ready before hiding loading state
 */
export function useLoadingState(
  isDataLoading: boolean,
  minDisplayTime: number = 500
) {
  const [showLoading, setShowLoading] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // Reset state when data loading starts
    if (isDataLoading) {
      setShowLoading(true);
      setMinTimeElapsed(false);

      // Start minimum time timer
      const timer = setTimeout(() => {
        setMinTimeElapsed(true);
      }, minDisplayTime);

      return () => clearTimeout(timer);
    }
  }, [isDataLoading, minDisplayTime]);

  useEffect(() => {
    // Hide loading only when BOTH conditions are met:
    // 1. Data is loaded (!isDataLoading)
    // 2. Minimum time has elapsed (minTimeElapsed)
    if (!isDataLoading && minTimeElapsed) {
      // Small additional delay for smooth transition
      const transitionTimer = setTimeout(() => {
        setShowLoading(false);
      }, 150);

      return () => clearTimeout(transitionTimer);
    }
  }, [isDataLoading, minTimeElapsed]);

  return showLoading;
}

/**
 * Hook for handling async data fetching with proper loading states
 * Ensures smooth transitions and prevents premature rendering
 */
export function useReadyState<T>(
  fetchFn: () => Promise<T>,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setIsReady(false);

    const fetchData = async () => {
      try {
        const result = await fetchFn();
        
        if (mounted) {
          setData(result);
          setError(null);
          
          // Mark as ready after data is successfully loaded
          // Add small delay to ensure smooth transition
          setTimeout(() => {
            if (mounted) {
              setIsReady(true);
              setIsLoading(false);
            }
          }, 200);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setIsLoading(false);
          setIsReady(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, isLoading, error, isReady };
}
