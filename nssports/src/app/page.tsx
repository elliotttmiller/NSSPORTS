"use client";

import { TrendUp, Trophy } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  LiveGameRow, 
  LiveMobileGameRow,
  MobileGameTableHeader, 
  DesktopGameTableHeader 
} from "@/components/features/games";
import { useSession } from "next-auth/react";
import { useBetHistory } from "@/context";
import { useAccount } from "@/hooks/useAccount";
import { formatCurrency } from "@/lib/formatters";
import { useLiveMatches, useIsLoading, useError } from "@/hooks/useStableLiveData";
import { useLiveDataStore } from "@/store/liveDataStore";
import { useGameTransitions } from "@/hooks/useGameTransitions";
import { useEffect, useState, useMemo } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { Session } from "next-auth";

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
  
  // Subscribe to live data store
  const liveMatches = useLiveMatches();
  const isDataLoading = useIsLoading();
  const error = useError();
  
  // ⭐ PHASE 4: WebSocket Streaming for Real-Time Odds Updates
  // GLOBAL: Streams ALL live games across all sports (NBA, NFL, NHL, etc.)
  const enableStreaming = useLiveDataStore((state) => state.enableStreaming);
  const disableStreaming = useLiveDataStore((state) => state.disableStreaming);
  const streamingEnabled = useLiveDataStore((state) => state.streamingEnabled);
  
  // ⭐ Game Transition Hook: Monitor status changes
  // Automatically filter out games that transition to 'finished'
  const { shouldShowInCurrentContext } = useGameTransitions(liveMatches, 'live');
  
  // Filter to only show truly live games (not upcoming, not finished)
  const filteredLiveGames = useMemo(() => {
    return liveMatches.filter(game => shouldShowInCurrentContext(game, 'live'));
  }, [liveMatches, shouldShowInCurrentContext]);
  
  // API-driven account stats
  const { data: account, isLoading: accountLoading } = useAccount();
  const balance = account?.balance ?? 0;
  const available = account?.available ?? 0;
  const risk = account?.risk ?? 0;

  // Track if component is mounted and data is ready
  const [isComponentReady, setIsComponentReady] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  
  // Enable streaming when live games are present
  useEffect(() => {
    const liveGamesCount = filteredLiveGames.filter(g => g.status === 'live').length;
    
    if (liveGamesCount > 0 && !streamingEnabled && typeof enableStreaming === 'function') {
      console.log('[HomePage] Enabling real-time streaming for', liveGamesCount, 'live games');
      enableStreaming(); // GLOBAL: No sport parameter needed
    }
    
    // Cleanup: disable streaming when component unmounts
    return () => {
      if (streamingEnabled && typeof disableStreaming === 'function') {
        console.log('[HomePage] Disabling streaming on unmount');
        disableStreaming();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLiveGames, streamingEnabled]); // Zustand functions are stable

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

  // Display first 5 live matches as trending (only truly live games)
  const trendingGames = filteredLiveGames.slice(0, 5);
  const displayName = session?.user?.name || 'NorthStar User';

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
                    className="bg-card/50 backdrop-blur-sm border border-border/30 ring-1 ring-white/10 rounded-lg shadow-sm min-h-[48px] md:min-h-[56px] p-2 md:p-3 flex flex-col items-center justify-center gap-0.5 hover:bg-accent/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors"
                  >
                    {content}
                  </Link>
                );
              }
              return (
                <div
                  key={stat.label}
                  className="bg-card/50 backdrop-blur-sm border border-border/30 ring-1 ring-white/10 rounded-lg shadow-sm min-h-[48px] md:min-h-[56px] p-2 md:p-3 flex flex-col items-center justify-center gap-0.5"
                >
                  {content}
                </div>
              );
            })}
          </div>

          {/* Trending Games Section */}
          <div className="mt-12">
            <div className="flex items-center space-x-2 mb-4">
              <TrendUp size={20} className="text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                Trending Live Games
              </h2>
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
                  <p className="text-muted-foreground">No trending games right now.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Check back later for live games
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
                </>
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
              <Link href="/games" className="flex items-center space-x-2">
                <Trophy size={20} />
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

