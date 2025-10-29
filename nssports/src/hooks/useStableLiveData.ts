"use client";

import { useState, useEffect } from 'react';
import { useLiveDataStore } from '@/store';
import { Game } from '@/types';

/**
 * Stable hooks using traditional Zustand patterns optimized for Next.js 15.5.4
 * These avoid useSyncExternalStore issues by using direct store subscriptions
 */

/**
 * Hook to get fetchAllMatches function (fetches all leagues: NBA, NFL, NHL)
 */
export function useFetchAllMatches() {
  const [fetchAllMatches] = useState(() => useLiveDataStore.getState().fetchAllMatches);
  return fetchAllMatches;
}

/**
 * Hook to get live matches
 */
export function useLiveMatches(): Game[] {
  const [matches, setMatches] = useState<Game[]>(() => {
    const state = useLiveDataStore.getState();
    return Array.isArray(state.matches) 
      ? state.matches.filter(match => match.status === 'live')
      : [];
  });

  useEffect(() => {
    const unsubscribe = useLiveDataStore.subscribe((state) => {
      const filtered = Array.isArray(state.matches)
        ? state.matches.filter(match => match.status === 'live')
        : [];
      setMatches(filtered);
    });
    return unsubscribe;
  }, []);

  return matches;
}

/**
 * Hook to get all matches
 */
export function useAllMatches(): Game[] {
  const [matches, setMatches] = useState<Game[]>(() => {
    const state = useLiveDataStore.getState();
    return Array.isArray(state.matches) ? state.matches : [];
  });

  useEffect(() => {
    const unsubscribe = useLiveDataStore.subscribe((state) => {
      const validMatches = Array.isArray(state.matches) ? state.matches : [];
      setMatches(validMatches);
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
    const state = useLiveDataStore.getState();
    return Array.isArray(state.matches) 
      ? state.matches.find(m => m.id === matchId)
      : undefined;
  });

  useEffect(() => {
    const unsubscribe = useLiveDataStore.subscribe((state) => {
      if (!matchId) {
        setMatch(undefined);
        return;
      }
      const foundMatch = Array.isArray(state.matches)
        ? state.matches.find(m => m.id === matchId)
        : undefined;
      setMatch(foundMatch);
    });
    return unsubscribe;
  }, [matchId]);

  return match;
}
