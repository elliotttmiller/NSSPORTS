"use client";

import { useState, useEffect } from 'react';
import { useLiveDataStore } from '@/store';
import { Game } from '@/types';

/**
 * Stable hooks using traditional Zustand patterns optimized for Next.js 15.5.4
 * These avoid useSyncExternalStore issues by using direct store subscriptions
 */

/**
 * Hook to get fetchMatches function
 */
export function useFetchMatches() {
  const [fetchMatches] = useState(() => useLiveDataStore.getState().fetchMatches);
  return fetchMatches;
}

/**
 * Hook to get live matches
 */
export function useLiveMatches(): Game[] {
  const [matches, setMatches] = useState<Game[]>(() => 
    useLiveDataStore.getState().matches.filter(match => match.status === 'live')
  );

  useEffect(() => {
    const unsubscribe = useLiveDataStore.subscribe((state) => {
      setMatches(state.matches.filter(match => match.status === 'live'));
    });
    return unsubscribe;
  }, []);

  return matches;
}

/**
 * Hook to get all matches
 */
export function useAllMatches(): Game[] {
  const [matches, setMatches] = useState<Game[]>(() => useLiveDataStore.getState().matches);

  useEffect(() => {
    const unsubscribe = useLiveDataStore.subscribe((state) => {
      setMatches(state.matches);
    });
    return unsubscribe;
  }, []);

  return matches;
}

/**
 * Hook to get loading state
 */
export function useIsLoading(): boolean {
  const [isLoading, setIsLoading] = useState(() => 
    useLiveDataStore.getState().status === 'loading'
  );

  useEffect(() => {
    const unsubscribe = useLiveDataStore.subscribe((state) => {
      setIsLoading(state.status === 'loading');
    });
    return unsubscribe;
  }, []);

  return isLoading;
}

/**
 * Hook to get error state
 */
export function useError(): string | null {
  const [error, setError] = useState<string | null>(() => useLiveDataStore.getState().error);

  useEffect(() => {
    const unsubscribe = useLiveDataStore.subscribe((state) => {
      setError(state.error);
    });
    return unsubscribe;
  }, []);

  return error;
}

/**
 * Hook to get a specific match by ID
 */
export function useMatchById(matchId: string | undefined): Game | undefined {
  const [match, setMatch] = useState<Game | undefined>(() => {
    if (!matchId) return undefined;
    return useLiveDataStore.getState().matches.find(m => m.id === matchId);
  });

  useEffect(() => {
    const unsubscribe = useLiveDataStore.subscribe((state) => {
      if (!matchId) {
        setMatch(undefined);
        return;
      }
      setMatch(state.matches.find(m => m.id === matchId));
    });
    return unsubscribe;
  }, [matchId]);

  return match;
}
