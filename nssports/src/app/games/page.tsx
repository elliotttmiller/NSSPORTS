"use client";

import { GameList } from '@/components/GameList';
import { useLiveDataStore } from "@/store/liveDataStore";
import { useRefresh } from "@/context";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
// ...existing code...

import { useState, useEffect, useCallback, useRef } from "react";

export default function GamesPage() {
  const [totalGames, setTotalGames] = useState<number | null>(null);
  const gameListRefreshRef = useRef<(() => Promise<void>) | null>(null);
  const { registerRefreshHandler, unregisterRefreshHandler } = useRefresh();
  
  // ⭐ CRITICAL FIX: Enable streaming for real-time ODDS updates ONLY
  // Even upcoming games need streaming (betting lines move constantly)
  // NO live scores/stats/times - those come from scheduled API fetches
  const enableStreaming = useLiveDataStore((state) => state.enableStreaming);
  const disableStreaming = useLiveDataStore((state) => state.disableStreaming);
  const streamingEnabled = useLiveDataStore((state) => state.streamingEnabled);
  
  // Enable streaming when component mounts - optimized to avoid unnecessary re-runs
  useEffect(() => {
    if (totalGames !== null && totalGames > 0 && !streamingEnabled && typeof enableStreaming === 'function') {
      console.log('[GamesPage] Enabling real-time streaming for', totalGames, 'games');
      enableStreaming();
    }
    
    return () => {
      if (streamingEnabled && typeof disableStreaming === 'function') {
        console.log('[GamesPage] Disabling streaming on unmount');
        disableStreaming();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalGames, streamingEnabled]); // Functions are stable in Zustand, don't include them

  // Manual refresh handler for pull-to-refresh (forces cache bypass)
  const handleRefresh = useCallback(async () => {
    console.log('[GamesPage] 🔄 Manual refresh triggered - calling GameList refresh');
    // Call the GameList's internal refresh handler directly
    if (gameListRefreshRef.current) {
      await gameListRefreshRef.current();
    }
  }, []);

  // Register refresh handler for pull-to-refresh
  useEffect(() => {
    registerRefreshHandler(handleRefresh);
    return () => unregisterRefreshHandler();
  }, [registerRefreshHandler, unregisterRefreshHandler, handleRefresh]);
  
  return (
    <div className="bg-background h-full min-h-screen pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pb-6 max-w-[1920px] pt-16">
        {/* Page Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">All Sports & Games</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base lg:text-lg">
                {totalGames !== null ? `${totalGames} Available Games` : "Loading games..."}
              </p>
            </div>
          </div>
        </div>

        {/* Unified Games List with internal sport and date filters */}
        <GameList 
          limit={500} 
          leagueId={undefined} 
          status={undefined} 
          onTotalGamesChange={setTotalGames}
          onRefreshReady={(refreshFn) => { gameListRefreshRef.current = refreshFn; }}
          showDateFilterInHeader={true}
        />
      </div>
    </div>
  );
}
