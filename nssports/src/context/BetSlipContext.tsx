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
import { validateBetAddition } from "@/lib/betting-rules";
import { toast } from "sonner";

interface BetSlipContextType {
  betSlip: BetSlip;
  addBet: (
    game: Game,
    betType: "spread" | "moneyline" | "total",
    selection: "home" | "away" | "over" | "under",
    odds: number,
    line?: number,
  ) => void;
  addPlayerPropBet: (
    game: Game,
    propId: string,
    selection: "over" | "under",
    odds: number,
    line: number,
    playerProp: {
      playerId: string;
      playerName: string;
      statType: string;
      category: string;
    }
  ) => void;
  addGamePropBet: (
    game: Game,
    propId: string,
    selection: string,
    odds: number,
    line: number | undefined,
    gameProp: {
      marketCategory: string;
      propType: string;
      description: string;
    }
  ) => void;
  removeBet: (betId: string) => void;
  updateStake: (betId: string, stake: number) => void;
  setBetType: (betType: "single" | "parlay" | "custom") => void;
  clearBetSlip: () => void;
  // Custom mode specific actions
  toggleCustomStraight: (betId: string) => void;
  toggleCustomParlay: (betId: string) => void;
  updateCustomStake: (betId: string, stake: number) => void;
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
  customStraightBets: [],
  customParlayBets: [],
  customStakes: {},
};

