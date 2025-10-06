"use client";

/**
 * Live Games Error Boundary
 * Official Next.js Pattern: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold text-destructive mb-4">
          Failed to load live games
        </h2>
        <p className="text-muted-foreground mb-6">
          {error.message || "An error occurred while loading live games."}
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
