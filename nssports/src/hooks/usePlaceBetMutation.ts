"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MY_BETS_QUERY_KEY } from "@/hooks/useMyBetsQuery";

type PlaceBetPayload = {
  // mirrors API payloads for single/parlay
  gameId?: string | null;
  betType: "spread" | "moneyline" | "total" | "parlay";
  selection?: "home" | "away" | "over" | "under" | "parlay";
  legs?: Array<{ gameId?: string; betType?: string; selection: string; odds: number; line?: number | null }>;
  odds?: number;
  line?: number | null;
  stake: number;
  potentialPayout: number;
  status?: "pending" | "won" | "lost";
  userId?: string | null;
};

export function usePlaceBetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PlaceBetPayload) => {
      const res = await fetch("/api/my-bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to place bet");
      return res.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch My Bets
      await qc.invalidateQueries({ queryKey: MY_BETS_QUERY_KEY });
    },
  });
}
