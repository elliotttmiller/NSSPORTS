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
  betType: string;
  selection: string;
  odds: number;
  line?: number;
  stake: number;
  potentialPayout: number;
  status: "pending" | "won" | "lost";
  placedAt?: string;
  settledAt?: string;
  game?: {
    id: string;
    homeTeam: {
      id: string;
      name: string;
      shortName: string;
      logo: string;
    };
    awayTeam: {
      id: string;
      name: string;
      shortName: string;
      logo: string;
    };
    league: {
      id: string;
      name: string;
      logo: string;
    };
  };
  profit?: number;
  legs?: Array<{
    game?: {
      id: string;
      homeTeam: {
        id: string;
        name: string;
        shortName: string;
        logo: string;
      };
      awayTeam: {
        id: string;
        name: string;
        shortName: string;
        logo: string;
      };
      league: {
        id: string;
        name: string;
        logo: string;
      };
    };
    selection: string;
    odds: number;
    line?: number;
  }>;
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

  // Professional addPlacedBet: supports single and parlay bets
  const addPlacedBet = useCallback(
    async (
      bets: Bet[],
      betType: "single" | "parlay",
      totalStake: number,
      totalPayout: number,
      totalOdds: number,
    ) => {
      if (!bets || bets.length === 0) return;
      try {
        if (betType === "parlay") {
          // Parlay: send all legs in one request
          const res = await fetch("/api/my-bets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
          if (!res.ok) throw new Error("Failed to place parlay bet");
        } else {
          // Single: send each bet individually (or just the first)
          for (const bet of bets) {
            const res = await fetch("/api/my-bets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gameId: bet.gameId,
                betType: bet.betType,
                selection: bet.selection,
                odds: bet.odds,
                line: bet.line ?? null,
                stake: bet.stake,
                potentialPayout: bet.potentialPayout,
                status: "pending",
              }),
            });
            if (!res.ok) throw new Error("Failed to place single bet");
          }
        }
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
