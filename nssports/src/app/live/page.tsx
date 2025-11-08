"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  MemoizedLiveGameRow as LiveGameRow, 
  LiveMobileGameRow, 
  MobileGameTableHeader, 
  DesktopGameTableHeader 
} from "@/components/features/games";
import type { Game } from "@/types";
import { useLiveDataStore } from "@/store/liveDataStore";
import { useGameTransitions } from "@/hooks/useGameTransitions";
import { RefreshButton } from "@/components/ui";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function LivePage() {
  const [liveGamesData, setLiveGamesData] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [_isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mobile optimization: Track page visibility to pause updates when app is backgrounded
  const [_isPageVisible, setIsPageVisible] = useState(true);
  
  // ⭐ Fetch live games directly from /api/games/live endpoint
  const fetchLiveGames = useCallback(async (isBackgroundUpdate = false) => {
    // Use separate loading state for background updates to preserve mobile bet slip state
    if (isBackgroundUpdate) {
      setIsBackgroundRefreshing(true);
    } else {
      setLoading(true);
    }
    
    setError(null);
    try {
      console.log(`[LivePage Mobile] ${isBackgroundUpdate ? 'Background refreshing odds' : 'Initial fetch'} from /api/games/live...`);
      const response = await fetch('/api/games/live', {
        // Mobile: Add cache control to get fresh data without page reload
        headers: {
          'Cache-Control': 'no-cache',
        },
        // Mobile: Add timeout for slow connections
        signal: AbortSignal.timeout(8000), // 8 second timeout
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const json = await response.json();
      const games = Array.isArray(json.data) ? json.data : [];
      console.log(`[LivePage Mobile] ${isBackgroundUpdate ? '✅ Odds refreshed' : '✅ Games loaded'} - ${games.length} live games (bet slip preserved)`);
      setLiveGamesData(games);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch live games';
      console.error('[LivePage Mobile] Error:', errorMsg);
      // Mobile: Only set error on initial load to avoid disrupting user experience
      if (!isBackgroundUpdate) {
        setError(errorMsg);
      } else {
        console.log('[LivePage Mobile] Background refresh failed - keeping existing odds');
      }
    } finally {
      if (isBackgroundUpdate) {
        setIsBackgroundRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);
  
  // Mobile: Handle page visibility - refresh when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
      if (!document.hidden) {
        console.log('[LivePage Mobile] Page visible - triggering immediate refresh');
        fetchLiveGames(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchLiveGames]);
  
  // Fetch on mount
  useEffect(() => {
    fetchLiveGames(false); // Initial load
  }, [fetchLiveGames]);
  
  // ⭐ Mobile-Optimized Auto-refresh: Updates odds every 30s WITHOUT page refresh
  // ✅ Preserves user's bet selections and UI state
  // ✅ Only refreshes when page is visible (saves mobile battery)
  // ✅ Silent updates - no loading spinners or interruptions
  useEffect(() => {
    // Only run interval when page is visible
    if (!_isPageVisible) {
      console.log('[LivePage Mobile] Page hidden - pausing auto-refresh to save battery');
      return;
    }
    
    const interval = setInterval(() => {
      console.log('[LivePage Mobile] 🔄 Auto-refreshing odds (silent, preserves bet slip)...');
      fetchLiveGames(true); // Background update
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchLiveGames, _isPageVisible]);
  
  // ⭐ PHASE 4: WebSocket Streaming for Real-Time ODDS Updates ONLY
  // OPTIONAL ENHANCEMENT: WebSocket streaming for instant updates
  // - When enabled: <1s update latency via 'events:live' feed
  // - When disabled: Smart cache system still provides real-time data (10s TTL for live games)
  // - Reality: System works perfectly either way, streaming is optimization for premium UX
  const enableStreaming = useLiveDataStore((state) => state.enableStreaming);
  const disableStreaming = useLiveDataStore((state) => state.disableStreaming);
  const streamingEnabled = useLiveDataStore((state) => state.streamingEnabled);
  
  // ⭐ Game Transition Hook: Monitor status changes
  // Automatically filter out games that transition to 'finished'
  const { shouldShowInCurrentContext } = useGameTransitions(liveGamesData, 'live');
  
  // Filter to only show truly live games (not upcoming, not finished)
  const displayGames = useMemo(() => {
    return liveGamesData.filter(game => shouldShowInCurrentContext(game, 'live'));
  }, [liveGamesData, shouldShowInCurrentContext]);
  
  useEffect(() => {
    // OPTIONAL: Enable WebSocket for <1s latency (smart cache still works without this)
    if (displayGames.length > 0 && !streamingEnabled && typeof enableStreaming === 'function') {
      console.log('[LivePage] Enabling WebSocket streaming for', displayGames.length, 'live games');
      console.log('[LivePage] Note: Smart cache (10s TTL) is primary system, streaming enhances it');
      enableStreaming(); // Connects to 'events:live' feed (all sports)
    }
    
    // Cleanup: disable streaming when component unmounts
    return () => {
      if (streamingEnabled && typeof disableStreaming === 'function') {
        console.log('[LivePage] Disabling streaming on unmount');
        disableStreaming();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayGames.length, streamingEnabled]); // Zustand functions are stable
  
  // Prevent hydration mismatch with timeout fallback
  const [mounted, setMounted] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Safety timeout - show content after 3 seconds even if still loading
    const timer = setTimeout(() => {
      if (!mounted) {
        console.warn('[LivePage] Mount timeout - forcing render');
        setMounted(true);
        setShowTimeoutWarning(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [mounted]);

  // Show loading screen only for first 3 seconds
  if (!mounted && !showTimeoutWarning) {
    return (
      <LoadingScreen 
        title="Loading live games..." 
        subtitle="Getting latest matches" 
        showLogo={false}
      />
    );
  }

  const handleRefresh = async () => {
    await fetchLiveGames();
  };

  return (
    <div className="bg-background">
  <div className="container mx-auto px-6 md:px-8 xl:px-12 pb-6 max-w-screen-2xl md:pt-6" style={{ paddingTop: '40px' }}>
  {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              {/* Animated Pulsing Live Indicator */}
              <div className="relative flex items-center justify-center">
                {/* Outer pulsing ring */}
                <div className="absolute w-5 h-5 bg-green-500/30 rounded-full animate-ping" 
                     style={{ animationDuration: '2s' }}></div>
                {/* Middle glow */}
                <div className="absolute w-4 h-4 bg-green-500/50 rounded-full blur-sm"></div>
                {/* Core dot */}
                <div className="relative w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></div>
              </div>
              <h1 className="text-3xl font-bold text-foreground">Live Games</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {displayGames.length} game{displayGames.length !== 1 ? "s" : ""} in progress
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
          ) : liveGamesData.length === 0 ? (
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
