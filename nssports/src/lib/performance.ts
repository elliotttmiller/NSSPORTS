/**
 * Performance Monitoring Utilities
 * 
 * Tools for tracking component render times and identifying bottlenecks
 * Only active in development mode for zero production impact
 */

import { useEffect, useRef } from 'react';
import { logger } from './logger';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Track component render performance
 * Logs render count and time in development mode
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   useRenderPerformance('MyComponent');
 *   return <div>Content</div>;
 * }
 * ```
 */
export function useRenderPerformance(componentName: string, logThreshold = 16) {
  const renderCount = useRef(0);
  const renderStart = useRef(0);

  if (isDev) {
    renderCount.current += 1;
    renderStart.current = performance.now();
  }

  useEffect(() => {
    if (!isDev) return;

    const renderTime = performance.now() - renderStart.current;
    
    // Only log if render takes longer than threshold (default 16ms = 60fps)
    if (renderTime > logThreshold) {
      logger.warn(`[Performance] ${componentName} render #${renderCount.current} took ${renderTime.toFixed(2)}ms`);
    } else if (renderCount.current % 10 === 0) {
      // Log every 10th render for normal performance
      logger.debug(`[Performance] ${componentName} render #${renderCount.current} took ${renderTime.toFixed(2)}ms`);
    }
  });
}

/**
 * Measure async operation performance
 * Returns wrapped function that logs execution time
 * 
 * Usage:
 * ```tsx
 * const fetchData = measureAsync('fetchGameData', async () => {
 *   return await api.getGames();
 * });
 * ```
 */
export function measureAsync<T>(
  operationName: string,
  fn: () => Promise<T>
): () => Promise<T> {
  if (!isDev) return fn;

  return async () => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      logger.debug(`[Performance] ${operationName} completed in ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error(`[Performance] ${operationName} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  };
}

/**
 * Mark performance checkpoints for complex operations
 * 
 * Usage:
 * ```tsx
 * const perf = startPerformanceTrace('DataProcessing');
 * // ... do work
 * perf.checkpoint('Filtered data');
 * // ... more work
 * perf.checkpoint('Sorted data');
 * perf.end();
 * ```
 */
export function startPerformanceTrace(traceName: string) {
  if (!isDev) {
    return {
      checkpoint: () => {},
      end: () => {},
    };
  }

  const start = performance.now();
  let lastCheckpoint = start;
  const checkpoints: { name: string; time: number; delta: number }[] = [];

  return {
    checkpoint(name: string) {
      const now = performance.now();
      const delta = now - lastCheckpoint;
      checkpoints.push({ name, time: now - start, delta });
      lastCheckpoint = now;
    },
    end() {
      const total = performance.now() - start;
      logger.debug(`[Performance Trace] ${traceName} - Total: ${total.toFixed(2)}ms`, {
        checkpoints: checkpoints.map(cp => ({
          name: cp.name,
          time: `${cp.time.toFixed(2)}ms`,
          delta: `${cp.delta.toFixed(2)}ms`,
        })),
      });
    },
  };
}

/**
 * Debounce function for performance optimization
 * Delays function execution until after wait time has elapsed
 * 
 * Usage:
 * ```tsx
 * const debouncedSearch = debounce((query) => {
 *   fetchResults(query);
 * }, 300);
 * ```
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 * Ensures function is called at most once per time period
 * 
 * Usage:
 * ```tsx
 * const throttledScroll = throttle((e) => {
 *   handleScroll(e);
 * }, 100);
 * ```
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Measure component mount/unmount lifecycle
 * Useful for tracking component lifecycle performance
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   useComponentLifecycle('MyComponent');
 *   return <div>Content</div>;
 * }
 * ```
 */
export function useComponentLifecycle(componentName: string) {
  useEffect(() => {
    if (!isDev) return;

    const mountTime = performance.now();
    logger.debug(`[Lifecycle] ${componentName} mounted at ${mountTime.toFixed(2)}ms`);

    return () => {
      const unmountTime = performance.now();
      const lifetime = unmountTime - mountTime;
      logger.debug(`[Lifecycle] ${componentName} unmounted after ${lifetime.toFixed(2)}ms`);
    };
  }, [componentName]);
}

/**
 * Export all performance utilities
 */
export const perf = {
  useRenderPerformance,
  measureAsync,
  startPerformanceTrace,
  debounce,
  throttle,
  useComponentLifecycle,
};
