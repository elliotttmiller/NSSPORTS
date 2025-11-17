"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  MemoizedLiveGameRow as LiveGameRow, 
  LiveMobileGameRow,
  MobileGameTableHeader, 
  DesktopGameTableHeader 
} from "@/components/features/games";
import { useSession } from "next-auth/react";
import { useBetHistory } from "@/context";
import { useAccount } from "@/hooks/useAccount";
import { formatCurrency } from "@/lib/formatters";
import { useLiveDataStore } from "@/store/liveDataStore";
import { useGameTransitions } from "@/hooks/useGameTransitions";
import { useEffect, useState, useMemo, useCallback } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { Session } from "next-auth";
import type { Game } from "@/types";

export default function Home() {
  const { data: session } = useSession();
  
  // At this point, AuthProvider guarantees we're authenticated
  // No need for additional loading checks
  return <AuthenticatedHomePage session={session!} />;
}

// Separate component that only renders when authenticated
function AuthenticatedHomePage({ session }: { session: Session }) {
  const { placedBets } = useBetHistory();
  const activeBetsCount = (placedBets || []).filter(b => b.status === 'pending').length;
  
  // ⭐ Fetch live games from dedicated /api/games/live endpoint
  const [liveGamesData, setLiveGamesData] = useState<Game[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [_isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track page visibility to pause updates when app is backgrounded (saves battery)
  const [_isPageVisible, setIsPageVisible] = useState(true);
  
  // Fetch live games on mount
  const fetchLiveGames = useCallback(async (isBackgroundUpdate = false) => {
    // Use separate loading state for background updates to preserve bet slip state
    if (isBackgroundUpdate) {
      setIsBackgroundRefreshing(true);
    } else {
      setIsDataLoading(true);
    }
    
    setError(null);
    try {
      // Silent background updates - no logging spam
      if (!isBackgroundUpdate) {
        console.log('[HomePage] Initial fetch from /api/games/live...');
      }
      const response = await fetch('/api/games/live', {
        headers: {
          'Cache-Control': 'no-cache',
        },
        // Timeout: 45s for initial load (hybrid cache can be slow), 30s for background updates
        signal: AbortSignal.timeout(isBackgroundUpdate ? 30000 : 45000),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const json = await response.json();
      const games = Array.isArray(json.data) ? json.data : [];
      if (!isBackgroundUpdate) {
        console.log(`[HomePage] ✅ Games loaded - ${games.length} live games`);
      }
      
      // Only update state if games have actually changed (prevents flickering)
      setLiveGamesData(prevGames => {
        // Quick check: if lengths differ, data changed
        if (prevGames.length !== games.length) return games;
        
        // Deep check: compare key fields that change during live games
        let hasChanges = false;
        for (const newGame of games) {
          const oldGame = prevGames.find(g => g.id === newGame.id);
          if (!oldGame ||
              oldGame.homeScore !== newGame.homeScore ||
              oldGame.awayScore !== newGame.awayScore ||
              oldGame.period !== newGame.period ||
              oldGame.timeRemaining !== newGame.timeRemaining ||
              oldGame.status !== newGame.status ||
              oldGame.odds?.spread?.home?.odds !== newGame.odds?.spread?.home?.odds
          ) {
            hasChanges = true;
            break;
          }
        }
        
        return hasChanges ? games : prevGames;
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch live games';
      // Only log errors, not every background update
      if (!isBackgroundUpdate || errorMsg.includes('abort')) {
        console.error('[HomePage] Error:', errorMsg);
      }
      // Only set error on initial load to avoid disrupting user experience
      if (!isBackgroundUpdate) {
        setError(errorMsg);
      }
    } finally {
      if (isBackgroundUpdate) {
        setIsBackgroundRefreshing(false);
      } else {
        setIsDataLoading(false);
      }
    }
  }, []);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
      if (!document.hidden) {
        fetchLiveGames(true); // Refresh when user returns to page
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchLiveGames]);
  
  useEffect(() => {
    fetchLiveGames(false); // Initial load
  }, [fetchLiveGames]);
  
  // ⭐ Smart Background Updates for Live Scores/Clock
  // Updates live game data in background without disrupting UI
  // ✅ Silent updates - no loading spinners
  // ✅ Only updates state if data actually changed (deep equality check)
  // ✅ Preserves user's bet slip and UI state
  // ✅ Only runs when page is visible (saves battery)
  useEffect(() => {
    if (!_isPageVisible) {
      return;
    }
    
    const interval = setInterval(() => {
      fetchLiveGames(true); // Background update with deep equality check
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchLiveGames, _isPageVisible]);
  
  // OPTIONAL ENHANCEMENT: WebSocket streaming for instant updates
  // - When enabled: <1s update latency via 'events:live' feed
  // - When disabled: Smart cache system still provides real-time data (10s TTL for live games)
  // - Reality: System works perfectly either way, streaming is optimization for premium UX
  const enableStreaming = useLiveDataStore((state) => state.enableStreaming);
  const disableStreaming = useLiveDataStore((state) => state.disableStreaming);
  const streamingEnabled = useLiveDataStore((state) => state.streamingEnabled);
  
  // ⭐ Subscribe to streaming updates from liveDataStore
  // This syncs WebSocket odds updates with the homepage's local state
  const storeMatches = useLiveDataStore((state) => state.matches);
  
  useEffect(() => {
    // When streaming updates the store, merge those updates into our local state
    if (streamingEnabled && storeMatches.length > 0) {
      console.log('[HomePage] Syncing streaming updates from liveDataStore...');
      setLiveGamesData(prevGames => {
        // Only update if we have local games
        if (prevGames.length === 0) return prevGames;
        
        // Merge streaming updates (odds, status) into local games
        return prevGames.map(localGame => {
          const streamedGame = storeMatches.find(g => g.id === localGame.id);
          if (streamedGame) {
            // Merge streaming updates while preserving other local data
            return {
              ...localGame,
              odds: streamedGame.odds, // Updated odds from WebSocket
              status: streamedGame.status, // Updated status from WebSocket
              homeScore: streamedGame.homeScore,
              awayScore: streamedGame.awayScore,
              period: streamedGame.period,
              timeRemaining: streamedGame.timeRemaining,
            };
          }
          return localGame;
        });
      });
    }
  }, [storeMatches, streamingEnabled]);
  
  // ⭐ Game Transition Hook: Monitor status changes
  // Automatically filter out games that transition to 'finished'
  const { shouldShowInCurrentContext } = useGameTransitions(liveGamesData, 'live');
  
  // Filter to only show truly live games (not upcoming, not finished)
  const filteredLiveGames = useMemo(() => {
    return liveGamesData.filter(game => shouldShowInCurrentContext(game, 'live'));
  }, [liveGamesData, shouldShowInCurrentContext]);
  
  // ⭐ Sport/League Filter State
  const [selectedSport, setSelectedSport] = useState<string>("all");
  
  // Extract unique sports from live games with counts
  const availableSports = useMemo(() => {
    const sportCounts = new Map<string, number>();
    filteredLiveGames.forEach(game => {
      if (game.leagueId) {
        sportCounts.set(game.leagueId, (sportCounts.get(game.leagueId) || 0) + 1);
      }
    });
    
    const sports = [
      { name: "all", count: filteredLiveGames.length },
      ...Array.from(sportCounts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, count]) => ({ name, count }))
    ];
    
    return sports;
  }, [filteredLiveGames]);
  
  // Filter games by selected sport
  const trendingGames = useMemo(() => {
    const games = selectedSport === "all" 
      ? filteredLiveGames 
      : filteredLiveGames.filter(game => game.leagueId === selectedSport);
    return games.slice(0, 10); // Show maximum 10 trending games
  }, [filteredLiveGames, selectedSport]);
  
  // Group games by league for better organization
  const groupedByLeague = useMemo(() => {
    const groups: Record<string, Game[]> = {};
    trendingGames.forEach(game => {
      const league = game.leagueId || 'other';
      if (!groups[league]) groups[league] = [];
      groups[league].push(game);
    });
    return groups;
  }, [trendingGames]);
  
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
  
  // Debug: Log available sports for troubleshooting
  useEffect(() => {
    if (availableSports.length > 0) {
      console.log('[HomePage] Available sports filter:', availableSports);
      console.log('[HomePage] Total live games:', filteredLiveGames.length);
    }
  }, [availableSports, filteredLiveGames.length]);
  
  // API-driven account stats
  const { data: account, isLoading: accountLoading } = useAccount();
  const balance = account?.balance ?? 0;
  const available = account?.available ?? 0;
  const risk = account?.risk ?? 0;

  // Track if component is mounted and data is ready
  const [isComponentReady, setIsComponentReady] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  
  // ⭐ Enable WebSocket streaming for real-time odds updates
  // Streaming updates will flow through storeMatches and sync to local state
  useEffect(() => {
    const liveGamesCount = filteredLiveGames.length;
    
    if (liveGamesCount > 0 && !streamingEnabled && typeof enableStreaming === 'function') {
      console.log('[HomePage] Enabling WebSocket streaming for', liveGamesCount, 'trending live games');
      console.log('[HomePage] Streaming will provide <1s odds updates via liveDataStore sync');
      
      // Enable streaming - it will update the store's matches which we subscribe to above
      enableStreaming(); // Connects to 'events:live' feed (all sports)
    }
    
    // Cleanup: disable streaming when component unmounts
    return () => {
      if (streamingEnabled && typeof disableStreaming === 'function') {
        console.log('[HomePage] Disabling streaming on unmount');
        disableStreaming();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLiveGames.length, streamingEnabled]); // Zustand functions are stable

  // Smart loading with timeout fallback
  useEffect(() => {
    // Set timeout warning after 5 seconds
    const timeoutTimer = setTimeout(() => {
      if (!isComponentReady) {
        console.warn('[HomePage] Loading timeout - showing content anyway');
        setShowTimeout(true);
        setIsComponentReady(true);
      }
    }, 5000);
    
    // Normal loading check
    if (!isDataLoading && !accountLoading) {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        setIsComponentReady(true);
      }, 300);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(timeoutTimer);
      };
    }
    
    return () => clearTimeout(timeoutTimer);
  }, [isDataLoading, accountLoading, isComponentReady]);

  // Show loading only for first 5 seconds, then render content regardless
  if (!isComponentReady && !showTimeout) {
    return (
      <LoadingScreen 
        title="Loading games..." 
        subtitle="Getting latest odds and matches" 
        showLogo={false} 
      />
    );
  }

  const displayName = session?.user?.name || session?.user?.username || 'NorthStar User';

  return (
    <div className="bg-background text-foreground min-h-screen pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-[1920px] pt-6">
        <div className="space-y-6 lg:space-y-8">
          {/* ...existing code... */}
          <div className="text-center py-4 lg:py-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground tracking-tight mb-4">
              {`Welcome, ${displayName}`}
            </h1>
            <div className="w-32 sm:w-40 lg:w-48 h-1 bg-accent mx-auto rounded-full"></div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 md:mt-12">
            {[ 
              { label: "Balance", value: formatCurrency(balance), color: "text-foreground" },
              { label: "Available", value: formatCurrency(available), color: "text-foreground" },
              { label: "Risk", value: formatCurrency(risk), color: "text-destructive" },
              { label: "Active Bets", value: activeBetsCount, color: "text-foreground" },
            ].map((stat) => {
              const content = (
                <>
                  <p className="text-sm md:text-base text-foreground font-normal">
                    {stat.label}
                  </p>
                  <p className={`font-semibold text-base ${stat.color}`}>
                    {stat.value}
                  </p>
                </>
              );
              if (stat.label === "Active Bets") {
                return (
                  <Link
                    key={stat.label}
                    href="/my-bets"
                    aria-label="View my active bets"
                    className="bg-card/50 backdrop-blur-sm border border-border/30 ring-1 ring-white/10 rounded-lg shadow-sm min-h-12 md:min-h-14 p-2 md:p-3 flex flex-col items-center justify-center gap-0.5 hover:bg-accent/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors"
                  >
                    {content}
                  </Link>
                );
              }
              return (
                <div
                  key={stat.label}
                  className="bg-card/50 backdrop-blur-sm border border-border/30 ring-1 ring-white/10 rounded-lg shadow-sm min-h-12 md:min-h-14 p-2 md:p-3 flex flex-col items-center justify-center gap-0.5"
                >
                  {content}
                </div>
              );
            })}
          </div>

          {/* Trending Games Section */}
          <div className="mt-12">
            <div className="flex items-center space-x-2 mb-4 px-1">
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
              <h2 className="text-lg font-semibold text-foreground">
                Trending Live Games
              </h2>
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
            
            {/* Games List - Responsive like /live page */}
            {/* Protocol IV: Universal UI State Handling */}
            <div className="space-y-3">
              {isDataLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading games...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-destructive font-semibold">Error loading games</p>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      const fetchAllMatches = useLiveDataStore.getState().fetchAllMatches;
                      fetchAllMatches();
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : trendingGames.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {selectedSport === "all" 
                      ? "No trending games right now." 
                      : `No live ${selectedSport.toUpperCase()} games right now.`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedSport === "all" 
                      ? "Check back later for live games" 
                      : "Try selecting a different sport or view all sports"}
                  </p>
                  {selectedSport !== "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setSelectedSport("all")}
                    >
                      View All Sports
                    </Button>
                  )}
                </div>
              ) : (
                <div key={selectedSport} className="animate-in fade-in duration-300">
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
                </div>
              )}
            </div>
            
            <div className="flex justify-center mt-4">
              <Link
                href="/live"
                className="text-xs px-3 py-1 rounded bg-muted/30 hover:bg-muted/50 text-muted-foreground transition-all duration-150 shadow-sm border border-border"
              >
                View All
              </Link>
            </div>
          </div>

          {/* View All Games Button */}
          <div className="text-center py-6">
            <Button asChild size="lg" className="px-8 py-3">
              <Link href="/games">
                <span>View All Sports & Games</span>
              </Link>
            </Button>
          </div>

          {/* Bottom spacing for mobile */}
          <div className="h-8" />
        </div>
      </div>
      </div>
    </div>
  );
}

