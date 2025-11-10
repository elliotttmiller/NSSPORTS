"use client";

import { GameList } from '@/components/GameList';
import { useLiveDataStore } from "@/store/liveDataStore";
import { useRefresh } from "@/context";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
// ...existing code...

import { useState, useEffect, useCallback } from "react";

export default function GamesPage() {
  const [totalGames, setTotalGames] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
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
    console.log('[GamesPage] 🔄 Manual refresh triggered - bypassing cache for fresh odds');
    // Increment refresh key to force GameList remount with fresh data
    setRefreshKey(prev => prev + 1);
  }, []);

  // Register refresh handler for pull-to-refresh
  useEffect(() => {
    registerRefreshHandler(handleRefresh);
    return () => unregisterRefreshHandler();
  }, [registerRefreshHandler, unregisterRefreshHandler, handleRefresh]);
  
  // No leagueId passed: fetch all games from all leagues
  // GameList will automatically filter out games that transition to live status
  // Those games will appear on /live page with LiveGameRow component
  return (
    <div className="bg-background h-full">
      <div className="container mx-auto px-6 md:px-8 xl:px-12 pb-6 max-w-screen-2xl md:pt-6" style={{ paddingTop: '40px' }}>
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">All Sports & Games</h1>
          <p className="text-muted-foreground mt-1 text-base">
            {totalGames !== null ? `${totalGames} Available Games` : "Loading games..."}
          </p>
        </div>

        {/* Unified Games List: all leagues, upcoming games only */}
        <GameList 
          key={refreshKey} 
          limit={100} 
          leagueId={undefined} 
          status={undefined} 
          onTotalGamesChange={setTotalGames}
          bypassCache={refreshKey > 0}
        />
      </div>
    </div>
  );
}
