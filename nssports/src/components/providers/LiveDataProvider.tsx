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

// Polling interval for live game updates (30 seconds)
const LIVE_GAMES_POLL_INTERVAL = 30 * 1000;

export function LiveDataProvider({ children }: LiveDataProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const initializationStarted = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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

  useEffect(() => {
    // Set up automatic polling for live games updates
    if (isHydrated && status !== 'idle') {
      // Clear any existing interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      // Poll for updates every 30 seconds
      pollIntervalRef.current = setInterval(() => {
        fetchMatches('basketball_nba');
      }, LIVE_GAMES_POLL_INTERVAL);

      // Cleanup on unmount
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
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
