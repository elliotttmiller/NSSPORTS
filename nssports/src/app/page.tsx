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
  const [error, setError] = useState<string | null>(null);
  
  // Fetch live games on mount
  const fetchLiveGames = useCallback(async () => {
    setIsDataLoading(true);
    setError(null);
    try {
      console.log('[HomePage] Fetching live games from /api/games/live...');
      const response = await fetch('/api/games/live');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const json = await response.json();
      const games = Array.isArray(json.data) ? json.data : [];
      console.log(`[HomePage] Fetched ${games.length} live games for trending section`);
      setLiveGamesData(games);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch live games';
      console.error('[HomePage] Error:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsDataLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchLiveGames();
  }, [fetchLiveGames]);
  
  // ⭐ Auto-refresh live games every 30 seconds to catch new live games
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[HomePage] Auto-refreshing live games...');
      fetchLiveGames();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchLiveGames]);
  
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
    return games.slice(0, 5); // Show only first 5 games
  }, [filteredLiveGames, selectedSport]);
  
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
  
  // OPTIONAL: Enable WebSocket streaming for <1s latency (smart cache still works without this)
  useEffect(() => {
    const liveGamesCount = filteredLiveGames.length;
    
    if (liveGamesCount > 0 && !streamingEnabled && typeof enableStreaming === 'function') {
      console.log('[HomePage] Enabling WebSocket streaming for', liveGamesCount, 'live games');
      console.log('[HomePage] Note: Smart cache (10s TTL) is primary system, streaming enhances it');
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
    <div className="bg-background text-foreground">
  <div className="container mx-auto px-6 md:px-8 xl:px-12 py-6 max-w-screen-2xl">
        <div className="space-y-6">
          {/* ...existing code... */}
          <div className="text-center py-8 md:py-12">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4">
              {`Welcome, ${displayName}`}
            </h1>
            <div className="w-32 md:w-48 h-1 bg-accent mx-auto rounded-full"></div>

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
            <div className="flex items-center space-x-2 mb-4">
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
            <div className="mb-4 -mx-6 md:-mx-8 xl:-mx-12 px-6 md:px-8 xl:px-12">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
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
                  {/* Desktop Table Header */}
                  <DesktopGameTableHeader />
                  
                  {/* Mobile/Tablet Table Header */}
                  <div className="lg:hidden">
                    <MobileGameTableHeader />
                  </div>
                  
                  {trendingGames.map((game, index) => (
                    <div key={game.id}>
                      {/* Desktop View */}
                      <div className="hidden lg:block">
                        <LiveGameRow 
                          game={game} 
                          isFirstInGroup={index === 0}
                          isLastInGroup={index === trendingGames.length - 1}
                        />
                      </div>

                      {/* Mobile/Tablet View */}
                      <div className="lg:hidden">
                        <LiveMobileGameRow game={game} />
                      </div>
                    </div>
                  ))}
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

