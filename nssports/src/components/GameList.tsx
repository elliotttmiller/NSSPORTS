/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { usePaginatedGames, UsePaginatedGamesParams } from '@/hooks/usePaginatedGames';
import { DesktopGameTableHeader } from '@/components/features/games/DesktopGameTableHeader';
import { MobileGameTableHeader } from '@/components/features/games/MobileGameTableHeader';
import { ProfessionalGameRow } from '@/components/features/games/ProfessionalGameRow';
import { CompactMobileGameRow } from '@/components/features/games/CompactMobileGameRow';
import type { Game, PaginatedResponse } from '@/types';

export type GameListProps = Partial<UsePaginatedGamesParams> & {
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

  let games: Game[] = [];
  let pagination: PaginatedResponse<Game>["pagination"] | undefined = undefined;
  if (data && typeof data === 'object' && data !== null) {
    games = (data as { data?: Game[] }).data ?? [];
    pagination = (data as { pagination?: PaginatedResponse<Game>["pagination"] }).pagination;
  }

  useEffect(() => {
    if (games.length > 0) {
      setAllGames((prev) => {
        const ids = new Set(prev.map((g) => g.id));
        return [...prev, ...games.filter((g) => !ids.has(g.id))];
      });
      setHasMore(!!pagination?.hasNextPage);
    }
    if (onTotalGamesChange && pagination?.total !== undefined) {
      onTotalGamesChange(pagination.total);
    }
  }, [JSON.stringify(games), pagination, onTotalGamesChange]);

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

  useEffect(() => {
    if (loadingMore) setLoadingMore(false);
  }, [allGames, loadingMore]);

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

  const groupedByLeague = useMemo(() => groupGamesByLeagueAndDate(allGames), [allGames]);
  const leagueOrder = ['nba', 'nfl', 'nhl'];
  const leagueNames: Record<string, string> = {
    nba: 'NBA',
    nfl: 'NFL',
    nhl: 'NHL',
    other: 'Other',
  };

  useEffect(() => {
    if (!selectedDate && allGames.length > 0) {
      const allDates: string[] = [];
      Object.values(groupGamesByLeagueAndDate(allGames)).forEach(dateGroups => {
        allDates.push(...Object.keys(dateGroups));
      });
      const sortedDates = allDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      if (sortedDates.length > 0) setSelectedDate(sortedDates[0]);
    }
  }, [allGames, selectedDate]);

  const uniqueSortedDates = useMemo(() => {
    const dates: string[] = [];
    Object.values(groupedByLeague).forEach(dateGroups => {
      dates.push(...Object.keys(dateGroups));
    });
    return Array.from(new Set(dates)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [groupedByLeague]);

  return (
    <div className="space-y-6" ref={containerRef}>
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
          </div>
          {/* Single table header for all games */}
          <DesktopGameTableHeader />
          <div className="lg:hidden">
            <MobileGameTableHeader />
          </div>
          {/* Single date header for all games below */}
          {selectedDate && (
            <div className="py-2 px-4 bg-muted/10 border-b border-border text-lg font-semibold text-accent sticky top-0 z-10 mb-2">
              {selectedDate}
            </div>
          )}
          {/* Render league dividers, but only games for selectedDate */}
          {leagueOrder.map((leagueId) => (
            (selectedDate && groupedByLeague[leagueId]?.[selectedDate]?.length) ? (
              <div key={leagueId} className="space-y-4">
                {/* League divider */}
                <div className="py-2 px-4 bg-muted/20 border-b border-border text-base font-semibold text-accent rounded shadow-sm mb-2">
                  {leagueNames[leagueId]}
                </div>
                {/* Only render games for selectedDate */}
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
            ) : null
          ))}
          {/* Other leagues if present */}
          {Object.keys(groupedByLeague)
            .filter(lid => !leagueOrder.includes(lid))
            .filter(lid => selectedDate && groupedByLeague[lid]?.[selectedDate]?.length)
            .map((leagueId) => (
              <div key={leagueId} className="space-y-4">
                <div className="py-2 px-4 bg-muted/20 border-b border-border text-base font-semibold text-accent rounded shadow-sm mb-2">
                  {leagueNames[leagueId] || leagueId}
                </div>
                {groupedByLeague[leagueId][selectedDate!]
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((game, index) => (
                    <div key={game.id}>
                      <div className="hidden lg:block">
                        <ProfessionalGameRow game={game} isFirstInGroup={index === 0} isLastInGroup={index === groupedByLeague[leagueId][selectedDate!].length - 1} />
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