export function BetSlipProvider({ children }: BetSlipProviderProps) {
  const [betSlip, setBetSlip] = useState<BetSlip>(defaultBetSlip);

  const calculateBetSlipTotals = (
    bets: Bet[],
    betType: "single" | "parlay" | "custom",
    customStraightBets?: string[],
    customParlayBets?: string[],
    customStakes?: { [betId: string]: number },
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
    } else if (betType === "parlay") {
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
    } else {
      // Custom mode calculation
      let totalStake = 0;
      let totalPayout = 0;
      
      // Calculate straight bets
      customStraightBets?.forEach((betId) => {
        const stake = customStakes?.[betId] || 0;
        const bet = bets.find((b) => b.id === betId);
        if (bet && stake >= 1) { // Only count valid stakes
          totalStake += stake;
          const payout = calculatePayout(stake, bet.odds) + stake;
          totalPayout += payout;
        }
      });
      
      // Calculate parlay if there are any parlay bets
      if (customParlayBets && customParlayBets.length >= 2) {
        const parlayStake = customStakes?.["parlay"] || 0;
        if (parlayStake >= 1) { // Only count valid stakes
          totalStake += parlayStake;
          let combinedOdds = 1;
          
          customParlayBets.forEach((betId) => {
            const bet = bets.find((b) => b.id === betId);
            if (bet) {
              const decimalOdds = bet.odds > 0 
                ? (bet.odds / 100) + 1 
                : (100 / Math.abs(bet.odds)) + 1;
              combinedOdds *= decimalOdds;
            }
          });
          
          const parlayPayout = parlayStake * combinedOdds;
          totalPayout += parlayPayout;
        }
      }
      
      return { totalStake, totalPayout, totalOdds: 0 };
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
          toast.error("This bet is already in your slip");
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

        // Validate betting rules (treat custom as parlay for validation)
        const validationType = prev.betType === "custom" ? "parlay" : prev.betType;
        const violation = validateBetAddition(prev.bets, newBet, validationType);
        if (violation) {
          toast.error(violation.message, {
            description: violation.rule.replace(/_/g, " "),
          });
          return prev;
        }

        const newBets = [...prev.bets, newBet];
        const totals = calculateBetSlipTotals(newBets, prev.betType, prev.customStraightBets, prev.customParlayBets, prev.customStakes);

        // Success toast for parlay mode
        if (prev.betType === "parlay") {
          toast.success("Bet added to parlay");
        }

        return {
          ...prev,
          bets: newBets,
          ...totals,
        };
      });
    },
    [],
  );

  const addPlayerPropBet = useCallback(
    (
      game: Game,
      propId: string,
      selection: "over" | "under",
      odds: number,
      line: number,
      playerProp: {
        playerId: string;
        playerName: string;
        statType: string;
        category: string;
      }
    ) => {
      const betId = `${game.id}-prop-${propId}-${selection}`;
      
      setBetSlip((prev) => {
        const existingBetIndex = prev.bets.findIndex((b) => b.id === betId);
        
        if (existingBetIndex !== -1) {
          toast.error("This bet is already in your slip");
          return prev;
        }

        const newBet: Bet = {
          id: betId,
          gameId: game.id,
          betType: "player_prop",
          selection,
          odds,
          line,
          stake: 10, // Default stake
          potentialPayout: calculatePayout(10, odds) + 10,
          game,
          playerProp,
        };

        // Validate betting rules (treat custom as parlay for validation)
        const validationType = prev.betType === "custom" ? "parlay" : prev.betType;
        const violation = validateBetAddition(prev.bets, newBet, validationType);
        if (violation) {
          toast.error(violation.message, {
            description: violation.rule.replace(/_/g, " "),
          });
          return prev;
        }

        const newBets = [...prev.bets, newBet];
        const totals = calculateBetSlipTotals(newBets, prev.betType, prev.customStraightBets, prev.customParlayBets, prev.customStakes);

        // Success toast for parlay mode
        if (prev.betType === "parlay") {
          toast.success("Bet added to parlay");
        }

        return {
          ...prev,
          bets: newBets,
          ...totals,
        };
      });
    },
    [],
  );

  const addGamePropBet = useCallback(
    (
      game: Game,
      propId: string,
      selection: string,
      odds: number,
      line: number | undefined,
      gameProp: {
        marketCategory: string;
        propType: string;
        description: string;
      }
    ) => {
      const betId = `${game.id}-gameprop-${propId}`;
      
      setBetSlip((prev) => {
        const existingBetIndex = prev.bets.findIndex((b) => b.id === betId);
        
        if (existingBetIndex !== -1) {
          toast.error("This bet is already in your slip");
          return prev;
        }

        const newBet: Bet = {
          id: betId,
          gameId: game.id,
          betType: "game_prop",
          selection,
          odds,
          line,
          stake: 10, // Default stake
          potentialPayout: calculatePayout(10, odds) + 10,
          game,
          gameProp,
        };

        // Validate betting rules (treat custom as parlay for validation)
        const validationType = prev.betType === "custom" ? "parlay" : prev.betType;
        const violation = validateBetAddition(prev.bets, newBet, validationType);
        if (violation) {
          toast.error(violation.message, {
            description: violation.rule.replace(/_/g, " "),
          });
          return prev;
        }

        const newBets = [...prev.bets, newBet];
        const totals = calculateBetSlipTotals(newBets, prev.betType, prev.customStraightBets, prev.customParlayBets, prev.customStakes);

        // Success toast for parlay mode
        if (prev.betType === "parlay") {
          toast.success("Bet added to parlay");
        }

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
      
      // Also remove from custom mode arrays if present
      const customStraightBets = prev.customStraightBets?.filter((id) => id !== betId) || [];
      const customParlayBets = prev.customParlayBets?.filter((id) => id !== betId) || [];
      const customStakes = { ...(prev.customStakes || {}) };
      delete customStakes[betId];
      
      const totals = calculateBetSlipTotals(newBets, prev.betType, customStraightBets, customParlayBets, customStakes);
      
      return {
        ...prev,
        bets: newBets,
        customStraightBets,
        customParlayBets,
        customStakes,
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

      const totals = calculateBetSlipTotals(newBets, prev.betType, prev.customStraightBets, prev.customParlayBets, prev.customStakes);

      return {
        ...prev,
        bets: newBets,
        ...totals,
      };
    });
  }, []);

  const setBetType = useCallback((betType: "single" | "parlay" | "custom") => {
    setBetSlip((prev) => {
      const totals = calculateBetSlipTotals(prev.bets, betType, prev.customStraightBets, prev.customParlayBets, prev.customStakes);
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

  const toggleCustomStraight = useCallback((betId: string) => {
    setBetSlip((prev) => {
      const customStraightBets = prev.customStraightBets || [];
      const isCurrentlyStraight = customStraightBets.includes(betId);
      
      let newStraightBets: string[];
      if (isCurrentlyStraight) {
        // Remove from straight bets
        newStraightBets = customStraightBets.filter((id) => id !== betId);
      } else {
        // Add to straight bets and remove from parlay if present
        newStraightBets = [...customStraightBets, betId];
      }
      
      // Remove from parlay if being added to straight
      const customParlayBets = prev.customParlayBets || [];
      const newParlayBets = isCurrentlyStraight 
        ? customParlayBets 
        : customParlayBets.filter((id) => id !== betId);
      
      // Initialize stake for new straight bet if not exists
      const customStakes = { ...(prev.customStakes || {}) };
      if (!isCurrentlyStraight && !customStakes[betId]) {
        customStakes[betId] = 10; // Default stake
      }
      
      const totals = calculateBetSlipTotals(
        prev.bets, 
        prev.betType, 
        newStraightBets, 
        newParlayBets, 
        customStakes
      );
      
      return {
        ...prev,
        customStraightBets: newStraightBets,
        customParlayBets: newParlayBets,
        customStakes,
        ...totals,
      };
    });
  }, []);

  const toggleCustomParlay = useCallback((betId: string) => {
    setBetSlip((prev) => {
      const customParlayBets = prev.customParlayBets || [];
      const isCurrentlyInParlay = customParlayBets.includes(betId);
      
      let newParlayBets: string[];
      if (isCurrentlyInParlay) {
        // Remove from parlay
        newParlayBets = customParlayBets.filter((id) => id !== betId);
      } else {
        // Add to parlay and remove from straight if present
        newParlayBets = [...customParlayBets, betId];
      }
      
      // Remove from straight if being added to parlay
      const customStraightBets = prev.customStraightBets || [];
      const newStraightBets = isCurrentlyInParlay 
        ? customStraightBets 
        : customStraightBets.filter((id) => id !== betId);
      
      // Initialize parlay stake if not exists
      const customStakes = { ...(prev.customStakes || {}) };
      if (!isCurrentlyInParlay && newParlayBets.length === 1 && !customStakes["parlay"]) {
        customStakes["parlay"] = 10; // Default stake for parlay
      }
      
      const totals = calculateBetSlipTotals(
        prev.bets, 
        prev.betType, 
        newStraightBets, 
        newParlayBets, 
        customStakes
      );
      
      return {
        ...prev,
        customStraightBets: newStraightBets,
        customParlayBets: newParlayBets,
        customStakes,
        ...totals,
      };
    });
  }, []);

  const updateCustomStake = useCallback((betId: string, stake: number) => {
    setBetSlip((prev) => {
      const customStakes = { ...(prev.customStakes || {}), [betId]: stake };
      const totals = calculateBetSlipTotals(
        prev.bets, 
        prev.betType, 
        prev.customStraightBets, 
        prev.customParlayBets, 
        customStakes
      );
      
      return {
        ...prev,
        customStakes,
        ...totals,
      };
    });
  }, []);

  return (
    <BetSlipContext.Provider
      value={{
        betSlip,
        addBet,
        addPlayerPropBet,
        addGamePropBet,
        removeBet,
        updateStake,
        setBetType,
        clearBetSlip,
        toggleCustomStraight,
        toggleCustomParlay,
        updateCustomStake,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}
