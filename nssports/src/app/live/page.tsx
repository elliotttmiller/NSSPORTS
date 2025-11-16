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
import { useRefresh } from "@/context";
import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * Helper function to check if games array has actually changed
 * Prevents unnecessary re-renders from API refetches that return identical data
 */
function gamesHaveChanged(oldGames: Game[], newGames: Game[]): boolean {
  if (oldGames.length !== newGames.length) return true;
  
  // Check if any game has different scores, odds, or status
  for (let i = 0; i < newGames.length; i++) {
    const oldGame = oldGames.find(g => g.id === newGames[i].id);
    if (!oldGame) return true;
    
    // Check fields that change frequently during live games
    if (
      oldGame.homeScore !== newGames[i].homeScore ||
      oldGame.awayScore !== newGames[i].awayScore ||
      oldGame.period !== newGames[i].period ||
      oldGame.timeRemaining !== newGames[i].timeRemaining ||
      oldGame.status !== newGames[i].status ||
      oldGame.odds?.spread?.home?.odds !== newGames[i].odds?.spread?.home?.odds ||
      oldGame.odds?.spread?.away?.odds !== newGames[i].odds?.spread?.away?.odds
    ) {
      return true;
    }
  }
  
  return false;
}

export default function LivePage() {
  const [liveGamesData, setLiveGamesData] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [_isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { registerRefreshHandler, unregisterRefreshHandler } = useRefresh();
  
  // Mobile optimization: Track page visibility to pause updates when app is backgrounded
  const [_isPageVisible, setIsPageVisible] = useState(true);
  
  // ⭐ Fetch live games directly from /api/games/live endpoint
  const fetchLiveGames = useCallback(async (isBackgroundUpdate = false, forceUpdate = false) => {
    // Use separate loading state for background updates to preserve mobile bet slip state
    if (isBackgroundUpdate) {
      setIsBackgroundRefreshing(true);
    } else {
      setLoading(true);
    }
    
    setError(null);
    try {
      // Silent background updates - no logging spam
      if (!isBackgroundUpdate) {
        console.log('[LivePage] Initial fetch from /api/games/live...');
      }
  const url = forceUpdate ? `/api/games/live?t=${Date.now()}` : '/api/games/live';
      const response = await fetch(url, {
        // Mobile: Add cache control to get fresh data without page reload
        headers: {
          'Cache-Control': 'no-cache',
        },
        // When forcing an update, bypass service worker/CDN caches
        cache: forceUpdate ? 'no-store' : 'default',
        // Timeout must be longer than API's 25s timeout - 35s to allow for network overhead
        // Background updates: 5 leagues × ~2s each + cache operations can take 10-15s
        signal: AbortSignal.timeout(35000),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const json = await response.json();
  const games = Array.isArray(json.data) ? json.data : [];
      if (!isBackgroundUpdate) {
        console.log(`[LivePage] ✅ Games loaded - ${games.length} live games`);
      }
      
      // Update state. For pull-to-refresh we may force update to bypass deep-equality
      setLiveGamesData(prevGames => {
        if (forceUpdate) return games;
        if (gamesHaveChanged(prevGames, games)) {
          return games;
        }
        return prevGames; // Keep same reference if data hasn't changed
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch live games';
      
      // Suppress timeout errors on background updates to avoid log spam
      // Timeouts are expected during slow SDK responses and don't affect UX
      const isTimeoutError = errorMsg.includes('timeout') || errorMsg.includes('abort');
      
      // Only log errors that aren't timeouts on background updates
      if (!isBackgroundUpdate || !isTimeoutError) {
        console.error('[LivePage] Error:', errorMsg);
      }
      
      // Mobile: Only set error on initial load to avoid disrupting user experience
      if (!isBackgroundUpdate) {
        setError(errorMsg);
      }
    } finally {
      if (isBackgroundUpdate) {
        setIsBackgroundRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  // Manual refresh handler for pull-to-refresh
  const fetchAllMatches = useLiveDataStore((state) => state.fetchAllMatches);
  const handleRefresh = useCallback(async () => {
    // Use background update flag to avoid full-screen loading but force the data to replace
    // Also refresh centralized live data store so any selectors subscribing to it (scores/clock) update
    try {
      await Promise.all([
        fetchLiveGames(true, true),
        fetchAllMatches(true),
      ]);
      // Notify other listeners that a manual refresh completed (useful for components that
      // subscribe to DOM events rather than store selectors)
      try {
        window.dispatchEvent(new CustomEvent('app:refreshed', { detail: { source: 'pull-to-refresh' } }));
      } catch {
        // ignore in non-browser environments
      }
    } catch (err) {
      console.error('[LivePage] handleRefresh error', err);
    }
  }, [fetchLiveGames, fetchAllMatches]);

  // Register refresh handler for pull-to-refresh
  useEffect(() => {
    registerRefreshHandler(handleRefresh);
    return () => unregisterRefreshHandler();
  }, [registerRefreshHandler, unregisterRefreshHandler, handleRefresh]);
  
  // Mobile: Handle page visibility - refresh when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
      if (!document.hidden) {
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
  
  // ⭐ Smart Background Updates for Live Scores/Clock ONLY
  // Updates live game data (scores, period, time) in background
  // ✅ Silent updates - no loading spinners
  // ✅ Only updates state if data actually changed (deep equality check)
  // ✅ Prevents re-renders when scores haven't changed
  // ✅ Only runs when page is visible (saves battery)
  // Interval: 15 seconds (optimal for live betting)
  useEffect(() => {
    // Only run when page is visible
    if (!_isPageVisible) {
      return;
    }
    
    const interval = setInterval(() => {
      fetchLiveGames(true); // Silent background update (deep equality prevents unnecessary re-renders)
    }, 15000); // 15 seconds
    
    return () => clearInterval(interval);
  }, [fetchLiveGames, _isPageVisible]);
  
  // ⭐ PHASE 4: WebSocket Streaming for Real-Time ODDS Updates ONLY
  // OPTIONAL ENHANCEMENT: WebSocket streaming for instant updates
  // - When enabled: <1s update latency via 'events:live' feed
  // - When disabled: Smart cache system still provides real-time data (5s TTL for live games)
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
  
  // ⭐ Sport/League Filter State
  const [selectedSport, setSelectedSport] = useState<string>("all");
  
  // ⭐ Extract unique sports from ALL live games (before filtering)
  // This ensures filter bar always shows all available sports
  const availableSports = useMemo(() => {
    const sportCounts = new Map<string, number>();
    displayGames.forEach(game => {
      if (game.leagueId) {
        sportCounts.set(game.leagueId, (sportCounts.get(game.leagueId) || 0) + 1);
      }
    });
    
    const sports = [
      { name: "all", count: displayGames.length },
      ...Array.from(sportCounts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, count]) => ({ name, count }))
    ];
    
    return sports;
  }, [displayGames]);
  
  // ⭐ Apply sport filter AFTER building available sports list
  const filteredDisplayGames = useMemo(() => {
    return selectedSport === "all" 
      ? displayGames 
      : displayGames.filter(game => game.leagueId === selectedSport);
  }, [displayGames, selectedSport]);
  
  // Group games by league for better organization
  const groupedByLeague = useMemo(() => {
    const groups: Record<string, Game[]> = {};
    filteredDisplayGames.forEach(game => {
      const league = game.leagueId || 'other';
      if (!groups[league]) groups[league] = [];
      groups[league].push(game);
    });
    return groups;
  }, [filteredDisplayGames]);
  
  // League display order and names
  const leagueOrder = ['NBA', 'NCAAB', 'NFL', 'NCAAF', 'NHL'];
  const leagueNames: Record<string, string> = {
    NBA: 'NBA',
    NCAAB: 'NCAA Basketball',
    NFL: 'NFL',
    NCAAF: 'NCAA Football',
    NHL: 'NHL',
    other: 'Other',
  };
  
  useEffect(() => {
    // OPTIONAL: Enable WebSocket for <1s latency (smart cache still works without this)
    if (displayGames.length > 0 && !streamingEnabled && typeof enableStreaming === 'function') {
      enableStreaming(); // Connects to 'events:live' feed (all sports)
    }
    
    // Cleanup: disable streaming when component unmounts
    return () => {
      if (streamingEnabled && typeof disableStreaming === 'function') {
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

  return (
    <div className="bg-background h-full min-h-screen pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pb-6 max-w-[1920px] pt-16">
        {/* Page Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 lg:gap-3 mb-2">
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
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Live Games</h1>
              </div>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base lg:text-lg">
                {filteredDisplayGames.length} game{filteredDisplayGames.length !== 1 ? "s" : ""} in progress
              </p>
            </div>
            <RefreshButton onRefresh={handleRefresh} isLoading={loading} />
          </div>
        </div>

        {/* Sport/League Filter - Always Visible */}
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory px-1">
            {availableSports.map((sport) => {
              const isSelected = selectedSport === sport.name;
              const sportLabel = sport.name === "all" ? "All Sports" : sport.name.toUpperCase();
              
              return (
                <button
                  key={sport.name}
                  onClick={() => setSelectedSport(sport.name)}
                  className={`
                    snap-start shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-medium
                    transition-all duration-300 ease-out
                    touch-action-manipulation active:scale-95
                    flex items-center gap-2
                    ${isSelected 
                      ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/20 scale-105' 
                      : 'bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground border border-border/30'
                    }
                  `}
                >
                  <span>{sportLabel}</span>
                  <span className={`
                    inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold
                    ${isSelected 
                      ? 'bg-accent-foreground/20 text-accent-foreground' 
                      : 'bg-accent/10 text-accent'
                    }
                  `}>
                    {sport.count}
                  </span>
                </button>
              );
            })}
          </div>
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
          ) : filteredDisplayGames.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No live {selectedSport.toUpperCase()} games right now.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try selecting a different sport or view all sports
              </p>
              <button
                onClick={() => setSelectedSport("all")}
                className="mt-4 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                View All Sports
              </button>
            </div>
          ) : (
            <>
              {/* Render games grouped by league */}
              {leagueOrder
                .concat(Object.keys(groupedByLeague).filter(l => !leagueOrder.includes(l)))
                .map((leagueId, leagueIndex) => {
                  const games = groupedByLeague[leagueId];
                  if (!games || games.length === 0) return null;
                  
                  return (
                    <div key={leagueId} className={leagueIndex > 0 ? 'mt-6' : ''}>
                      {/* League Header - Green accent, left aligned */}
                      <div className="py-2 px-4 bg-muted/20 border-b border-border text-base font-semibold text-accent rounded shadow-sm mb-2 text-left">
                        {leagueNames[leagueId] || leagueId}
                      </div>
                      
                      {/* Desktop Table Header */}
                      <div className="hidden lg:block">
                        <DesktopGameTableHeader />
                      </div>
                      
                      {/* Mobile/Tablet Table Header */}
                      <div className="lg:hidden">
                        <MobileGameTableHeader />
                      </div>
                      
                      {games.map((game, index) => (
                        <div key={game.id}>
                          {/* Desktop View */}
                          <div className="hidden lg:block">
                            <LiveGameRow 
                              game={game} 
                              isFirstInGroup={index === 0}
                              isLastInGroup={index === games.length - 1}
                            />
                          </div>

                          {/* Mobile/Tablet View */}
                          <div className="lg:hidden">
                            <LiveMobileGameRow game={game} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
