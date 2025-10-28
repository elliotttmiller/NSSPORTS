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
  
  // Use stable selector references
  const fetchMatches = useLiveDataStore.getState().fetchMatches;
  const status = useLiveDataStore((state) => state.status);
  
  useEffect(() => {
    // Set hydration state on client
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // ⚠️ CRITICAL: Only initialize if user is authenticated
    // This prevents expensive API calls for unauthenticated users
    const isAuthenticated = sessionStatus === 'authenticated' && session?.user;
    
    if (
      isHydrated && 
      isAuthenticated &&
      !initializationStarted.current && 
      status === 'idle'
    ) {
      console.log('[LiveDataProvider] User authenticated - initializing live data');
      initializationStarted.current = true;
      fetchMatches('basketball_nba');
    }
    
    // Don't fetch data if user is not authenticated
    if (sessionStatus === 'unauthenticated') {
      console.log('[LiveDataProvider] User not authenticated - skipping data fetch');
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
