"use client";

import { createContext, useContext, useEffect, ReactNode, useRef, useState } from 'react';
import { useLiveDataStore } from '@/store';

interface LiveDataContextType {
  initialized: boolean;
  isHydrated: boolean;
}

const LiveDataContext = createContext<LiveDataContextType>({ 
  initialized: false,
  isHydrated: false 
});

interface LiveDataProviderProps {
  children: ReactNode;
}

export function LiveDataProvider({ children }: LiveDataProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const initializationStarted = useRef(false);
  
  const fetchAllMatches = useLiveDataStore.getState().fetchAllMatches;
  const status = useLiveDataStore((state) => state.status);
  
  // Set hydration state on mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Initialize data fetching (no auth required for EV app)
  useEffect(() => {
    if (
      isHydrated && 
      !initializationStarted.current && 
      status === 'idle'
    ) {
      initializationStarted.current = true;
      
      // Reduced delay for faster initial load
      setTimeout(() => {
        fetchAllMatches().catch(() => {
          // Store will handle error state, don't block here
        });
      }, 50);
      
      // Safety timeout - if fetch hangs, force success state after 15s
      setTimeout(() => {
        const currentStatus = useLiveDataStore.getState().status;
        if (currentStatus === 'loading') {
          useLiveDataStore.setState({
            status: 'success',
            matches: [],
            error: 'Data fetch timeout - please refresh',
          });
        }
      }, 15000);
    }
  }, [isHydrated, status, fetchAllMatches]);

  return (
    <LiveDataContext.Provider value={{ 
      initialized: status !== 'idle',
      isHydrated 
    }}>
      {children}
    </LiveDataContext.Provider>
  );
}

export const useLiveDataContext = () => useContext(LiveDataContext);
