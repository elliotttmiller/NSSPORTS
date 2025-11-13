'use client';

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { UsePaginatedGamesParams } from '@/hooks/usePaginatedGames';
import { useInfiniteGames } from '@/hooks/useInfiniteGames';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { DesktopGameTableHeader } from '@/components/features/games/DesktopGameTableHeader';
import { MobileGameTableHeader } from '@/components/features/games/MobileGameTableHeader';
import { MemoizedProfessionalGameRow as ProfessionalGameRow } from '@/components/features/games/ProfessionalGameRow';
import { CompactMobileGameRow } from '@/components/features/games/CompactMobileGameRow';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { useGameTransitions } from '@/hooks/useGameTransitions';
import type { Game } from '@/types';

export type GameListProps = Partial<UsePaginatedGamesParams> & {
  limit?: number;
  onTotalGamesChange?: (total: number) => void;
  bypassCache?: boolean; // Force fresh data from SDK (for manual refresh)
  onRefreshReady?: (refreshFn: () => Promise<void>) => void; // Callback to expose refresh function to parent
  onSportFilterChange?: (sport: string | undefined) => void; // Callback when sport filter changes (for parent-managed filters)
  showDateFilterInHeader?: boolean; // Show date filter inline with league headers
};

// ⭐ MEMOIZED: League header to prevent re-renders
const LeagueHeader = memo(({ leagueName, isFirst }: { leagueName: string; isFirst: boolean }) => (
  <div className={`py-2 px-4 bg-muted/20 border-b border-border text-base font-semibold text-accent rounded shadow-sm mb-2 text-left ${isFirst ? '' : 'mt-6'}`}>
    {leagueName}
  </div>
));
LeagueHeader.displayName = 'LeagueHeader';

// ⭐ MEMOIZED: League header with inline date filter
const LeagueHeaderWithDateFilter = memo(({ 
  leagueName, 
  isFirst,
  dates,
  selectedDate,
  onDateSelect,
  onRefresh,
  isRefreshing
}: { 
  leagueName: string; 
  isFirst: boolean;
  dates: string[];
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
}) => (
  <div className={`${isFirst ? '' : 'mt-6'}`}>
    <div className="flex items-center justify-between gap-4 py-2 px-4 bg-muted/20 border-b border-border rounded shadow-sm mb-2">
      <div className="text-base font-semibold text-accent">{leagueName}</div>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        <div className="shrink-0">
          <RefreshButton onRefresh={onRefresh} isLoading={isRefreshing} />
        </div>
        {dates.map((dateStr) => (
          <DateFilterButton
            key={dateStr}
            dateStr={dateStr}
            isSelected={selectedDate === dateStr}
            onClick={() => onDateSelect(dateStr)}
          />
        ))}
      </div>
    </div>
  </div>
));
LeagueHeaderWithDateFilter.displayName = 'LeagueHeaderWithDateFilter';

