import PropTypes from "prop-types";
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useActiveBetSlip, useSetActiveBetSlip } from "@/hooks/useApi";
import { Bet, BetSlip, Game, PlayerProp } from "@/types";
import { calculatePayout } from "@/services/mockApi";

interface BetSlipContextType {
  betSlip: BetSlip;
  addBet: (
    game: Game,
    betType:
      | "spread"
      | "moneyline"
      | "total"
      | "player_prop"
      | "period_winner"
      | "quarter_winner"
      | "half_winner",
    selection: "home" | "away" | "over" | "under",
    odds: number,
    line?: number,
    playerProp?: PlayerProp,
    periodOrQuarterOrHalf?: string,
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
      "useBetSlip must be used within a BetSlipProvider. Make sure your component is wrapped in BetSlipProvider.",
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

// Integrate real user ID from AuthContext here when available
const USER_ID = "demo";

export const BetSlipProvider: React.FC<BetSlipProviderProps> = ({
  children,
}) => {
  const { data: remoteBetSlip } = useActiveBetSlip(USER_ID);
  const setRemoteBetSlip = useSetActiveBetSlip();
  const [betSlip, setBetSlip] = useState<BetSlip>(defaultBetSlip);

  // Hydrate from backend only once on mount
  useEffect(() => {
    if (remoteBetSlip) {
      setBetSlip((prev) =>
        prev === defaultBetSlip || prev.bets.length === 0
          ? remoteBetSlip
          : prev,
      );
    }
  }, [remoteBetSlip]);

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
      const totalStake = bets.length > 0 ? bets[0].stake : 0;
      const combinedOdds = bets.reduce((odds, bet) => {
        const decimal =
          bet.odds > 0 ? bet.odds / 100 + 1 : 100 / Math.abs(bet.odds) + 1;
        return odds * decimal;
      }, 1);

      const americanOdds =
        combinedOdds >= 2
          ? Math.round((combinedOdds - 1) * 100)
          : Math.round(-100 / (combinedOdds - 1));

      const totalPayout =
        totalStake + calculatePayout(totalStake, americanOdds);

      return { totalStake, totalPayout, totalOdds: americanOdds };
    }
  };

  // All actions update both local and remote
  const syncAndSet = useCallback(
    async (nextSlip: BetSlip) => {
      setBetSlip(nextSlip);
      await setRemoteBetSlip(USER_ID, nextSlip);
    },
    [setRemoteBetSlip],
  );

  const addBet = (
    game: Game,
    betType:
      | "spread"
      | "moneyline"
      | "total"
      | "player_prop"
      | "period_winner"
      | "quarter_winner"
      | "half_winner",
    selection: "home" | "away" | "over" | "under",
    odds: number,
    line?: number,
    playerProp?: PlayerProp,
    periodOrQuarterOrHalf?: string,
  ) => {
    const betId = playerProp
      ? `${game.id}-${betType}-${playerProp.id}-${selection}`
      : periodOrQuarterOrHalf
        ? `${game.id}-${betType}-${periodOrQuarterOrHalf}-${selection}`
        : `${game.id}-${betType}-${selection}`;
    let filteredBets = betSlip.bets;
    if (betType !== "player_prop") {
      filteredBets = betSlip.bets.filter(
        (bet) =>
          !(
            bet.gameId === game.id &&
            bet.betType === betType &&
            (!periodOrQuarterOrHalf ||
              bet.periodOrQuarterOrHalf !== periodOrQuarterOrHalf)
          ),
      );
    } else {
      filteredBets = betSlip.bets.filter((bet) => bet.id !== betId);
    }
    const newBet: Bet = {
      id: betId,
      gameId: game.id,
      betType,
      selection,
      odds,
      line,
      stake: 10,
      potentialPayout: 10 + calculatePayout(10, odds),
      game,
      periodOrQuarterOrHalf,
      playerProp: playerProp
        ? {
            playerId: playerProp.playerId,
            playerName: playerProp.playerName,
            statType: playerProp.statType,
            category: playerProp.category,
          }
        : undefined,
    };
    const updatedBets = [...filteredBets, newBet];
    const finalBetType = updatedBets.length < 2 ? "single" : betSlip.betType;
    const totals = calculateBetSlipTotals(updatedBets, finalBetType);
    syncAndSet({
      ...betSlip,
      bets: updatedBets,
      betType: finalBetType,
      ...totals,
    });
  };

  const removeBet = (betId: string) => {
    const updatedBets = betSlip.bets.filter((bet) => bet.id !== betId);
    const finalBetType = updatedBets.length < 2 ? "single" : betSlip.betType;
    const totals = calculateBetSlipTotals(updatedBets, finalBetType);
    syncAndSet({
      ...betSlip,
      bets: updatedBets,
      betType: finalBetType,
      ...totals,
    });
  };

  const updateStake = (betId: string, stake: number) => {
    const updatedBets = betSlip.bets.map((bet) => {
      if (bet.id === betId) {
        return {
          ...bet,
          stake,
          potentialPayout: stake + calculatePayout(stake, bet.odds),
        };
      }
      return bet;
    });
    if (betSlip.betType === "parlay") {
      updatedBets.forEach((bet) => {
        bet.stake = stake;
        bet.potentialPayout = stake + calculatePayout(stake, bet.odds);
      });
    }
    const totals = calculateBetSlipTotals(updatedBets, betSlip.betType);
    syncAndSet({ ...betSlip, bets: updatedBets, ...totals });
  };

  const setBetType = (betType: "single" | "parlay") => {
    // Don't allow parlay with less than 2 bets
    if (betType === "parlay" && betSlip.bets.length < 2) {
      return;
    }
    const totals = calculateBetSlipTotals(betSlip.bets, betType);
    syncAndSet({ ...betSlip, betType, ...totals });
  };

  const clearBetSlip = () => {
    syncAndSet(defaultBetSlip);
  };

  const currentBetSlip = betSlip || defaultBetSlip;

  const value: BetSlipContextType = {
    betSlip: currentBetSlip,
    addBet,
    removeBet,
    updateStake,
    setBetType,
    clearBetSlip,
  };

  return (
    <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>
  );
};
BetSlipProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
