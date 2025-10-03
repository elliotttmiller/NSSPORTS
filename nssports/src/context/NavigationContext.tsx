"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from "react";

interface NavigationContextType {
  sideNavOpen: boolean;
  betSlipOpen: boolean;
  toggleSideNav: () => void;
  toggleBetSlip: () => void;
  setSideNavOpen: (open: boolean) => void;
  setBetSlipOpen: (open: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error(
      "useNavigation must be used within a NavigationProvider"
    );
  }
  return context;
}

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [betSlipOpen, setBetSlipOpen] = useState(true); // BetSlip open by default on desktop

  const toggleSideNav = useCallback(() => {
    setSideNavOpen((prev) => !prev);
  }, []);

  const toggleBetSlip = useCallback(() => {
    setBetSlipOpen((prev) => !prev);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        sideNavOpen,
        betSlipOpen,
        toggleSideNav,
        toggleBetSlip,
        setSideNavOpen,
        setBetSlipOpen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}
