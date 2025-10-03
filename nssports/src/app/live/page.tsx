"use client";

import { useEffect, useState } from "react";
import { ProfessionalGameRow, CompactMobileGameRow } from "@/components/features/games";
import { getLiveGames } from "@/services/api";
import type { Game } from "@/types";

export default function LivePage() {
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLiveGames = async () => {
      try {
        const games = await getLiveGames();
        // Sort by start time
        const sortedGames = games.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        setLiveGames(sortedGames);
      } catch (error) {
        console.error("Failed to load live games:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLiveGames();
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="container mx-auto px-4 py-6 max-w-screen-2xl">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Live Games</h1>
          <p className="text-muted-foreground mt-1">
            {liveGames.length} game{liveGames.length !== 1 ? "s" : ""} in progress
          </p>
        </div>

        {/* Games List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading live games...</p>
            </div>
          ) : liveGames.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No live games right now.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later for upcoming games
              </p>
            </div>
          ) : (
            liveGames.map((game, idx) => (
              <div key={game.id}>
                {/* Desktop View */}
                <div className="hidden lg:block">
                  <ProfessionalGameRow game={game} />
                </div>

                {/* Mobile/Tablet View */}
                <div className="lg:hidden">
                  <CompactMobileGameRow game={game} index={idx} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
