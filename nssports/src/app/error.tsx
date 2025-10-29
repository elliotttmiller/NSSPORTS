"use client";

/**
 * Root Error Boundary
 * Official Next.js Pattern: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-lg text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-6">
          We&apos;re sorry, but something unexpected happened. Please try refreshing
          the page.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
