"use client";

import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * Games Loading UI
 * Official Next.js Pattern: Shown during page transitions
 * Reference: https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 */
export default function Loading() {
  return (
    <LoadingScreen 
      title="Loading games..." 
      subtitle="Fetching latest matchups and odds"
      showLogo={false}
    />
  );
}
