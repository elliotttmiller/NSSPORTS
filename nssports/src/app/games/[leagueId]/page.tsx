"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ProfessionalGameRow, CompactMobileGameRow, MobileGameTableHeader, DesktopGameTableHeader } from "@/components/features/games";
import { getLeague } from "@/services/api";
import { usePaginatedGames } from "@/hooks/usePaginatedGames";
import { PullToRefresh, RefreshButton } from "@/components/ui";
import type { Game, League } from "@/types";

export default function LeaguePage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const page = 1;
  const limit = 100;
  const { data, isLoading, refetch } = usePaginatedGames({ leagueId, page, limit });
  let games: Game[] = [];
  if (data && typeof data === 'object' && data !== null) {
    games = ((data as { data?: Game[] }).data ?? []).filter(g => g.status !== 'finished');
  }
  
  // Manual refresh handler for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);
  
  useEffect(() => {
    getLeague(leagueId).then((leagueData) => setLeague(leagueData || null));
  }, [leagueId]);
  const leagueName = league?.name || leagueId.toUpperCase();

  // Group games by date
  const groupGamesByDate = (games: Game[]) => {
    const groups: { [date: string]: Game[] } = {};
    games.forEach((game) => {
      const dateObj = new Date(game.startTime);
      const dateStr = dateObj.toLocaleDateString(undefined, {
        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(game);
    });
    return groups;
  };

  const groupedGames = groupGamesByDate(games);
  const sortedDates = Object.keys(groupedGames).sort((a, b) => {
    return new Date(groupedGames[a][0].startTime).getTime() - new Date(groupedGames[b][0].startTime).getTime();
  });
  const filteredDates = selectedDate ? [selectedDate] : sortedDates;

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={isLoading}>
      <div className="bg-background">
        <div className="container mx-auto px-6 md:px-8 xl:px-12 pt-12 pb-6 max-w-screen-2xl">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-5">
              {league && league.logo && (
                <Image
                  src={league.logo}
                  alt={(league.name ?? "League") + ' logo'}
                  width={48}
                  height={48}
                  className="w-12 h-12 md:w-14 md:h-14 object-contain"
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
            <RefreshButton onRefresh={handleRefresh} isLoading={isLoading} />
          </div>

          {/* Horizontal date tabs bar */}
          {games.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 bg-background border-b border-border sticky top-0 z-20">
              {/* Date Filters */}
              {sortedDates.map((dateStr) => (
                <button
                  key={dateStr}
                  className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${selectedDate === dateStr ? 'bg-accent text-accent-foreground shadow' : 'bg-muted/10 text-muted-foreground hover:bg-accent/10'}`}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  {dateStr}
                </button>
              ))}
              {selectedDate && (
                <button
                  className="px-3 py-2 rounded-full text-xs font-medium bg-muted/10 text-muted-foreground ml-2"
                  onClick={() => setSelectedDate(null)}
                >
                  Show All
                </button>
              )}
            </div>
          )}

          {/* Games List */}
          <div className="space-y-3">
            {isLoading ? (
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
                {filteredDates.map((dateStr) =>
                  groupedGames[dateStr] ? (
                    <div key={dateStr} className="space-y-2">
                      {/* Date divider/header */}
                      <div className="py-2 px-4 bg-muted/10 border-b border-border text-lg font-semibold text-accent sticky top-0 z-10">
                        {dateStr}
                      </div>
                      {/* Games for this date, sorted by time */}
                      {groupedGames[dateStr]
                        .sort((a: Game, b: Game) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                        .map((game: Game, index: number) => (
                          <div key={game.id}>
                            <div className="hidden lg:block">
                              <ProfessionalGameRow
                                game={game}
                                isFirstInGroup={index === 0}
                                isLastInGroup={index === groupedGames[dateStr]!.length - 1}
                              />
                            </div>
                            <div className="lg:hidden">
                              <CompactMobileGameRow game={game} />
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : null
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}
