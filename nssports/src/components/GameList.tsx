'use client';

import { useState, useRef, useEffect } from 'react';
import { usePaginatedGames, UsePaginatedGamesParams } from '@/hooks/usePaginatedGames';
import { DesktopGameTableHeader } from '@/components/features/games/DesktopGameTableHeader';
import { MobileGameTableHeader } from '@/components/features/games/MobileGameTableHeader';
import { ProfessionalGameRow } from '@/components/features/games/ProfessionalGameRow';
import { CompactMobileGameRow } from '@/components/features/games/CompactMobileGameRow';
import type { Game, PaginatedResponse } from '@/types';

type GameListProps = Partial<UsePaginatedGamesParams> & {
  limit?: number;
  onTotalGamesChange?: (total: number) => void;
};

export function GameList({ leagueId, status, limit = 10, onTotalGamesChange }: GameListProps) {
  const [page, setPage] = useState(1);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Track selected date, default to first available date on initial load
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = usePaginatedGames({ leagueId, status, page, limit });
  let pagination: PaginatedResponse<Game>["pagination"] | undefined = undefined;
  let games: Game[] = [];
  if (data && typeof data === 'object' && data !== null) {
    games = (data as { data?: Game[] }).data ?? [];
    pagination = (data as { pagination?: PaginatedResponse<Game>["pagination"] }).pagination;
  }

  // On data change, append new games
  useEffect(() => {
    if (games.length > 0) {
      setAllGames((prev) => {
        // Avoid duplicates
        const ids = new Set(prev.map((g) => g.id));
        return [...prev, ...games.filter((g) => !ids.has(g.id))];
      });
      setHasMore(!!pagination?.hasNextPage);
    }
    if (onTotalGamesChange && pagination?.total !== undefined) {
      onTotalGamesChange(pagination.total);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(games), pagination, onTotalGamesChange]);

  // Infinite scroll: load more when near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || loadingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        setLoadingMore(true);
        setPage((p) => p + 1);
      }
    };
    const ref = containerRef.current;
    if (ref) {
      ref.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (ref) {
        ref.removeEventListener('scroll', handleScroll);
      }
    };
  }, [loadingMore, hasMore]);

  // Reset loadingMore when new data arrives
  useEffect(() => {
    if (loadingMore) setLoadingMore(false);
  }, [allGames, loadingMore]);


  // Helper: Group games by league, then by date
  const groupGamesByLeagueAndDate = (games: Game[]) => {
    const leagueGroups: { [leagueId: string]: { [date: string]: Game[] } } = {};
    games.forEach((game) => {
      const league = game.leagueId || 'other';
      if (!leagueGroups[league]) leagueGroups[league] = {};
      const dateObj = new Date(game.startTime);
      const dateStr = dateObj.toLocaleDateString(undefined, {
        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
      });
      if (!leagueGroups[league][dateStr]) leagueGroups[league][dateStr] = [];
      leagueGroups[league][dateStr].push(game);
    });
    return leagueGroups;
  };

  // Group games by league and date
  const groupedByLeague = groupGamesByLeagueAndDate(allGames);
  const leagueOrder = ['nba', 'nfl', 'nhl']; // Display order
  const leagueNames: Record<string, string> = {
    nba: 'NBA',
    nfl: 'NFL',
    nhl: 'NHL',
    other: 'Other',
  };

  // Set initial selectedDate to first available date after games load
  useEffect(() => {
    if (!selectedDate && allGames.length > 0) {
      // Find first date from all leagues
      const allDates: string[] = [];
      Object.values(groupGamesByLeagueAndDate(allGames)).forEach(dateGroups => {
        allDates.push(...Object.keys(dateGroups));
      });
      const sortedDates = allDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      if (sortedDates.length > 0) setSelectedDate(sortedDates[0]);
    }
  }, [allGames, selectedDate]);

  // Collect all unique dates from all leagues
  const allDates: string[] = [];
  Object.values(groupedByLeague).forEach(dateGroups => {
    allDates.push(...Object.keys(dateGroups));
  });
  const uniqueSortedDates = Array.from(new Set(allDates)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="space-y-6">
      {isLoading && allGames.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading games...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load games.</p>
        </div>
      ) : allGames.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No games available.</p>
        </div>
      ) : (
        <>
          {/* Single date filter bar for all leagues */}
          <div className="flex gap-2 overflow-x-auto py-2 px-1 bg-background border-b border-border sticky top-0 z-20">
            {uniqueSortedDates.map((dateStr) => (
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
          {/* Single table header for all games */}
          <DesktopGameTableHeader />
          <div className="lg:hidden">
            <MobileGameTableHeader />
          </div>
          {/* Render league dividers, but only games for selectedDate */}
          {leagueOrder.map((leagueId) => (
            groupedByLeague[leagueId] ? (
              <div key={leagueId} className="space-y-4">
                {/* League divider */}
                <div className="py-2 px-4 bg-muted/20 border-b border-border text-base font-semibold text-accent rounded shadow-sm mb-2">
                  {leagueNames[leagueId]}
                </div>
                {/* Only render games for selectedDate */}
                {selectedDate && groupedByLeague[leagueId][selectedDate] ? (
                  <div className="space-y-2">
                    {/* Date divider/header */}
                    <div className="py-2 px-4 bg-muted/10 border-b border-border text-lg font-semibold text-accent sticky top-0 z-10">
                      {selectedDate}
                    </div>
                    {groupedByLeague[leagueId][selectedDate]
                      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                      .map((game, index) => (
                        <div key={game.id}>
                          <div className="hidden lg:block">
                            <ProfessionalGameRow game={game} isFirstInGroup={index === 0} isLastInGroup={index === groupedByLeague[leagueId][selectedDate].length - 1} />
                          </div>
                          <div className="lg:hidden">
                            <CompactMobileGameRow game={game} />
                          </div>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            ) : null
          ))}
          {/* Other leagues if present */}
          {Object.keys(groupedByLeague).filter(lid => !leagueOrder.includes(lid)).map((leagueId) => (
            <div key={leagueId} className="space-y-4">
              <div className="py-2 px-4 bg-muted/20 border-b border-border text-base font-semibold text-accent rounded shadow-sm mb-2">
                {leagueNames[leagueId] || leagueId}
              </div>
              {selectedDate && groupedByLeague[leagueId][selectedDate] ? (
                <div className="space-y-2">
                  <div className="py-2 px-4 bg-muted/10 border-b border-border text-lg font-semibold text-accent sticky top-0 z-10">
                    {selectedDate}
                  </div>
                  {groupedByLeague[leagueId][selectedDate]
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .map((game, index) => (
                      <div key={game.id}>
                        <div className="hidden lg:block">
                          <ProfessionalGameRow game={game} isFirstInGroup={index === 0} isLastInGroup={index === groupedByLeague[leagueId][selectedDate].length - 1} />
                        </div>
                        <div className="lg:hidden">
                          <CompactMobileGameRow game={game} />
                        </div>
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          ))}
          {loadingMore && (
            <div className="text-center py-6">
              <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-muted-foreground text-sm">Loading more games...</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
