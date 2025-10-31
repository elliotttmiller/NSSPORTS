"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Bet } from "@/types";
import { useBetHistoryQuery } from "@/hooks/useBetHistory";
import { usePlaceBetWithActions } from "@/hooks/useBetActions";
import { toast } from "sonner";

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
  playerProp?: {
    playerId: string;
    playerName: string;
    statType: string;
    category: string;
  };
  gameProp?: {
    propType: string;
    description: string;
    marketCategory: string;
  };
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
    betType?: string;
    playerProp?: {
      playerId: string;
      playerName: string;
      statType: string;
      category: string;
    };
    gameProp?: {
      propType: string;
      description: string;
      marketCategory: string;
    };
  }>;
}

type BetHistoryContextType = {
  placedBets: PlacedBet[];
  loading: boolean;
  refreshBetHistory: () => Promise<void>;
  addPlacedBet: (
    bets: Bet[],
    betType: "single" | "parlay" | "teaser",
    totalStake: number,
    totalPayout: number,
    totalOdds: number,
    teaserType?: string,
    teaserMetadata?: {
      adjustedLines: Record<string, number>;
      originalLines: Record<string, number>;
      pointAdjustment: number;
      pushRule: "push" | "lose" | "revert";
    }
  ) => Promise<void>;
};

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
  const { data: placedBets = [], isLoading, refetch, error } = useBetHistoryQuery();
  const placeBetMutation = usePlaceBetWithActions();

  // Global error handling: Show toast notification for fetch errors
  useEffect(() => {
    if (error && !(error instanceof Error && error.message.includes('401'))) {
      // Only show toast for non-auth errors (auth errors are gracefully handled)
      toast.error("Failed to load bet history", {
        description: "Please check your connection and try again.",
        duration: 5000,
      });
    }
  }, [error]);

  const refreshBetHistory = async () => {
    await refetch();
  };

  // Professional addPlacedBet: supports single, parlay and teaser bets with optimistic updates
  const addPlacedBet = async (
    bets: Bet[],
    betType: "single" | "parlay" | "teaser",
    totalStake: number,
    totalPayout: number,
    totalOdds: number,
    teaserType?: string,
    teaserMetadata?: {
      adjustedLines: Record<string, number>;
      originalLines: Record<string, number>;
      pointAdjustment: number;
      pushRule: "push" | "lose" | "revert";
    }
  ) => {
    await placeBetMutation.mutateAsync({
      bets,
      betType,
      totalStake,
      totalPayout,
      totalOdds,
      teaserType,
      teaserMetadata,
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
