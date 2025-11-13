"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

/**
 * Professional React Query Configuration
 * 
 * Environment-aware caching and polling strategy:
 * - Development: Conservative polling, aggressive caching (reduce API load)
 * - Production: Balanced polling for real-time updates
 * 
 * Rate Limit Protection:
 * - Development: 30 req/min (5s minimum between polls)
 * - Production: 250 req/min (sub-second updates possible)
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Calculate optimal stale time based on environment
 * Development: Longer stale times to reduce API pressure
 * Production: Shorter stale times for real-time feel
 */
const getDefaultStaleTime = () => {
  return isDevelopment 
    ? 60 * 1000  // 60s in dev (reduces API calls by 50%)
    : 30 * 1000; // 30s in prod (balanced real-time updates)
};

/**
 * Calculate garbage collection time
 * How long to keep unused data in cache
 */
const getDefaultGCTime = () => {
  return isDevelopment
    ? 10 * 60 * 1000  // 10 minutes in dev (better caching)
    : 5 * 60 * 1000;  // 5 minutes in prod
};

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: getDefaultStaleTime(),
            gcTime: getDefaultGCTime(),
            
            // Smart refetch strategy
            refetchOnWindowFocus: !isDevelopment, // Only in prod for real-time updates
            refetchOnReconnect: !isDevelopment,   // Only in prod
            refetchInterval: false,               // Disabled by default (enable per-query)
            refetchIntervalInBackground: false,   // Never poll in background by default
            
            // Retry strategy with exponential backoff
            retry: (failureCount, error) => {
              // Don't retry 4xx errors (client errors)
              if (error instanceof Error) {
                const status = (error as Error & { status?: number })?.status;
                if (status && status >= 400 && status < 500) {
                  return false;
                }
              }
              // Retry network errors up to 2 times
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) => {
              // Exponential backoff: 1s, 2s, 4s, max 10s
              return Math.min(1000 * 2 ** attemptIndex, 10000);
            },
            
            // Network mode - fail fast on no network
            networkMode: 'online',
          },
          mutations: {
            retry: 1,
            retryDelay: 1000,
            networkMode: 'online',
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

