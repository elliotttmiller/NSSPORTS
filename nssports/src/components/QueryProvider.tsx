"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

/**
 * Enhanced React Query provider with optimized defaults for the sports betting app
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Bet history and game data can be considered stale after 30 seconds
            staleTime: 30 * 1000,
            // Keep data in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Refetch on window focus for live games
            refetchOnWindowFocus: true,
            // Retry failed requests
            retry: 1,
            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Retry mutations once
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

