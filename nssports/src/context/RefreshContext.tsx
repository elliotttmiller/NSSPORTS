"use client";

import { createContext, useContext, useCallback, useRef, ReactNode } from "react";

interface RefreshContextType {
  registerRefreshHandler: (handler: () => Promise<void>) => void;
  unregisterRefreshHandler: () => void;
  triggerRefresh: () => Promise<void>;
}

const RefreshContext = createContext<RefreshContextType | null>(null);

/**
 * Global Refresh Provider
 * Allows pages to register their refresh logic and have it triggered
 * by pull-to-refresh or refresh buttons anywhere in the app
 */
export function RefreshProvider({ children }: { children: ReactNode }) {
  const refreshHandlerRef = useRef<(() => Promise<void>) | null>(null);

  const registerRefreshHandler = useCallback((handler: () => Promise<void>) => {
    refreshHandlerRef.current = handler;
  }, []);

  const unregisterRefreshHandler = useCallback(() => {
    refreshHandlerRef.current = null;
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (refreshHandlerRef.current) {
      await refreshHandlerRef.current();
    }
  }, []);

  return (
    <RefreshContext.Provider
      value={{
        registerRefreshHandler,
        unregisterRefreshHandler,
        triggerRefresh,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error("useRefresh must be used within RefreshProvider");
  }
  return context;
}
