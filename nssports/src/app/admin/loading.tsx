"use client";

import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * Admin Dashboard Loading UI
 * Official Next.js Pattern: Shown during page transitions and Suspense boundaries
 * Provides smooth, animated loading experience for admin routes
 * Reference: https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 */
export default function AdminLoading() {
  return (
    <LoadingScreen 
      title="Loading Admin Dashboard..." 
      subtitle="Preparing admin interface"
      showLogo={true}
    />
  );
}
