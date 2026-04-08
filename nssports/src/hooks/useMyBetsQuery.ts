"use client";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "@/lib/clientAuth";
import { getUserBets } from "@/lib/localDb";
import type { PlacedBet } from "@/context/BetHistoryContext";

export const MY_BETS_QUERY_KEY = ["my-bets"] as const;

export function useMyBetsQuery(options?: Omit<UseQueryOptions<PlacedBet[], Error, PlacedBet[], typeof MY_BETS_QUERY_KEY>, 'queryKey' | 'queryFn'>) {
  const { status, data: session } = useSession();
  
  return useQuery<PlacedBet[], Error, PlacedBet[], typeof MY_BETS_QUERY_KEY>({
    queryKey: MY_BETS_QUERY_KEY,
    queryFn: async () => {
      if (!session?.user?.id) return [];
      return getUserBets(session.user.id) as PlacedBet[];
    },
    enabled: status === "authenticated",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}
