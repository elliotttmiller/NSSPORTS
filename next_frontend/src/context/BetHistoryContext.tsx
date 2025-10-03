"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from "react";
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

  const addPlacedBet = useCallback(
    (
      bets: Bet[],
      betType: "single" | "parlay",
      totalStake: number,
      totalPayout: number,
      totalOdds: number,
    ) => {
      const newPlacedBet: PlacedBet = {
        id: `bet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        date: new Date().toISOString(),
        type: betType,
        bets: bets.map((bet) => ({
          id: bet.id,
          gameId: bet.gameId,
          team: bet.selection === "home" 
            ? bet.game.homeTeam.shortName 
            : bet.selection === "away"
            ? bet.game.awayTeam.shortName
            : bet.selection === "over"
            ? "Over"
            : "Under",
          selection: bet.line 
            ? `${bet.betType} ${bet.line > 0 ? "+" : ""}${bet.line}`
            : bet.betType,
          odds: bet.odds,
        })),
        stake: totalStake,
        payout: totalPayout,
        profit: totalPayout - totalStake,
        status: "pending",
        totalOdds: betType === "parlay" ? totalOdds : undefined,
      };

      setPlacedBets((prev) => [newPlacedBet, ...prev]);
    },
    [],
  );

  return (
    <BetHistoryContext.Provider
      value={{
        placedBets,
        addPlacedBet,
      }}
    >
      {children}
    </BetHistoryContext.Provider>
  );
}
