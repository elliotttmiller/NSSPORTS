import React, { useState, useEffect, useCallback, useMemo } from "react";
import { SmoothScrollContainer } from "@/components/VirtualScrolling";
// ...existing code...
import { useNavigation } from "@/context/NavigationContext";
import { Game } from "@/types";
import { getGamesPaginated, PaginatedResponse } from "@/services/mockApi";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { ProfessionalGameRow } from "@/components/ProfessionalGameRow";
import { CompactMobileGameRow } from "@/components/CompactMobileGameRow";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { GameCardSkeleton } from "@/components/ProgressiveLoader";
import { useInfiniteScroll, useSmoothScroll } from "@/hooks/useInfiniteScroll";
import { useIsMobile } from "@/hooks/useIsMobile";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useKV } from "@/hooks/useKV";

// Interface for layout preferences
interface LayoutPreferences {
  viewMode: "fluid" | "compact" | "list";
  sortBy: "time" | "popular" | "odds";
  showExpanded: boolean;
}

const WorkspacePanel = () => {
  const { navigation, setMobilePanel } = useNavigation();
  const isMobile = useIsMobile();

  // State management
  const [games, setGames] = useState<Game[]>([]);
  const [favoriteGames] = useKV<string[]>("favorite-games", []);
  const [layoutPrefs] = useKV<LayoutPreferences>("workspace-layout-prefs", {
    viewMode: "fluid",
    sortBy: "time",
    showExpanded: false,
  });

  const [pagination, setPagination] = useState<
    PaginatedResponse<Game>["pagination"] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  // Remove scrollContainerRef, not needed for SmoothScrollContainer
  const { scrollToTop } = useSmoothScroll();

  const loadMoreRef = useInfiniteScroll({
    hasNextPage: pagination?.hasNextPage ?? false,
    isFetchingNextPage: loading,
    fetchNextPage: () => loadNextPage(),
  });

  const loadGames = useCallback(
    async (page = 1, reset = false) => {
      if (!navigation.selectedLeague) return;

      if (reset) {
        setInitialLoading(true);
        setGames([]);
      } else {
        setLoading(true);
      }

      try {
        const response = await getGamesPaginated(
          navigation.selectedLeague,
          page,
          12,
        );

        if (reset) {
          setGames(response.data);
          setCurrentPage(1);
        } else {
          setGames((prevGames) => [...prevGames, ...response.data]);
          setCurrentPage(page);
        }

        setPagination(response.pagination);
      } catch (error) {
        console.error("Failed to load games:", error);
        toast.error("Failed to load games");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [navigation.selectedLeague],
  );

  const loadNextPage = useCallback(() => {
    if (pagination?.hasNextPage && !loading) {
      loadGames(currentPage + 1, false);
    }
  }, [pagination?.hasNextPage, loading, currentPage, loadGames]);

  useEffect(() => {
    if (navigation.selectedLeague) {
      loadGames(1, true);
    } else {
      setGames([]);
      setPagination(null);
    }
  }, [navigation.selectedLeague, loadGames]);

  // Game interaction handlers
  // ...existing code...

  // Sorting and filtering
  const processedGames = useMemo(() => {
    let processed = [...games];

    // Sort games
    switch (layoutPrefs?.sortBy) {
      case "time":
        processed.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );
        break;
      case "popular":
        // Mock popularity sorting - in real app this would be based on betting volume
        processed.sort(
          (a, b) =>
            (favoriteGames?.includes(b.id) ? 1 : 0) -
            (favoriteGames?.includes(a.id) ? 1 : 0),
        );
        break;
      case "odds":
        // Sort by moneyline favorite
        processed.sort((a, b) => {
          const aFav = Math.min(
            a.odds.moneyline.home.odds,
            a.odds.moneyline.away.odds,
          );
          const bFav = Math.min(
            b.odds.moneyline.home.odds,
            b.odds.moneyline.away.odds,
          );
          return aFav - bFav;
        });
        break;
    }

    return processed;
  }, [games, layoutPrefs, favoriteGames]);

  const handleScrollToTop = () => {
    // Try to find the SmoothScrollContainer by class and scroll to top
    const el = document.querySelector(".universal-responsive-container");
    if (el) {
      scrollToTop(el as HTMLElement);
    }
  };

  // ...existing code...

  // Enhanced loading state with progressive skeletons
  if (initialLoading) {
    return (
      <SmoothScrollContainer
        className={cn("flex-1 min-h-0 h-full universal-responsive-container px-0 sm:px-4")}
        maxHeight="100vh"
        showScrollbar={false}
      >
        <div
          className={cn(
            "pt-2 pb-24 sm:pb-4",
            isMobile ? "px-2 space-y-2" : "mx-4 space-y-0",
          )}
        >
          {!isMobile && (
            // Desktop: Table header skeleton
            <div className="bg-muted/50 border border-border rounded-t-lg mb-0">
              <div className="grid grid-cols-[80px_1fr_120px_120px_120px_50px] gap-4 items-center py-3 px-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-4 bg-muted animate-pulse rounded"
                  ></div>
                ))}
              </div>
            </div>
          )}

          <div
            className={cn(
              !isMobile &&
                "bg-card/30 border border-t-0 border-border rounded-b-lg overflow-hidden",
            )}
          >
            <AnimatePresence>
              {Array.from({ length: 6 }).map((_, index) => (
                <motion.div
                  key={`skeleton-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.1,
                  }}
                  className={cn(
                    isMobile
                      ? "bg-card/40 border border-border rounded-lg p-3 mb-2"
                      : "border-b border-border last:border-b-0",
                  )}
                >
                  {isMobile ? (
                    // Mobile skeleton
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <div className="h-3 bg-muted animate-pulse rounded w-16"></div>
                        <div className="h-3 bg-muted animate-pulse rounded w-12"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                          <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                          <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <div className="h-3 bg-muted animate-pulse rounded w-12 mx-auto"></div>
                          <div className="h-7 bg-muted animate-pulse rounded"></div>
                          <div className="h-7 bg-muted animate-pulse rounded"></div>
                        </div>
                        <div className="space-y-1">
                          <div className="h-3 bg-muted animate-pulse rounded w-8 mx-auto"></div>
                          <div className="h-7 bg-muted animate-pulse rounded"></div>
                          <div className="h-7 bg-muted animate-pulse rounded"></div>
                        </div>
                        <div className="space-y-1">
                          <div className="h-3 bg-muted animate-pulse rounded w-6 mx-auto"></div>
                          <div className="h-7 bg-muted animate-pulse rounded"></div>
                          <div className="h-7 bg-muted animate-pulse rounded"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Desktop skeleton
                    <div className="grid grid-cols-[80px_1fr_120px_120px_120px_50px] gap-4 items-center py-4 px-4">
                      <div className="h-4 bg-muted animate-pulse rounded"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                        <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-8 bg-muted animate-pulse rounded"></div>
                        <div className="h-8 bg-muted animate-pulse rounded"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-8 bg-muted animate-pulse rounded"></div>
                        <div className="h-8 bg-muted animate-pulse rounded"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-8 bg-muted animate-pulse rounded"></div>
                        <div className="h-8 bg-muted animate-pulse rounded"></div>
                      </div>
                      <div className="h-8 w-8 bg-muted animate-pulse rounded mx-auto"></div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </SmoothScrollContainer>
    );
  }

  if (!navigation.selectedLeague || games.length === 0) {
    return (
      <AnimatePresence mode="sync">
        <motion.div
          key="workspacepanel-empty"
          className="h-full flex items-center justify-center bg-background"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center px-4">
            <h3 className="text-lg font-medium text-foreground mb-2">
              Select a League
            </h3>
            <p className="text-muted-foreground mb-4">
              Choose a sport and league to view games and place bets.
            </p>

            {/* Mobile-only: Show button to open sports navigation */}
            {isMobile && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMobilePanel("navigation")}
                  className="rounded-full px-4 py-2 mt-2 shadow-md"
                >
                  Open Sports
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
  <AnimatePresence mode="sync">
      <motion.div
        key="workspacepanel-main"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
        className="h-full w-full flex flex-col bg-background"
      >
        {/* Stats header - hidden on mobile, compact on desktop */}
        <div className="hidden md:grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4 sm:px-8 lg:px-12 py-6 max-w-screen-lg mx-auto">
          <div className="flex flex-col items-center justify-center bg-card/80 border border-border rounded-xl shadow-sm p-6 min-h-[120px]">
            <span className="text-sm text-muted-foreground mb-1">Balance</span>
            <span className="text-2xl font-semibold text-foreground">
              $1,250.00
            </span>
          </div>
          <div className="flex flex-col items-center justify-center bg-card/80 border border-border rounded-xl shadow-sm p-6 min-h-[120px]">
            <span className="text-sm text-muted-foreground mb-1">Win Rate</span>
            <span className="text-2xl font-semibold text-foreground">68%</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-card/80 border border-border rounded-xl shadow-sm p-6 min-h-[120px]">
            <span className="text-sm text-muted-foreground mb-1">Active</span>
            <span className="text-2xl font-semibold text-foreground">0</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-card/80 border border-border rounded-xl shadow-sm p-6 min-h-[120px]">
            <span className="text-sm text-muted-foreground mb-1">
              This Week
            </span>
            <span className="text-2xl font-semibold text-foreground">
              +$340
            </span>
          </div>
        </div>
        {/* Games Container - always fills available height */}
        <div className="flex-1 min-h-0 w-full flex flex-col">
          <SmoothScrollContainer
            className={cn("h-full universal-responsive-container px-0 sm:px-4")}
            showScrollbar={false}
          >
            <div
              className="pt-2 pb-24 sm:pb-4"
              style={{ fontSize: "var(--fluid-base)" }}
            >
              {/* Professional League Header */}
              {navigation.selectedLeague && processedGames.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 mb-0",
                    isMobile ? "rounded-lg mx-2" : "rounded-t-lg mx-4",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* League Logo + Name */}
                      {navigation.selectedLeague === "nfl" && (
                        <img
                          src="/logos/nfl/NFL.svg"
                          alt="NFL logo"
                          className="w-8 h-8 object-contain drop-shadow-md"
                          style={{ minWidth: 32, minHeight: 32 }}
                        />
                      )}
                      {navigation.selectedLeague === "nba" && (
                        <img
                          src="/logos/nba/NBA.svg"
                          alt="NBA logo"
                          className="w-8 h-8 object-contain drop-shadow-md"
                          style={{ minWidth: 32, minHeight: 32 }}
                        />
                      )}
                      {navigation.selectedLeague === "nhl" && (
                        <img
                          src="/logos/nhl/NHL Logo.svg"
                          alt="NHL logo"
                          className="w-8 h-8 object-contain drop-shadow-md"
                          style={{ minWidth: 32, minHeight: 32 }}
                        />
                      )}
                      <h2 className="text-lg font-bold">
                        {navigation.selectedLeague.toUpperCase()}
                      </h2>
                    </div>
                    <div>
                      <p className="text-sm opacity-90">
                        {new Date().toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <div className="text-sm opacity-90">
                        Week {Math.ceil(new Date().getDate() / 7)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Professional Table Header - Desktop Only */}
              {!isMobile && processedGames.length > 0 && (
                <div className="bg-muted/50 border-b border-border mx-4 rounded-none">
                  <div className="grid grid-cols-[80px_1fr_120px_120px_120px_32px] gap-4 items-center py-2 px-4 min-h-[60px] text-sm font-semibold text-muted-foreground">
                    <div className="flex justify-center items-center">TIME</div>
                    <div className="flex justify-center items-center">TEAM</div>
                    <div className="flex justify-center items-center">SPREAD</div>
                    <div className="flex justify-center items-center">TOTAL</div>
                    <div className="flex justify-center items-center">MONEY LINE</div>
                  </div>
                </div>
              )}

              {/* Games Container */}
              {isMobile ? (
                /* Mobile: Compact card layout with header */
                <div className="px-2">
                  {/* Mobile Table Header */}
                  <div className="bg-muted/40 border border-border rounded-t-lg px-3 py-2 mb-2">
                    <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
                      <div>TEAMS</div>
                      <div className="text-center">SPREAD</div>
                      <div className="text-center">TOTAL</div>
                      <div className="text-center">ML</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {processedGames.map((game, index) => (
                        <CompactMobileGameRow
                          key={game.id}
                          game={game}
                          index={index}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                /* Desktop: Professional table layout */
                <div className="bg-card/30 border border-t-0 border-border mx-4 rounded-b-lg overflow-hidden">
                  <AnimatePresence mode="popLayout">
                    {processedGames.map((game, index) => {
                      const currentTime = new Date(
                        game.startTime,
                      ).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      });
                      const prevTime =
                        index > 0
                          ? new Date(
                              processedGames[index - 1].startTime,
                            ).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : null;

                      const showTime = index === 0 || currentTime !== prevTime;
                      const isFirstInGroup = showTime && index > 0;

                      return (
                        <ProfessionalGameRow
                          key={game.id}
                          game={game}
                          isFirstInGroup={isFirstInGroup}
                          showTime={showTime}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Load more trigger */}
              {pagination?.hasNextPage && !loading && (
                <div ref={loadMoreRef} className="h-16 w-full" />
              )}
              {/* End of results indicator */}
              {pagination &&
                !pagination.hasNextPage &&
                processedGames.length > 0 && (
                  <motion.div
                    className="text-center py-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="text-sm text-muted-foreground">
                      End of games list
                    </div>
                  </motion.div>
                )}
              {/* Enhanced loading indicator for infinite scroll */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-4"
                >
                  {/* Show skeleton cards while loading more */}
                  <div className={cn("space-y-2", isMobile ? "px-2" : "mx-4")}>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <motion.div
                        key={`loading-skeleton-${index}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.1,
                        }}
                        className="bg-card/30 border border-border rounded-lg"
                      >
                        {isMobile ? (
                          // Mobile skeleton
                          <div className="p-3 space-y-3">
                            <div className="flex justify-between">
                              <div className="h-3 bg-muted animate-pulse rounded w-16"></div>
                              <div className="h-3 bg-muted animate-pulse rounded w-12"></div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <div className="h-3 bg-muted animate-pulse rounded w-12 mx-auto"></div>
                                <div className="h-7 bg-muted animate-pulse rounded"></div>
                                <div className="h-7 bg-muted animate-pulse rounded"></div>
                              </div>
                              <div className="space-y-1">
                                <div className="h-3 bg-muted animate-pulse rounded w-8 mx-auto"></div>
                                <div className="h-7 bg-muted animate-pulse rounded"></div>
                                <div className="h-7 bg-muted animate-pulse rounded"></div>
                              </div>
                              <div className="space-y-1">
                                <div className="h-3 bg-muted animate-pulse rounded w-6 mx-auto"></div>
                                <div className="h-7 bg-muted animate-pulse rounded"></div>
                                <div className="h-7 bg-muted animate-pulse rounded"></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Desktop skeleton
                          <div className="grid grid-cols-[80px_1fr_120px_120px_120px_50px] gap-4 items-center py-4 px-4">
                            <div className="h-4 bg-muted animate-pulse rounded"></div>
                            <div className="space-y-2">
                              <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                              <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                            </div>
                            <div className="space-y-1">
                              <div className="h-8 bg-muted animate-pulse rounded"></div>
                              <div className="h-8 bg-muted animate-pulse rounded"></div>
                            </div>
                            <div className="space-y-1">
                              <div className="h-8 bg-muted animate-pulse rounded"></div>
                              <div className="h-8 bg-muted animate-pulse rounded"></div>
                            </div>
                            <div className="space-y-1">
                              <div className="h-8 bg-muted animate-pulse rounded"></div>
                              <div className="h-8 bg-muted animate-pulse rounded"></div>
                            </div>
                            <div className="h-8 w-8 bg-muted animate-pulse rounded mx-auto"></div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  {/* Floating loading indicator */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-4 h-4 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                          <div className="absolute inset-0 w-4 h-4 border border-accent/10 rounded-full animate-pulse" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Loading more games...
                        </span>
                        {/* Progressive dots */}
                        <div className="flex space-x-1 ml-2">
                          <motion.div
                            className="w-1 h-1 bg-accent rounded-full"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: 0,
                            }}
                          />
                          <motion.div
                            className="w-1 h-1 bg-accent rounded-full"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: 0.2,
                            }}
                          />
                          <motion.div
                            className="w-1 h-1 bg-accent rounded-full"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: 0.4,
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </div>
          </SmoothScrollContainer>

          {/* Floating Action Button - Scroll to top */}
          <AnimatePresence>
            {processedGames.length > 5 && (
              <motion.div
                className="fixed bottom-20 right-4 z-30 lg:bottom-6"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleScrollToTop}
                  className="rounded-full h-10 w-10 shadow-lg hover:shadow-xl transition-shadow bg-card/90 backdrop-blur-sm border border-border"
                >
                  <CaretUp size={16} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WorkspacePanel;
