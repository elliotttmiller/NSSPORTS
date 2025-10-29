"use client";

import { GameList } from '@/components/GameList';
import { useLiveDataStore } from "@/store/liveDataStore";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
// ...existing code...

import { useState, useEffect } from "react";

export default function GamesPage() {
  const [totalGames, setTotalGames] = useState<number | null>(null);
  
  // ⭐ CRITICAL FIX: Enable streaming for real-time odds updates
  // Even upcoming games need streaming (betting lines move constantly)
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
  
  // No leagueId passed: fetch all games from all leagues
  // GameList will automatically filter out games that transition to live status
  // Those games will appear on /live page with LiveGameRow component
  return (
    <div className="bg-background h-full">
      <div className="container mx-auto px-6 md:px-8 xl:px-12 pt-12 pb-6 max-w-screen-2xl">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">All Sports & Games</h1>
          <p className="text-muted-foreground mt-1 text-base">
            {totalGames !== null ? `${totalGames} Available Games` : "Loading games..."}
          </p>
        </div>

        {/* Unified Games List: all leagues, upcoming games only */}
        <GameList limit={100} leagueId={undefined} status={undefined} onTotalGamesChange={setTotalGames} />
      </div>
    </div>
  );
}
