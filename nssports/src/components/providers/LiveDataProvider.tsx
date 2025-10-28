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
  
  // Use stable selector references
  const fetchMatches = useLiveDataStore.getState().fetchMatches;
  const status = useLiveDataStore((state) => state.status);
  
  useEffect(() => {
    // Set hydration state on client
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only initialize once on the client after hydration
    if (isHydrated && !initializationStarted.current && status === 'idle') {
      initializationStarted.current = true;
      fetchMatches('basketball_nba');
    }
  }, [isHydrated, status, fetchMatches]);

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
