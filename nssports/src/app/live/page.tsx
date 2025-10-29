"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  LiveGameRow, 
  LiveMobileGameRow, 
  MobileGameTableHeader, 
  DesktopGameTableHeader 
} from "@/components/features/games";
import { useLiveMatches, useIsLoading, useError } from "@/hooks/useStableLiveData";
import { useLiveDataStore } from "@/store/liveDataStore";
import { useGameTransitions } from "@/hooks/useGameTransitions";
import { RefreshButton } from "@/components/ui";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function LivePage() {
  const liveGames = useLiveMatches();
  const loading = useIsLoading();
  const error = useError();
  
  // ⭐ PHASE 4: WebSocket Streaming for Real-Time Odds Updates
  // Automatically enable streaming when live games are present
  // This provides <1s updates vs 30s polling (87% reduction in API calls)
  // GLOBAL: Streams ALL live games across all sports (NBA, NFL, NHL, etc.)
  const enableStreaming = useLiveDataStore((state) => state.enableStreaming);
  const disableStreaming = useLiveDataStore((state) => state.disableStreaming);
  const streamingEnabled = useLiveDataStore((state) => state.streamingEnabled);
  
  // ⭐ Game Transition Hook: Monitor status changes
  // Automatically filter out games that transition to 'finished'
  const { shouldShowInCurrentContext } = useGameTransitions(liveGames, 'live');
  
  // Filter to only show truly live games (not upcoming, not finished)
  const displayGames = useMemo(() => {
    return liveGames.filter(game => shouldShowInCurrentContext(game, 'live'));
  }, [liveGames, shouldShowInCurrentContext]);
  
  useEffect(() => {
    // Enable streaming if we have live games and it's not already enabled
    if (displayGames.length > 0 && !streamingEnabled) {
      console.log('[LivePage] Enabling real-time streaming for', displayGames.length, 'live games');
      enableStreaming(); // GLOBAL: No sport parameter needed
    }
    
    // Cleanup: disable streaming when component unmounts
    return () => {
      if (streamingEnabled) {
        console.log('[LivePage] Disabling streaming on unmount');
        disableStreaming();
      }
    };
  }, [displayGames.length, streamingEnabled, enableStreaming, disableStreaming]);
  
  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading screen until mounted
  if (!mounted) {
    return (
      <LoadingScreen 
        title="Loading live games..." 
        subtitle="Getting latest matches" 
        showLogo={false}
      />
    );
  }

  const handleRefresh = async () => {
    window.location.reload();
  };

  return (
    <div className="bg-background">
  <div className="container mx-auto px-6 md:px-8 xl:px-12 pt-12 pb-6 max-w-screen-2xl">
  {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Live Games</h1>
            <p className="text-muted-foreground mt-1">
              {displayGames.length} game{displayGames.length !== 1 ? "s" : ""} in progress
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              📡 Real-time streaming • Auto-updated from /games pages
            </p>
          </div>
          <RefreshButton onRefresh={handleRefresh} isLoading={loading} />
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
              
              {displayGames.map((game, index) => (
                <div key={game.id}>
                  {/* Desktop View */}
                  <div className="hidden lg:block">
                    <LiveGameRow 
                      game={game} 
                      isFirstInGroup={index === 0}
                      isLastInGroup={index === displayGames.length - 1}
                    />
                  </div>

                  {/* Mobile/Tablet View */}
                  <div className="lg:hidden">
                    <LiveMobileGameRow game={game} />
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
