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
  
  const fetchAllMatches = useLiveDataStore.getState().fetchAllMatches;
  const status = useLiveDataStore((state) => state.status);
  
  // Set hydration state on mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Initialize data fetching when authenticated - fetch ALL leagues
  useEffect(() => {
    const isAuthenticated = sessionStatus === 'authenticated' && session?.user;
    
    if (
      isHydrated && 
      isAuthenticated &&
      !initializationStarted.current && 
      status === 'idle'
    ) {
      initializationStarted.current = true;
      console.log('[LiveDataProvider] Initializing data fetch...');
      
      // Small delay to prevent race conditions with UI mounting
      setTimeout(() => {
        fetchAllMatches().catch((err) => {
          console.error('[LiveDataProvider] Failed to fetch matches:', err);
          // Store will handle error state, don't block here
        });
      }, 100);
      
      // Safety timeout - if fetch hangs, force success state after 15s
      setTimeout(() => {
        const currentStatus = useLiveDataStore.getState().status;
        if (currentStatus === 'loading') {
          console.warn('[LiveDataProvider] ⚠️ Fetch timeout - forcing success state');
          useLiveDataStore.setState({
            status: 'success',
            matches: [],
            error: 'Data fetch timeout - showing no games',
          });
        }
      }, 15000);
    }
  }, [isHydrated, sessionStatus, session, status, fetchAllMatches]);

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
