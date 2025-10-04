"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui";
import { ProfessionalGameRow, CompactMobileGameRow, MobileGameTableHeader, DesktopGameTableHeader } from "@/components/features/games";
import { getGamesByLeague, getLeague } from "@/services/api";
import type { Game, League } from "@/types";

export default function LeaguePage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  
  const [games, setGames] = useState<Game[]>([]);
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeagueData = async () => {
      setLoading(true);
      try {
        const [leagueData, gamesData] = await Promise.all([
          getLeague(leagueId),
          getGamesByLeague(leagueId)
        ]);
        setLeague(leagueData || null);
        setGames(gamesData);
      } catch (error) {
        console.error("Failed to load league data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadLeagueData();
  }, [leagueId]);

  const leagueName = league?.name || leagueId.toUpperCase();

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-6 max-w-screen-2xl">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{leagueName} Games</h1>
            <p className="text-muted-foreground mt-1">
              {games.length} game{games.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/games">All Games</Link>
          </Button>
        </div>

        {/* Games List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading {leagueName} games...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No {leagueName} games available.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later for upcoming games
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
              
              {games.map((game, index) => (
                <div key={game.id}>
                  {/* Desktop View */}
                  <div className="hidden lg:block">
                    <ProfessionalGameRow 
                      game={game} 
                      isFirstInGroup={index === 0}
                      isLastInGroup={index === games.length - 1}
                    />
                  </div>

                  {/* Mobile/Tablet View */}
                  <div className="lg:hidden">
                    <CompactMobileGameRow game={game} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
