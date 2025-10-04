"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
} from "react";
import { getBetHistory } from "@/services/api";
import { Bet } from "@/types";

export interface PlacedBet {
  id: string;
  date: string;
  type: "single" | "parlay";
  bets: Array<{
    id: string;
    gameId: string;
    team: string;
    selection: string;
    odds: number;
  }>;
  stake: number;
  payout: number;
  profit: number;
  status: "pending" | "won" | "lost";
  totalOdds?: number;
}

interface BetHistoryContextType {
  placedBets: PlacedBet[];
    loading: boolean;
    refreshBetHistory: () => Promise<void>;
    addPlacedBet: (
      bets: Bet[],
      betType: "single" | "parlay",
      totalStake: number,
      totalPayout: number,
      totalOdds: number,
    ) => void;
}

export const BetHistoryContext = createContext<BetHistoryContextType | undefined>(
  undefined,
);

export const useBetHistory = () => {
  const context = useContext(BetHistoryContext);
  if (context === undefined) {
    throw new Error(
      "useBetHistory must be used within a BetHistoryProvider",
    );
  }
  return context;
};

interface BetHistoryProviderProps {
  children: ReactNode;
}

export function BetHistoryProvider({ children }: BetHistoryProviderProps) {
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBetHistory = useCallback(async () => {
    setLoading(true);
    try {
      const bets = await getBetHistory();
      setPlacedBets(bets as PlacedBet[]);
    } catch {
      setPlacedBets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBetHistory();
  }, [fetchBetHistory]);

  // Placeholder for addPlacedBet, will be API-driven in next step
  const addPlacedBet = useCallback(
    async (
      bets: Bet[],
      betType: "single" | "parlay",
      totalStake: number,
      totalPayout: number,
    ) => {
      // Only single bet supported by backend currently
      if (!bets || bets.length === 0) return;
      const bet = bets[0];
      try {
        const res = await fetch("/api/my-bets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: bet.gameId,
            betType: bet.betType,
            selection: bet.selection,
            odds: bet.odds,
            line: bet.line ?? null,
            stake: totalStake,
            potentialPayout: totalPayout,
            status: "pending",
            // userId: ... (add if available)
          }),
        });
        if (!res.ok) throw new Error("Failed to place bet");
        await fetchBetHistory();
      } catch {
        // Optionally handle error (e.g., toast)
      }
    },
  [fetchBetHistory],
  );

  return (
    <BetHistoryContext.Provider
      value={{
        placedBets,
        loading,
        refreshBetHistory: fetchBetHistory,
        addPlacedBet,
      }}
    >
      {children}
    </BetHistoryContext.Provider>
  );
}
