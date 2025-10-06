/**
 * Root Loading UI
 * Official Next.js Pattern: https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 */
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Loading NSSPORTS...</p>
      </div>
    </div>
  );
}
