import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getBetHistory } from "@/services/api";
import type { PlacedBet } from "@/context/BetHistoryContext";
import type { Bet } from "@/types";

/**
 * Query keys for bet-related queries
 */
export const betQueryKeys = {
  all: ["bets"] as const,
  history: () => [...betQueryKeys.all, "history"] as const,
};

/**
 * Hook to fetch bet history with React Query
 * 
 * Features:
 * - Manual refresh via refetch function for live bet status updates
 * - Returns empty array on authentication errors (graceful degradation)
 * - Retries on network errors with exponential backoff
 * - Refetches on window focus when data is stale (30s)
 * - Waits for session to be fully loaded before fetching
 */
export function useBetHistoryQuery() {
  const { status, data: session } = useSession();
  
  return useQuery({
    queryKey: betQueryKeys.history(),
    queryFn: async () => {
      const data = await getBetHistory();
      return data as PlacedBet[];
    },
    // Only fetch when authenticated AND session has user data
    enabled: status === "authenticated" && !!session?.user?.id,
    // Refetch when user returns to tab (if stale)
    refetchOnWindowFocus: true,
    // Keep data in cache for 5 minutes
    gcTime: 5 * 60 * 1000,
    // Consider data stale after 30 seconds
    staleTime: 30 * 1000,
    // No automatic polling - only refetch on mount, manual refresh, or window focus
    // Retry on network errors but not on auth errors (handled in getBetHistory)
    retry: (failureCount, error) => {
      // Don't retry on auth errors - getBetHistory already handles 401
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      // Retry network errors up to 2 times
      return failureCount < 2;
    },
    // Show network errors but suppress auth errors (gracefully handled)
    throwOnError: false,
  });
}

/**
 * Hook to place a bet with optimistic updates
 */
export function usePlaceBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bets,
      betType,
      totalStake,
      totalPayout,
      totalOdds,
    }: {
      bets: Bet[];
      betType: "single" | "parlay";
      totalStake: number;
      totalPayout: number;
      totalOdds: number;
    }) => {
      if (!bets || bets.length === 0) {
        throw new Error("No bets to place");
      }

      if (betType === "parlay") {
        const res = await fetch("/api/my-bets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": `parlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          },
          body: JSON.stringify({
            gameId: null,
            betType: "parlay",
            legs: bets.map((bet) => ({
              gameId: bet.gameId,
              betType: bet.betType,
              selection: bet.selection,
              odds: bet.odds,
              line: bet.line ?? null,
            })),
            stake: totalStake,
            potentialPayout: totalPayout,
            odds: totalOdds,
            status: "pending",
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error?.message || "Failed to place parlay bet");
        }

        return res.json();
      } else {
        // Place single bets
        const results = [];
        for (const bet of bets) {
          const res = await fetch("/api/my-bets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": `single-${bet.id}-${Date.now()}`,
            },
            body: JSON.stringify({
              gameId: bet.gameId,
              betType: bet.betType,
              selection: bet.selection,
              odds: bet.odds,
              line: bet.line ?? null,
              stake: bet.stake || totalStake,
              potentialPayout: bet.potentialPayout || totalPayout,
              status: "pending",
            }),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error?.message || "Failed to place single bet");
          }

          results.push(await res.json());
        }
        return results;
      }
    },
    // Optimistic update
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: betQueryKeys.history() });

      // Snapshot the previous value
      const previousBets = queryClient.getQueryData(betQueryKeys.history());

      // Optimistically update to the new value
      queryClient.setQueryData(betQueryKeys.history(), (old: PlacedBet[] = []) => {
        const optimisticBets: PlacedBet[] = [];

        if (variables.betType === "parlay") {
          optimisticBets.push({
            id: `optimistic-${Date.now()}`,
            betType: "parlay",
            selection: "parlay",
            odds: variables.totalOdds,
            stake: variables.totalStake,
            potentialPayout: variables.totalPayout,
            status: "pending",
            placedAt: new Date().toISOString(),
            legs: variables.bets.map((bet) => ({
              game: bet.game && bet.game.homeTeam && bet.game.awayTeam
                ? {
                    id: bet.game.id,
                    homeTeam: {
                      id: bet.game.homeTeam.id,
                      name: bet.game.homeTeam.name,
                      shortName: bet.game.homeTeam.shortName,
                      logo: bet.game.homeTeam.logo,
                    },
                    awayTeam: {
                      id: bet.game.awayTeam.id,
                      name: bet.game.awayTeam.name,
                      shortName: bet.game.awayTeam.shortName,
                      logo: bet.game.awayTeam.logo,
                    },
                    league: {
                      id: bet.game.leagueId || '',
                      name: '',
                      logo: '',
                    },
                  }
                : undefined,
              selection: bet.selection,
              odds: bet.odds,
              line: bet.line,
            })),
          });
        } else {
          for (const bet of variables.bets) {
            optimisticBets.push({
              id: `optimistic-${bet.id}`,
              betType: bet.betType,
              selection: bet.selection,
              odds: bet.odds,
              line: bet.line,
              stake: bet.stake || variables.totalStake,
              potentialPayout: bet.potentialPayout || variables.totalPayout,
              status: "pending",
              placedAt: new Date().toISOString(),
              game: bet.game && bet.game.homeTeam && bet.game.awayTeam
                ? {
                    id: bet.game.id,
                    homeTeam: {
                      id: bet.game.homeTeam.id,
                      name: bet.game.homeTeam.name,
                      shortName: bet.game.homeTeam.shortName,
                      logo: bet.game.homeTeam.logo,
                    },
                    awayTeam: {
                      id: bet.game.awayTeam.id,
                      name: bet.game.awayTeam.name,
                      shortName: bet.game.awayTeam.shortName,
                      logo: bet.game.awayTeam.logo,
                    },
                    league: {
                      id: bet.game.leagueId || '',
                      name: '',
                      logo: '',
                    },
                  }
                : undefined,
            });
          }
        }

        return [...optimisticBets, ...old];
      });

      return { previousBets };
    },
    // On error, roll back to the previous value
    onError: (err, variables, context) => {
      if (context?.previousBets) {
        queryClient.setQueryData(betQueryKeys.history(), context.previousBets);
      }
      // The calling component should handle displaying the error to the user
      console.error("Failed to place bet:", err);
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: betQueryKeys.history() });
    },
  });
}
