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
    } catch (error) {
      console.error('Failed to fetch bet history:', error);
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
      if (!bets || bets.length === 0) {
        console.warn('No bets to place');
        return;
      }
      
      try {
        if (betType === "parlay") {
          // Parlay: send all legs in one request
          const res = await fetch("/api/my-bets", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              // Generate idempotency key for duplicate prevention
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
            throw new Error(errorData.error?.message || 'Failed to place parlay bet');
          }
        } else {
          // Single: send each bet individually
          for (const bet of bets) {
            const res = await fetch("/api/my-bets", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                // Generate idempotency key for duplicate prevention
                "Idempotency-Key": `single-${bet.id}-${Date.now()}`,
              },
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
            
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error?.message || 'Failed to place single bet');
            }
          }
        }
        
        // Refresh bet history after successful placement
        await fetchBetHistory();
      } catch (error) {
        console.error('Failed to place bet:', error);
        throw error; // Re-throw so the UI can handle it
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
