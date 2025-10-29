"use client";

import { createContext, useContext, useEffect, ReactNode, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
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
  const { data: session, status: sessionStatus } = useSession();
  
  const fetchMatches = useLiveDataStore.getState().fetchMatches;
  const status = useLiveDataStore((state) => state.status);
  
  // Set hydration state on mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Initialize data fetching when authenticated
  useEffect(() => {
    const isAuthenticated = sessionStatus === 'authenticated' && session?.user;
    
    if (
      isHydrated && 
      isAuthenticated &&
      !initializationStarted.current && 
      status === 'idle'
    ) {
      initializationStarted.current = true;
      // Small delay to prevent race conditions with UI mounting
      setTimeout(() => {
        fetchMatches('basketball_nba');
      }, 100);
    }
  }, [isHydrated, sessionStatus, session, status, fetchMatches]);

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
