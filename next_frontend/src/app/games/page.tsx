"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { ProfessionalGameRow } from "@/components/features/games";
import { getLiveGames, getUpcomingGames } from "@/services/mockApi";
import type { Game } from "@/types";

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGames = async () => {
      setLoading(true);
      const liveGames = await getLiveGames();
      const upcomingGames = await getUpcomingGames();
      setGames([...liveGames, ...upcomingGames]);
      setLoading(false);
    };
    loadGames();
  }, []);

  return (
    <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">All Sports & Games</h1>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>

        {/* Stats Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Balance", value: "$1,250.00" },
            { label: "Win Rate", value: "68%" },
            { label: "Active", value: "0" },
            { label: "This Week", value: "+$340" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg shadow-sm p-4 flex flex-col items-center justify-center gap-1"
            >
              <p className="text-xs md:text-sm text-muted-foreground font-medium">
                {stat.label}
              </p>
              <p className="font-bold text-sm md:text-base text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Games List */}
        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-[80px_1fr_120px_120px_120px] gap-4 items-center py-3 px-4 bg-muted/30 border-b border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase">
              League
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">
              Teams
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase text-center">
              Spread
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase text-center">
              Total
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase text-center">
              Moneyline
            </div>
          </div>

          {/* Games */}
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading games...
            </div>
          ) : games.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No games available
            </div>
          ) : (
            <div>
              {games.map((game, idx) => (
                <ProfessionalGameRow key={game.id} game={game} isFirstInGroup={idx === 0} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
