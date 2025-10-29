"use client";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getBetHistory } from "@/services/api";
import type { PlacedBet } from "@/context/BetHistoryContext";

export const MY_BETS_QUERY_KEY = ["my-bets"] as const;

export function useMyBetsQuery(options?: UseQueryOptions<PlacedBet[], Error, PlacedBet[], typeof MY_BETS_QUERY_KEY>) {
  const { status } = useSession();
  
  return useQuery<PlacedBet[], Error, PlacedBet[], typeof MY_BETS_QUERY_KEY>({
    queryKey: MY_BETS_QUERY_KEY,
    queryFn: () => getBetHistory() as Promise<PlacedBet[]>,
    // Only fetch when authenticated
    enabled: status === "authenticated",
    // Professional defaults; override via options if needed
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30_000, // 30s
    gcTime: 10 * 60 * 1000, // 10m
    ...options,
  });
}

