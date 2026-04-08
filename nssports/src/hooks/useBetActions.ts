import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBet, updateBalance, getAccount } from "@/lib/localDb";
import type { Bet } from "@/types";
import { betQueryKeys } from "./useBetHistory";
import { ACCOUNT_QUERY_KEY } from "./useAccount";
import { useSession } from "@/lib/clientAuth";

export function usePlaceBetWithActions() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

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
      if (!bets || bets.length === 0) throw new Error("No bets to place");
      
      const userId = session?.user?.id || 'demo-user-id';
      const account = getAccount(userId);
      if (!account || account.balance < totalStake) throw new Error("Insufficient balance");
      
      updateBalance(userId, account.balance - totalStake);

      if (betType === "parlay" || betType === "teaser") {
        return createBet({
          userId,
          betType,
          selection: betType,
          odds: totalOdds,
          stake: totalStake,
          potentialPayout: totalPayout,
          status: "pending",
          teaserType,
          teaserMetadata,
          legs: bets.map(bet => ({
            gameId: bet.gameId,
            betType: bet.betType,
            selection: bet.selection,
            odds: bet.odds,
            line: bet.line,
            game: bet.game,
            playerProp: bet.playerProp,
            gameProp: bet.gameProp,
          })),
        });
      } else {
        const results = [];
        for (const bet of bets) {
          results.push(createBet({
            userId,
            betType: bet.betType,
            selection: bet.selection,
            odds: bet.odds,
            line: bet.line,
            stake: bet.stake || totalStake,
            potentialPayout: bet.potentialPayout || totalPayout,
            status: "pending",
            gameId: bet.gameId,
            game: bet.game,
            playerProp: bet.playerProp,
            gameProp: bet.gameProp,
          }));
        }
        return results;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: betQueryKeys.history() });
      await queryClient.cancelQueries({ queryKey: ACCOUNT_QUERY_KEY });
      return {};
    },
    onError: (err) => {
      console.error("Failed to place bet:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: betQueryKeys.history() });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY });
    },
  });
}
