"use client";

import { ProfessionalGameRow, CompactMobileGameRow, MobileGameTableHeader, DesktopGameTableHeader } from "@/components/features/games";
import { useLiveMatches, useIsLoading, useError } from "@/hooks/useStableLiveData";

export default function LivePage() {
  // Protocol I: Single Source of Truth - consume from centralized store
  // Using stable hooks to prevent infinite loops
  // IMPORTANT: useLiveMatches() filters to show ONLY games with status='live' (currently in progress)
  // Automatically excludes upcoming and finished games
  const liveGames = useLiveMatches();
  const loading = useIsLoading();
  const error = useError();

  // Data is now fetched by LiveDataProvider at the app level with automatic 30s polling
  // No need to fetch here - Protocol II: Efficient State Hydration

  return (
    <div className="bg-background">
  <div className="container mx-auto px-6 md:px-8 xl:px-12 pt-12 pb-6 max-w-screen-2xl">
  {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Live Games</h1>
          <p className="text-muted-foreground mt-1">
            {liveGames.length} game{liveGames.length !== 1 ? "s" : ""} in progress
          </p>
        </div>

  {/* Games List */}
        {/* Protocol IV: Universal UI State Handling */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading live games...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">Error loading games</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          ) : liveGames.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No live games right now.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later for upcoming games
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table Header */}
              <DesktopGameTableHeader />
              
              {/* Mobile/Tablet Table Header */}
              <div className="lg:hidden">
                <MobileGameTableHeader />
              </div>
              
              {liveGames.map((game, index) => (
                <div key={game.id}>
                  {/* Desktop View */}
                  <div className="hidden lg:block">
                    <ProfessionalGameRow 
                      game={game} 
                      isFirstInGroup={index === 0}
                      isLastInGroup={index === liveGames.length - 1}
                    />
                  </div>

                  {/* Mobile/Tablet View */}
                  <div className="lg:hidden">
                    <CompactMobileGameRow game={game} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
