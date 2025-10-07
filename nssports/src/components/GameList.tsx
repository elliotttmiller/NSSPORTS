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


  // Helper: Group games by date string (e.g., 'Tuesday, Oct 7')
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

  // Group and sort games
  const groupedGames = groupGamesByDate(allGames);
  const sortedDates = Object.keys(groupedGames).sort((a, b) => {
    // Sort by actual date value
    return new Date(groupedGames[a][0].startTime).getTime() - new Date(groupedGames[b][0].startTime).getTime();
  });

  // Filter games by selected date
  const filteredDates = selectedDate ? [selectedDate] : sortedDates;

  return (
    <div className="space-y-3">
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
          {/* Horizontal date tabs bar */}
          <div className="flex gap-2 overflow-x-auto py-2 px-1 bg-background border-b border-border sticky top-0 z-20">
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

          <DesktopGameTableHeader />
          <div className="lg:hidden">
            <MobileGameTableHeader />
          </div>
          {filteredDates.map((dateStr) => (
            <div key={dateStr} className="space-y-2">
              {/* Date divider/header */}
              <div className="py-2 px-4 bg-muted/10 border-b border-border text-lg font-semibold text-accent sticky top-0 z-10">
                {dateStr}
              </div>
              {/* Games for this date, sorted by time */}
              {groupedGames[dateStr]
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map((game, index) => (
                  <div key={game.id}>
                    <div className="hidden lg:block">
                      <ProfessionalGameRow game={game} isFirstInGroup={index === 0} isLastInGroup={index === groupedGames[dateStr].length - 1} />
                    </div>
                    <div className="lg:hidden">
                      <CompactMobileGameRow game={game} />
                    </div>
                  </div>
                ))}
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
