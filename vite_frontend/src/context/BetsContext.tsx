import PropTypes from "prop-types";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useBets, useSetBets } from "@/hooks/useApi";
import { Bet } from "@/types";

// Integrate real user ID from AuthContext here when available
const USER_ID = "demo";

interface BetsContextType {
  bets: Bet[];
  refreshBets: () => Promise<void>;
  addBet: (bet: Bet) => Promise<void>;
  updateBet: (betId: string, bet: Partial<Bet>) => Promise<void>;
  deleteBet: (betId: string) => Promise<void>;
}

export const BetsContext = createContext<BetsContextType | undefined>(
  undefined,
);

interface BetsProviderProps {
  children: ReactNode;
}
export const BetsProvider: React.FC<BetsProviderProps> = ({ children }) => {
  // Fetch all active bets for the user
  const { data: betsRaw, refetch: refetchBets } = useBets(USER_ID);
  const [bets, setLocalBets] = useState<Bet[]>(
    Array.isArray(betsRaw) ? betsRaw : [],
  );
  const setBets = useSetBets();

  // Keep local bets in sync with remote
  useEffect(() => {
    if (Array.isArray(betsRaw)) setLocalBets(betsRaw);
  }, [betsRaw]);

  // Refresh bets by triggering hook refetch
  const refreshBets = useCallback(async () => {
    try {
      if (refetchBets) {
        await refetchBets();
      } else {
        // Fallback to direct fetch if refetch not available
        const res = await fetch("/api/v1/redis/bets/" + USER_ID, {
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        });
        if (res.ok) {
          const json = await res.json();
          // Backend returns { success: true, data: [...] }, extract the data
          const data = json.success ? json.data : json;
          if (Array.isArray(data)) setLocalBets(data);
        }
      }
    } catch (error) {
      console.error("Failed to refresh bets:", error);
    }
  }, [refetchBets]);

  const addBet = useCallback(
    async (bet: Bet) => {
      setLocalBets((currentBets) => {
        const updatedBets: Bet[] = [...currentBets, bet];
        setBets(USER_ID, updatedBets);
        return updatedBets;
      });
      await refreshBets();
    },
    [setBets, refreshBets],
  );

  const updateBet = useCallback(
    async (betId: string, bet: Partial<Bet>) => {
      setLocalBets((currentBets) => {
        const updatedBets: Bet[] = currentBets.map((b: Bet) =>
          b.id === betId ? { ...b, ...bet } : b,
        );
        setBets(USER_ID, updatedBets);
        return updatedBets;
      });
      await refreshBets();
    },
    [setBets, refreshBets],
  );

  const deleteBet = useCallback(
    async (betId: string) => {
      setLocalBets((currentBets) => {
        const updatedBets: Bet[] = currentBets.filter(
          (b: Bet) => b.id !== betId,
        );
        setBets(USER_ID, updatedBets);
        return updatedBets;
      });
      await refreshBets();
    },
    [setBets, refreshBets],
  );

  const value: BetsContextType = {
    bets,
    refreshBets,
    addBet,
    updateBet,
    deleteBet,
  };

  return <BetsContext.Provider value={value}>{children}</BetsContext.Provider>;
};
BetsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useBetsContext() {
  const context = useContext(BetsContext);
  if (context === undefined) {
    throw new Error("useBetsContext must be used within a BetsProvider.");
  }
  return context;
}
