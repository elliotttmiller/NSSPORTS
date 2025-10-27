'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { UsePaginatedGamesParams } from '@/hooks/usePaginatedGames';
import { useInfiniteGames } from '@/hooks/useInfiniteGames';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { DesktopGameTableHeader } from '@/components/features/games/DesktopGameTableHeader';
import { MobileGameTableHeader } from '@/components/features/games/MobileGameTableHeader';
import { ProfessionalGameRow } from '@/components/features/games/ProfessionalGameRow';
import { CompactMobileGameRow } from '@/components/features/games/CompactMobileGameRow';
import type { Game } from '@/types';

export type GameListProps = Partial<UsePaginatedGamesParams> & {
  limit?: number;
  onTotalGamesChange?: (total: number) => void;
};

export function GameList({ leagueId, status, limit = 10, onTotalGamesChange }: GameListProps) {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteGames({ leagueId, status, limit });

  const pages = useMemo(() => data?.pages ?? [], [data]);
  const flattenedGames = useMemo(() => pages.flatMap(p => p?.data ?? []), [pages]);

  useEffect(() => {
    // Merge pages uniquely by id
    const ids = new Set<string>();
    const merged: Game[] = [];
    for (const g of flattenedGames) {
      if (!ids.has(g.id)) {
        ids.add(g.id);
        merged.push(g);
      }
    }
    setAllGames(merged);
    // Report total if provided by last page
    const last = pages[pages.length - 1];
    if (onTotalGamesChange && last?.pagination?.total !== undefined) {
      onTotalGamesChange(last.pagination.total);
    }
  }, [flattenedGames, pages, onTotalGamesChange]);

  // IntersectionObserver sentinel to fetch next page
  const onIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(onIntersect, {
      root: null, // viewport; safer default unless a dedicated scroll container is used
      rootMargin: '300px 0px',
      threshold: 0,
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onIntersect]);

  // Ensure passive scroll handlers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const noop = () => {};
    el.addEventListener('wheel', noop, { passive: true });
    el.addEventListener('touchmove', noop, { passive: true });
    return () => {
      el.removeEventListener('wheel', noop as EventListener);
      el.removeEventListener('touchmove', noop as EventListener);
    };
  }, []);

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

  // Always filter out finished games unless status is explicitly 'finished'
  const visibleGames = useMemo(() => {
    if (status === 'finished') {
      return allGames.filter(g => g.status === 'finished');
    }
    // Default: exclude finished games
    return allGames.filter(g => g.status !== 'finished');
  }, [allGames, status]);

  const groupedByLeague = useMemo(() => groupGamesByLeagueAndDate(visibleGames), [visibleGames]);
  const leagueOrder = useMemo(() => ['nba', 'nfl', 'nhl'], []);
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

  // Build a flat list of items for virtualization for the selected date
  type Item =
  | { kind: 'league-header'; key: string; leagueId: string }
  | { kind: 'table-header'; key: string; leagueId: string }
    | { kind: 'game'; key: string; leagueId: string; game: Game };

  const items: Item[] = useMemo(() => {
    if (!selectedDate) return [];
    const out: Item[] = [];

    const pushLeague = (lid: string) => {
      const gamesForDate = groupedByLeague[lid]?.[selectedDate];
      if (!gamesForDate || gamesForDate.length === 0) return;
      out.push({ kind: 'league-header', key: `lh-${lid}`, leagueId: lid });
      // Insert a table header right below the league header
      out.push({ kind: 'table-header', key: `th-${lid}`, leagueId: lid });
      const sorted = [...gamesForDate].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      for (let i = 0; i < sorted.length; i++) {
        out.push({ kind: 'game', key: `g-${lid}-${sorted[i].id}`, leagueId: lid, game: sorted[i] });
      }
    };

    leagueOrder.forEach(pushLeague);
    Object.keys(groupedByLeague)
      .filter((lid) => !leagueOrder.includes(lid))
      .forEach(pushLeague);

    return out;
  }, [groupedByLeague, leagueOrder, selectedDate]);

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: (index) => {
      const it = items[index];
      if (!it) return 80;
      if (it.kind === 'league-header') {
        // Add extra top spacing before non-first league headers for visual separation
        const isFirstHeader = index === 0;
        return isFirstHeader ? 44 : 68; // 44 + ~24px gap
      }
  if (it.kind === 'table-header') return 44;
  return 88; // game rows
    },
    overscan: 4, // smaller overscan for smoother scrolling on mobile/low-end devices
    getItemKey: (index) => items[index]?.key ?? `item-${index}`,
  // Allow dynamic measurement so expanded game cards adjust layout automatically
  measureElement: (el) => el.getBoundingClientRect().height,
  });

  return (
  <div className="space-y-6" ref={containerRef} style={{ scrollBehavior: 'smooth', overscrollBehavior: 'contain' }}>
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
          <div className="flex gap-2 overflow-x-auto py-2 px-1 bg-background border-b border-border sticky top-0 z-20" style={{ willChange: 'scroll-position', WebkitOverflowScrolling: 'touch' }}>
            {uniqueSortedDates.map((dateStr) => (
              <button
                key={dateStr}
                className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all duration-150 ${selectedDate === dateStr ? 'bg-accent text-accent-foreground shadow' : 'bg-muted/10 text-muted-foreground hover:bg-accent/10'}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                {dateStr}
              </button>
            ))}
          </div>
          {/* Date header for selected date */}
          {selectedDate && (
            <div className="py-2 px-4 bg-muted/10 border-b border-border text-lg font-semibold text-accent sticky top-0 z-10 mb-2">
              {selectedDate}
            </div>
          )}
          {/* Virtualized list of league headers + games for selected date */}
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative', contain: 'layout paint size', willChange: 'transform' }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const it = (items as Item[])[vi.index];
              if (!it) return null;
              return (
                <div
                  key={it.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translate3d(0, ${vi.start}px, 0)`,
                    willChange: 'transform',
                  }}
                  data-index={vi.index}
                  // Attach the measure ref so the virtualizer remeasures on size changes
                  ref={virtualizer.measureElement as unknown as React.Ref<HTMLDivElement>}
                >
                  {it.kind === 'league-header' ? (
                    <div className={`py-2 px-4 bg-muted/20 border-b border-border text-base font-semibold text-accent rounded shadow-sm mb-2 ${vi.index === 0 ? '' : 'mt-6'}`}>
                      {leagueNames[it.leagueId] || it.leagueId}
                    </div>
                  ) : it.kind === 'table-header' ? (
                    <>
                      <DesktopGameTableHeader />
                      <div className="lg:hidden">
                        <MobileGameTableHeader />
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className="hidden lg:block">
                        <ProfessionalGameRow
                          game={it.game}
                          isFirstInGroup={false}
                          isLastInGroup={false}
                        />
                      </div>
                      <div className="lg:hidden">
                        <CompactMobileGameRow game={it.game} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {isFetchingNextPage && (
            <div className="text-center py-6">
              <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-muted-foreground text-sm">Loading more games...</p>
            </div>
          )}
        </>
      )}
      {/* Sentinel for infinite loading */}
      <div ref={sentinelRef} aria-hidden="true" />
    </div>
  );
}
