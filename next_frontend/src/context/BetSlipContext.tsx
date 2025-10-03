"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from "react";
import { Bet, BetSlip, Game } from "@/types";
import { calculatePayout } from "@/services/api";

interface BetSlipContextType {
  betSlip: BetSlip;
  addBet: (
    game: Game,
    betType: "spread" | "moneyline" | "total",
    selection: "home" | "away" | "over" | "under",
    odds: number,
    line?: number,
  ) => void;
  removeBet: (betId: string) => void;
  updateStake: (betId: string, stake: number) => void;
  setBetType: (betType: "single" | "parlay") => void;
  clearBetSlip: () => void;
}

export const BetSlipContext = createContext<BetSlipContextType | undefined>(
  undefined,
);

export const useBetSlip = () => {
  const context = useContext(BetSlipContext);
  if (context === undefined) {
    throw new Error(
      "useBetSlip must be used within a BetSlipProvider",
    );
  }
  return context;
};

interface BetSlipProviderProps {
  children: ReactNode;
}

const defaultBetSlip: BetSlip = {
  bets: [],
  betType: "single",
  totalStake: 0,
  totalPayout: 0,
  totalOdds: 0,
};

export function BetSlipProvider({ children }: BetSlipProviderProps) {
  const [betSlip, setBetSlip] = useState<BetSlip>(defaultBetSlip);

  const calculateBetSlipTotals = (
    bets: Bet[],
    betType: "single" | "parlay",
  ) => {
    if (bets.length === 0) {
      return { totalStake: 0, totalPayout: 0, totalOdds: 0 };
    }

    if (betType === "single") {
      const totalStake = bets.reduce((sum, bet) => sum + bet.stake, 0);
      const totalPayout = bets.reduce(
        (sum, bet) => sum + bet.potentialPayout,
        0,
      );
      return { totalStake, totalPayout, totalOdds: 0 };
    } else {
      // Parlay calculation
      const totalStake = bets[0]?.stake || 0;
      let combinedOdds = 1;
      
      bets.forEach((bet) => {
        const decimalOdds = bet.odds > 0 
          ? (bet.odds / 100) + 1 
          : (100 / Math.abs(bet.odds)) + 1;
        combinedOdds *= decimalOdds;
      });
      
      const americanOdds = combinedOdds >= 2 
        ? Math.round((combinedOdds - 1) * 100)
        : Math.round(-100 / (combinedOdds - 1));
      
      const totalPayout = totalStake * combinedOdds;
      
      return { totalStake, totalPayout, totalOdds: americanOdds };
    }
  };

  const addBet = useCallback(
    (
      game: Game,
      betType: "spread" | "moneyline" | "total",
      selection: "home" | "away" | "over" | "under",
      odds: number,
      line?: number,
    ) => {
      const betId = `${game.id}-${betType}-${selection}`;
      
      setBetSlip((prev) => {
        const existingBetIndex = prev.bets.findIndex((b) => b.id === betId);
        
        if (existingBetIndex !== -1) {
          // Bet already exists, don't add it again
          return prev;
        }

        const newBet: Bet = {
          id: betId,
          gameId: game.id,
          betType,
          selection,
          odds,
          line,
          stake: 10, // Default stake
          potentialPayout: calculatePayout(10, odds) + 10,
          game,
        };

        const newBets = [...prev.bets, newBet];
        const totals = calculateBetSlipTotals(newBets, prev.betType);

        return {
          ...prev,
          bets: newBets,
          ...totals,
        };
      });
    },
    [],
  );

  const removeBet = useCallback((betId: string) => {
    setBetSlip((prev) => {
      const newBets = prev.bets.filter((b) => b.id !== betId);
      const totals = calculateBetSlipTotals(newBets, prev.betType);
      
      return {
        ...prev,
        bets: newBets,
        ...totals,
      };
    });
  }, []);

  const updateStake = useCallback((betId: string, stake: number) => {
    setBetSlip((prev) => {
      const newBets = prev.bets.map((bet) => {
        if (bet.id === betId) {
          return {
            ...bet,
            stake,
            potentialPayout: calculatePayout(stake, bet.odds) + stake,
          };
        }
        return bet;
      });

      // For parlay, update all bets with the same stake
      if (prev.betType === "parlay") {
        newBets.forEach((bet) => {
          bet.stake = stake;
          bet.potentialPayout = calculatePayout(stake, bet.odds) + stake;
        });
      }

      const totals = calculateBetSlipTotals(newBets, prev.betType);

      return {
        ...prev,
        bets: newBets,
        ...totals,
      };
    });
  }, []);

  const setBetType = useCallback((betType: "single" | "parlay") => {
    setBetSlip((prev) => {
      const totals = calculateBetSlipTotals(prev.bets, betType);
      return {
        ...prev,
        betType,
        ...totals,
      };
    });
  }, []);

  const clearBetSlip = useCallback(() => {
    setBetSlip(defaultBetSlip);
  }, []);

  return (
    <BetSlipContext.Provider
      value={{
        betSlip,
        addBet,
        removeBet,
        updateStake,
        setBetType,
        clearBetSlip,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}
