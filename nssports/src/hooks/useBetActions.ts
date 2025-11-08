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
      teaserType,
      teaserMetadata,
    }: {
      bets: Bet[];
      betType: "single" | "parlay" | "teaser" | "round_robin" | "if_bet" | "reverse" | "bet_it_all";
      totalStake: number;
      totalPayout: number;
      totalOdds: number;
      teaserType?: string;
      teaserMetadata?: {
        adjustedLines: Record<string, number>;
        originalLines: Record<string, number>;
        pointAdjustment: number;
        pushRule: "push" | "lose" | "revert";
      };
    }) => {
      if (!bets || bets.length === 0) {
        throw new Error("No bets to place");
      }

      if (betType === "teaser") {
        // Handle teaser bets with special action
        if (!teaserType || !teaserMetadata) {
          throw new Error("Teaser type and metadata are required for teaser bets");
        }
        
        const { placeTeaserBetAction } = await import("@/app/actions/bets");
        const result = await placeTeaserBetAction({
          legs: bets.map((bet) => ({
            gameId: bet.gameId,
            betType: bet.betType,
            selection: bet.selection,
            odds: bet.odds,
            line: bet.line ?? null,
            playerProp: bet.playerProp,
            gameProp: bet.gameProp,
          })),
          stake: totalStake,
          potentialPayout: totalPayout,
          odds: totalOdds,
          teaserType: teaserType as 
            | "2T_TEASER"
            | "3T_SUPER_TEASER"
            | "3T_TEASER"
            | "4T_MONSTER_TEASER"
            | "4T_TEASER"
            | "5T_TEASER"
            | "6T_TEASER"
            | "7T_TEASER"
            | "8T_TEASER",
          teaserMetadata: teaserMetadata,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to place teaser bet");
        }

        return result;
      } else if (betType === "parlay") {
        const result = await placeParlayBetAction({
          legs: bets.map((bet) => ({
            gameId: bet.gameId,
            betType: bet.betType,
            selection: bet.selection,
            odds: bet.odds,
            line: bet.line ?? null,
            // ✅ Include player prop and game prop metadata for parlay legs
            playerProp: bet.playerProp,
            gameProp: bet.gameProp,
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
            playerProp: bet.playerProp,
            gameProp: bet.gameProp,
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
