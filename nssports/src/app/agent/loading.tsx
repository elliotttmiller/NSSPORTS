"use client";

import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * Agent Dashboard Loading UI
 * Official Next.js Pattern: Shown during page transitions and Suspense boundaries
 * Provides smooth, animated loading experience for agent routes
 * Reference: https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 */
export default function AgentLoading() {
  return (
    <LoadingScreen 
      title="Loading Agent Dashboard..." 
      subtitle="Preparing your dashboard"
      showLogo={true}
    />
  );
}
