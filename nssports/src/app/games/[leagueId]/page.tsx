"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ProfessionalGameRow, CompactMobileGameRow, MobileGameTableHeader, DesktopGameTableHeader } from "@/components/features/games";
import { getGamesPaginated, getLeague } from "@/services/api";
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
        const [leagueData, gamesResponse] = await Promise.all([
          getLeague(leagueId),
          // Use the live API endpoint with league filter instead of database query
          getGamesPaginated(leagueId, 1, 1000)
        ]);
        setLeague(leagueData || null);
        setGames(gamesResponse.data);
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
      <div className="container mx-auto px-6 md:px-8 xl:px-12 pt-12 pb-6 max-w-screen-2xl">
  {/* Page Header */}
        <div className="mb-8 flex items-center justify-start">
          <div className="flex items-center gap-5">
            {league?.logo && (
              <Image
                src={league.logo}
                alt={league.name + ' logo'}
                width={48}
                height={48}
                className="w-12 h-12 md:w-14 md:h-14 rounded-full object-contain bg-white border border-border shadow"
                style={{ minWidth: 48, minHeight: 48 }}
                priority
              />
            )}
            <div className="flex flex-col justify-center items-start">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-1">{leagueName} Games</h1>
              <p className="text-muted-foreground text-base md:text-lg font-medium leading-tight" style={{marginTop: '-2px'}}>
                {games.length} game{games.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>
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
