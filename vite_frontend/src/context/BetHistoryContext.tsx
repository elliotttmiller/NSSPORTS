import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { useBetSlipHistory, useAddBetSlipToHistory } from "@/hooks/useApi";
import { BetSlip } from "@/types";
import PropTypes from "prop-types";

// Integrate real user ID from AuthContext here when available
const USER_ID = "demo";

interface BetHistoryContextType {
  betHistory: BetSlip[];
  refreshHistory: () => void;
  addBetSlipToHistory: (betslipId: string) => Promise<void>;
}

export const BetHistoryContext = createContext<
  BetHistoryContextType | undefined
>(undefined);

interface BetHistoryProviderProps {
  children: ReactNode;
}
export const BetHistoryProvider: React.FC<BetHistoryProviderProps> = ({
  children,
}) => {
  const { data: remoteHistory } = useBetSlipHistory(USER_ID, 20);
  const addRemoteBetSlip = useAddBetSlipToHistory();
  const [betHistory, setBetHistory] = useState<BetSlip[]>([]);

  useEffect(() => {
    if (remoteHistory) setBetHistory(remoteHistory);
  }, [remoteHistory]);

  const refreshHistory = useCallback(() => {
    // Just re-run the hook by updating state (if needed)
    // No-op here, as useBetSlipHistory will update automatically
  }, []);

  const addBetSlipToHistory = useCallback(
    async (betslipId: string) => {
      await addRemoteBetSlip(USER_ID, betslipId);
      // Optionally, you could trigger a refresh here if needed
    },
    [addRemoteBetSlip],
  );

  const value: BetHistoryContextType = {
    betHistory,
    refreshHistory,
    addBetSlipToHistory,
  };

  return (
    <BetHistoryContext.Provider value={value}>
      {children}
    </BetHistoryContext.Provider>
  );
};
BetHistoryProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useBetHistoryContext() {
  const context = useContext(BetHistoryContext);
  if (context === undefined) {
    throw new Error(
      "useBetHistoryContext must be used within a BetHistoryProvider",
    );
  }
  return context;
}