// ⭐ MEMOIZED: Date filter button to prevent re-renders
const DateFilterButton = memo(({ 
  dateStr, 
  isSelected, 
  onClick 
}: { 
  dateStr: string; 
  isSelected: boolean; 
  onClick: () => void;
}) => (
  <button
    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 ${
      isSelected 
        ? 'bg-accent text-accent-foreground shadow-md' 
        : 'bg-muted/10 text-muted-foreground hover:bg-accent/10'
    }`}
    onClick={onClick}
  >
    {dateStr}
  </button>
));
DateFilterButton.displayName = 'DateFilterButton';

export function GameList({ leagueId, status, limit = 10, onTotalGamesChange, bypassCache = false, onRefreshReady, onSportFilterChange, showDateFilterInHeader = false }: GameListProps) {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useInfiniteGames({ 
    leagueId, 
    status, 
    limit,
    bypassCache 
  });

  const pages = useMemo(() => data?.pages ?? [], [data]);
  const flattenedGames = useMemo(() => pages.flatMap(p => p?.data ?? []), [pages]);

  // Manual refresh handler - forces cache bypass
  const handleRefresh = useCallback(async () => {
    console.log('[GameList] 🔄 Refreshing with cache bypass for fresh odds');
    await refetch();
  }, [refetch]);

  // Expose refresh function to parent component
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(handleRefresh);
    }
  }, [onRefreshReady, handleRefresh]);

  // isRefreshing is true when refetching but we already have data
  const isRefreshing = isRefetching && allGames.length > 0;

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

  // ⭐ MEMOIZED: Group games by league and date - expensive operation
  const groupGamesByLeagueAndDate = useCallback((games: Game[]) => {
    const leagueGroups: { [leagueId: string]: { [date: string]: Game[] } } = {};
    games.forEach((game) => {
      // Use official uppercase league IDs from SportsGameOdds API (NBA, NFL, NHL)
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
  }, []);

  // Always filter out finished games unless status is explicitly 'finished'
  const visibleGames = useMemo(() => {
    if (status === 'finished') {
      return allGames.filter(g => g.status === 'finished');
    }
    // Default: exclude finished games (never show historical)
    return allGames.filter(g => g.status !== 'finished');
  }, [allGames, status]);

  // ⭐ Game Transition Hook: Monitor status changes and auto-migrate games
  // - Upcoming → Live: Remove from /games pages, will appear on /live page
  // - Live → Finished: Remove from all pages (never show historical)
  const { shouldShowInCurrentContext } = useGameTransitions(visibleGames, 'upcoming');

  // Filter games based on context (upcoming games only for /games pages)
  const contextFilteredGames = useMemo(() => {
    return visibleGames.filter(game => shouldShowInCurrentContext(game, 'upcoming'));
  }, [visibleGames, shouldShowInCurrentContext]);

  // ⭐ Extract unique sports from games with counts (BEFORE sport filtering)
  // Now correlated with selected date - only show leagues that have games on that date
  const availableSports = useMemo(() => {
    const sportCounts = new Map<string, number>();
    
    // If no date selected, count all games
    if (!selectedDate) {
      contextFilteredGames.forEach(game => {
        if (game.leagueId) {
          sportCounts.set(game.leagueId, (sportCounts.get(game.leagueId) || 0) + 1);
        }
      });
    } else {
      // Only count games on the selected date
      const groupedByLeague = groupGamesByLeagueAndDate(contextFilteredGames);
      Object.entries(groupedByLeague).forEach(([leagueId, dateGroups]) => {
        const gamesOnDate = dateGroups[selectedDate];
        if (gamesOnDate && gamesOnDate.length > 0) {
          sportCounts.set(leagueId, gamesOnDate.length);
        }
      });
    }
    
    const totalGamesForDate = Array.from(sportCounts.values()).reduce((sum, count) => sum + count, 0);
    
    const sports = [
      { name: "all", count: totalGamesForDate },
      ...Array.from(sportCounts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, count]) => ({ name, count }))
    ];
    
    return sports;
  }, [contextFilteredGames, selectedDate, groupGamesByLeagueAndDate]);
  
  // ⭐ Apply sport filter AFTER extracting available sports
  const sportFilteredGames = useMemo(() => {
    if (leagueId) {
      // If parent component passed leagueId, use that (e.g., individual league pages)
      return contextFilteredGames;
    }
    // Otherwise use local sport filter state
    return selectedSport === "all" 
      ? contextFilteredGames 
      : contextFilteredGames.filter(game => game.leagueId === selectedSport);
  }, [contextFilteredGames, selectedSport, leagueId]);
  
  // Notify parent when sport filter changes
  useEffect(() => {
    if (onSportFilterChange && !leagueId) {
      // Only notify if parent wants updates and we're not already filtering by leagueId
      onSportFilterChange(selectedSport === "all" ? undefined : selectedSport);
    }
  }, [selectedSport, onSportFilterChange, leagueId]);

  const groupedByLeague = useMemo(() => groupGamesByLeagueAndDate(sportFilteredGames), [sportFilteredGames, groupGamesByLeagueAndDate]);
  // Use official uppercase league IDs per SportsGameOdds API specification
  const leagueOrder = useMemo(() => ['NBA', 'NCAAB', 'NFL', 'NCAAF', 'NHL'], []);
  const leagueNames: Record<string, string> = useMemo(() => ({
    NBA: 'NBA',
    NCAAB: 'NCAA Basketball',
    NFL: 'NFL',
    NCAAF: 'NCAA Football',
    NHL: 'NHL',
    other: 'Other',
  }), []);

  useEffect(() => {
    if (!selectedDate && sportFilteredGames.length > 0) {
      const allDates: string[] = [];
      Object.values(groupGamesByLeagueAndDate(sportFilteredGames)).forEach(dateGroups => {
        allDates.push(...Object.keys(dateGroups));
      });
      const sortedDates = allDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      if (sortedDates.length > 0) setSelectedDate(sortedDates[0]);
    }
  }, [sportFilteredGames, selectedDate, groupGamesByLeagueAndDate]);
  
  // ⭐ Auto-select first available date when sport filter changes
  useEffect(() => {
    if (sportFilteredGames.length > 0) {
      const allDates: string[] = [];
      Object.values(groupGamesByLeagueAndDate(sportFilteredGames)).forEach(dateGroups => {
        allDates.push(...Object.keys(dateGroups));
      });
      const sortedDates = allDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      
      // If current selected date doesn't exist in filtered games, select first available date
      if (sortedDates.length > 0 && !sortedDates.includes(selectedDate || '')) {
        setSelectedDate(sortedDates[0]);
      }
    }
  }, [sportFilteredGames, selectedDate, groupGamesByLeagueAndDate]);

  // ⭐ NEW: Smart sport filter reset when date changes
  // If selected sport has no games on the new date, reset to "all"
  useEffect(() => {
    if (!selectedDate || selectedSport === "all") return;
    
    const sportHasGamesOnDate = availableSports.some(
      sport => sport.name === selectedSport && sport.count > 0
    );
    
    if (!sportHasGamesOnDate) {
      console.log(`[GameList] Selected sport "${selectedSport}" has no games on ${selectedDate}, resetting to "all"`);
      setSelectedSport("all");
    }
  }, [selectedDate, selectedSport, availableSports]);

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
      {/* Show loading indicator for initial load OR during pull-to-refresh */}
      {(isLoading && allGames.length === 0) || isRefreshing ? (
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
          {/* Sport/League Filter - Compact version with date correlation */}
          {!leagueId && availableSports.length > 0 && (
            <div className="mb-2">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1.5 snap-x snap-mandatory px-1">
                {availableSports.map((sport) => {
                  const isSelected = selectedSport === sport.name;
                  const sportLabel = sport.name === "all" ? "All Sports" : sport.name.toUpperCase();
                  const hasGames = sport.count > 0;
                  
                  return (
                    <button
                      key={sport.name}
                      onClick={() => setSelectedSport(sport.name)}
                      disabled={!hasGames && sport.name !== "all"}
                      className={`
                        snap-start shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                        transition-all duration-300 ease-out
                        touch-action-manipulation active:scale-95
                        flex items-center gap-1.5
                        ${!hasGames && sport.name !== "all"
                          ? 'opacity-40 cursor-not-allowed bg-muted/20 text-muted-foreground/50'
                          : isSelected 
                            ? 'bg-accent text-accent-foreground shadow-md scale-105' 
                            : 'bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground border border-border/30'
                        }
                      `}
                    >
                      <span>{sportLabel}</span>
                      <span className={`
                        inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold
                        ${!hasGames && sport.name !== "all"
                          ? 'bg-muted/10 text-muted-foreground/40'
                          : isSelected 
                            ? 'bg-accent-foreground/20 text-accent-foreground' 
                            : 'bg-accent/10 text-accent'
                        }
                      `}>
                        {sport.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedDate && (
                <p className="text-xs text-muted-foreground mt-2 px-1">
                  Showing games for {selectedDate}
                </p>
              )}
            </div>
          )}
          
          {/* No games message for selected sport */}
          {sportFilteredGames.length === 0 && selectedSport !== "all" && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No {selectedSport.toUpperCase()} games available.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try selecting a different sport or view all sports
              </p>
              <button
                onClick={() => setSelectedSport("all")}
                className="mt-4 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                View All Sports
              </button>
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
                    showDateFilterInHeader && vi.index === 0 ? (
                      <LeagueHeaderWithDateFilter
                        leagueName={leagueNames[it.leagueId] || it.leagueId}
                        isFirst={true}
                        dates={uniqueSortedDates}
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        onRefresh={handleRefresh}
                        isRefreshing={isRefreshing}
                      />
                    ) : (
                      <LeagueHeader 
                        leagueName={leagueNames[it.leagueId] || it.leagueId}
                        isFirst={vi.index === 0}
                      />
                    )
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
