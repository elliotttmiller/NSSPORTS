"use client";

import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * Root Loading UI
 * Official Next.js Pattern: Shown automatically during page transitions and Suspense boundaries
 * Provides smooth, animated loading experience across all routes
 * Reference: https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 */
export default function Loading() {
  return (
    <LoadingScreen 
      title="Loading NSSPORTSCLUB..." 
      subtitle="Preparing your experience"
      showLogo={true}
    />
  );
}
