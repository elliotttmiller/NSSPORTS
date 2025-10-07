"use client";

import { GameList } from '@/components/GameList';
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
// ...existing code...

import { useState } from "react";

export default function GamesPage() {
  const [totalGames, setTotalGames] = useState<number | null>(null);
  // No leagueId passed: fetch all games from all leagues
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

        {/* Unified Games List: all leagues */}
        <GameList limit={100} leagueId={undefined} status={undefined} onTotalGamesChange={setTotalGames} />
      </div>
    </div>
  );
}
