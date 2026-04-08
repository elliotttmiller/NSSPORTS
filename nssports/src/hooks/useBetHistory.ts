import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/clientAuth";
import { getUserBets } from "@/lib/localDb";
import type { PlacedBet } from "@/context/BetHistoryContext";
import type { Bet } from "@/types";

export const betQueryKeys = {
  all: ["bets"] as const,
  history: () => [...betQueryKeys.all, "history"] as const,
};

export function useBetHistoryQuery() {
  const { status, data: session } = useSession();
  
  return useQuery({
    queryKey: betQueryKeys.history(),
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const bets = getUserBets(session.user.id);
      return bets as PlacedBet[];
    },
    enabled: status === "authenticated" && !!session?.user?.id,
    refetchOnWindowFocus: true,
    gcTime: 5 * 60 * 1000,
    staleTime: 30 * 1000,
    retry: false,
    throwOnError: false,
  });
}

export function usePlaceBet() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

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
      if (!bets || bets.length === 0) throw new Error("No bets to place");
      const { createBet, updateBalance, getAccount } = await import("@/lib/localDb");
      const userId = session?.user?.id || 'demo-user-id';
      
      const account = getAccount(userId);
      if (!account || account.balance < totalStake) throw new Error("Insufficient balance");
      
      updateBalance(userId, account.balance - totalStake);
      
      if (betType === "parlay") {
        return createBet({
          userId,
          betType: "parlay",
          selection: "parlay",
          odds: totalOdds,
          stake: totalStake,
          potentialPayout: totalPayout,
          status: "pending",
          legs: bets.map(bet => ({
            gameId: bet.gameId,
            betType: bet.betType,
            selection: bet.selection,
            odds: bet.odds,
            line: bet.line,
            game: bet.game,
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
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: betQueryKeys.history() });
      const previousBets = queryClient.getQueryData(betQueryKeys.history());
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
              game: bet.game && bet.game.homeTeam && bet.game.awayTeam ? {
                id: bet.game.id,
                homeTeam: { id: bet.game.homeTeam.id, name: bet.game.homeTeam.name, shortName: bet.game.homeTeam.shortName, logo: bet.game.homeTeam.logo },
                awayTeam: { id: bet.game.awayTeam.id, name: bet.game.awayTeam.name, shortName: bet.game.awayTeam.shortName, logo: bet.game.awayTeam.logo },
                league: { id: bet.game.leagueId || '', name: '', logo: '' },
              } : undefined,
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
              game: bet.game && bet.game.homeTeam && bet.game.awayTeam ? {
                id: bet.game.id,
                homeTeam: { id: bet.game.homeTeam.id, name: bet.game.homeTeam.name, shortName: bet.game.homeTeam.shortName, logo: bet.game.homeTeam.logo },
                awayTeam: { id: bet.game.awayTeam.id, name: bet.game.awayTeam.name, shortName: bet.game.awayTeam.shortName, logo: bet.game.awayTeam.logo },
                league: { id: bet.game.leagueId || '', name: '', logo: '' },
              } : undefined,
            });
          }
        }
        return [...optimisticBets, ...old];
      });
      return { previousBets };
    },
    onError: (err, _variables, context) => {
      if (context?.previousBets) {
        queryClient.setQueryData(betQueryKeys.history(), context.previousBets);
      }
      console.error("Failed to place bet:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: betQueryKeys.history() });
    },
  });
}
