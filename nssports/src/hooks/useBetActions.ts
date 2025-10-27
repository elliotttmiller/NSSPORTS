/**
 * Client-side hooks for Server Actions
 * 
 * These hooks provide a React Query integration layer for Server Actions,
 * enabling optimistic updates and cache management while using Server Actions
 * for the actual mutations.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeSingleBetAction, placeParlayBetAction, placeBetsAction } from "@/app/actions/bets";
import type { Bet } from "@/types";
import { betQueryKeys } from "./useBetHistory";
import { ACCOUNT_QUERY_KEY } from "./useAccount";

/**
 * Hook to place bets using Server Actions
 * 
 * This replaces the old usePlaceBet mutation that called API routes directly.
 * Now uses Server Actions with automatic cache revalidation via revalidatePath.
 */
export function usePlaceBetWithActions() {
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
        const result = await placeParlayBetAction({
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
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to place parlay bet");
        }

        return result;
      } else {
        // Place single bets
        const results = [];
        for (const bet of bets) {
          const result = await placeSingleBetAction({
            gameId: bet.gameId,
            betType: bet.betType,
            selection: bet.selection,
            odds: bet.odds,
            line: bet.line ?? null,
            stake: bet.stake || totalStake,
            potentialPayout: bet.potentialPayout || totalPayout,
          });

          if (!result.success) {
            throw new Error(result.error || "Failed to place single bet");
          }

          results.push(result);
        }
        return results;
      }
    },
    // Optimistic updates (optional - Server Actions with revalidatePath handle this)
    onSuccess: () => {
      // Invalidate queries to trigger refetch
      // The revalidatePath in Server Actions handles cache invalidation,
      // but we also manually invalidate React Query cache for immediate UI update
      queryClient.invalidateQueries({ queryKey: betQueryKeys.history() });
      
      // Invalidate account data to update balance/available/risk immediately
      queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY });
    },
    onError: (err: Error) => {
      console.error("Failed to place bet:", err);
    },
  });
}

/**
 * Hook to place multiple bets using Server Actions
 * 
 * Used for custom bet slip mode where users can place multiple single bets
 * and/or a parlay bet in one action.
 */
export function usePlaceMultipleBetsWithActions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      singleBets,
      parlayBet,
    }: {
      singleBets?: Array<{
        gameId: string;
        betType: string;
        selection: string;
        odds: number;
        line?: number | null;
        stake: number;
        potentialPayout: number;
      }>;
      parlayBet?: {
        legs: Array<{
          gameId: string;
          betType: string;
          selection: string;
          odds: number;
          line?: number | null;
        }>;
        stake: number;
        potentialPayout: number;
        odds: number;
      };
    }) => {
      const result = await placeBetsAction({
        singleBets,
        parlayBet,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to place bets");
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: betQueryKeys.history() });
      
      // Invalidate account data to update balance/available/risk immediately
      queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY });
    },
    onError: (err: Error) => {
      console.error("Failed to place bets:", err);
    },
  });
}
