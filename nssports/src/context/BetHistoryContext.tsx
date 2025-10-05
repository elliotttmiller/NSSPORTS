"use client";

import {
  createContext,
  useContext,
  ReactNode,
} from "react";
import { Bet } from "@/types";
import { useBetHistoryQuery, usePlaceBet } from "@/hooks/useBetHistory";

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
  ) => Promise<void>;
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
  // Use React Query for data fetching
  const { data: placedBets = [], isLoading, refetch } = useBetHistoryQuery();
  const placeBetMutation = usePlaceBet();

  const refreshBetHistory = async () => {
    await refetch();
  };

  // Professional addPlacedBet: supports single and parlay bets with optimistic updates
  const addPlacedBet = async (
    bets: Bet[],
    betType: "single" | "parlay",
    totalStake: number,
    totalPayout: number,
    totalOdds: number,
  ) => {
    await placeBetMutation.mutateAsync({
      bets,
      betType,
      totalStake,
      totalPayout,
      totalOdds,
    });
  };

  return (
    <BetHistoryContext.Provider
      value={{
        placedBets,
        loading: isLoading,
        refreshBetHistory,
        addPlacedBet,
      }}
    >
      {children}
    </BetHistoryContext.Provider>
  );
}
