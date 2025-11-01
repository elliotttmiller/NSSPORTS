"use client";

/**
 * Real-Time Streaming Context for Live Odds Updates ONLY
 * 
 * Provides WebSocket-based streaming of ODDS/LINES/PROPS updates from SportsGameOdds API
 * Uses the official SDK streaming service with Pusher protocol
 * 
 * ⚠️ IMPORTANT: This does NOT stream live scores, stats, or game times
 * Those come from scheduled API fetches. This is exclusively for betting odds.
 * 
 * NEW: Props Streaming Support
 * - Real-time player props odds updates (<1s latency)
 * - Real-time game props odds updates (<1s latency)
 * - Automatic React Query cache invalidation
 * - Works globally across all sports (NFL, NHL, NBA, MLB, etc.)
 * 
 * Official Documentation:
 * https://sportsgameodds.com/docs/guides/realtime-streaming-api
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { logger } from '@/lib/logger';

// Type for streaming odds update data
interface OddsUpdateData {
  eventID: string;
  gameID?: string;
  odds?: unknown;
  timestamp?: string;
  [key: string]: unknown;
}

// Type for props update data
interface PropsUpdateData {
  eventID: string;
  type?: 'player' | 'game' | 'both';
  timestamp?: string;
}

interface StreamingContextValue {
  isConnected: boolean;
  isStreaming: boolean;
  eventCount: number;
  lastUpdate: Date | null;
  connectionState: string;
  startStreaming: (leagueID?: string) => Promise<void>;
  stopStreaming: () => void;
  subscribe: (eventID: string, callback: (data: OddsUpdateData) => void) => () => void;
  subscribeToProps: (eventID: string, callback: (data: PropsUpdateData) => void) => () => void;
}

const StreamingContext = createContext<StreamingContextValue | undefined>(undefined);

interface StreamingProviderProps {
  children: ReactNode;
}

export function StreamingProvider({ children }: StreamingProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [subscribers, setSubscribers] = useState<Map<string, Set<(data: OddsUpdateData) => void>>>(new Map());
  const [propsSubscribers, setPropsSubscribers] = useState<Map<string, Set<(data: PropsUpdateData) => void>>>(new Map());

  // Start streaming for real-time odds updates (live OR upcoming games)
  // Per official docs: https://sportsgameodds.com/docs/guides/realtime-streaming-api
  // - 'events:live' → Stream all live/in-progress games (highest frequency, <1s latency)
  // - 'events:upcoming' → Stream upcoming games odds for specific league (line movements, odds adjustments)
  // Both feeds provide real-time odds updates as betting markets move
  const startStreaming = useCallback(async (leagueID?: string) => {
    if (isStreaming) {
      logger.warn('[Streaming] Already streaming, ignoring duplicate request');
      return;
    }

    try {
      logger.info('[Streaming] Starting real-time odds streaming (props included)', { leagueID });
      setIsStreaming(true);

      // ✅ OFFICIAL SDK PATTERN per https://sportsgameodds.com/docs/guides/realtime-streaming-api
      // - If leagueID provided: Use 'events:upcoming' to stream upcoming games odds for that league
      // - If no leagueID: Use 'events:live' to stream all live games across all sports
      // Both provide real-time WebSocket updates as odds/lines change in betting markets
      const response = await fetch('/api/streaming/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feed: leagueID ? 'events:upcoming' : 'events:live', // ⭐ OFFICIAL: upcoming for league-specific, live for all in-progress
          leagueID, // Required for 'events:upcoming' feed
          enablePropsStreaming: true, // ⭐ Enable real-time player/game props updates
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to connect to streaming: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('[Streaming] Connected to streaming service', data);
      setIsConnected(true);
      setConnectionState('connected');

    } catch (error) {
      logger.error('[Streaming] Failed to start streaming', error);
      setIsStreaming(false);
      setIsConnected(false);
      throw error;
    }
  }, [isStreaming]);

  // Stop streaming
  const stopStreaming = useCallback(async () => {
    if (!isStreaming) return;

    try {
      logger.info('[Streaming] Stopping streaming connection');
      
      await fetch('/api/streaming/disconnect', { method: 'POST' });
      
      setIsStreaming(false);
      setIsConnected(false);
      setConnectionState('disconnected');
      setSubscribers(new Map());
      
    } catch (error) {
      logger.error('[Streaming] Failed to stop streaming', error);
    }
  }, [isStreaming]);

  // Subscribe to updates for a specific event
  const subscribe = useCallback((eventID: string, callback: (data: OddsUpdateData) => void) => {
    setSubscribers(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(eventID)) {
        newMap.set(eventID, new Set());
      }
      newMap.get(eventID)!.add(callback);
      return newMap;
    });

    // Return unsubscribe function
    return () => {
      setSubscribers(prev => {
        const newMap = new Map(prev);
        const eventSubs = newMap.get(eventID);
        if (eventSubs) {
          eventSubs.delete(callback);
          if (eventSubs.size === 0) {
            newMap.delete(eventID);
          }
        }
        return newMap;
      });
    };
  }, []);

  // Subscribe to props updates for a specific event
  const subscribeToProps = useCallback((eventID: string, callback: (data: PropsUpdateData) => void) => {
    setPropsSubscribers(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(eventID)) {
        newMap.set(eventID, new Set());
      }
      newMap.get(eventID)!.add(callback);
      return newMap;
    });

    // Return unsubscribe function
    return () => {
      setPropsSubscribers(prev => {
        const newMap = new Map(prev);
        const eventSubs = newMap.get(eventID);
        if (eventSubs) {
          eventSubs.delete(callback);
          if (eventSubs.size === 0) {
            newMap.delete(eventID);
          }
        }
        return newMap;
      });
    };
  }, []);

  // Set up Server-Sent Events (SSE) listener for streaming updates
  useEffect(() => {
    if (!isStreaming || !isConnected) return;

    logger.info('[Streaming] Setting up SSE listener');
    const eventSource = new EventSource('/api/streaming/events');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'update') {
          logger.info('[Streaming] Received odds update', {
            eventID: data.eventID,
            timestamp: data.timestamp,
          });

          setLastUpdate(new Date(data.timestamp));
          setEventCount(prev => prev + 1);

          // Notify subscribers for this specific event
          const eventSubs = subscribers.get(data.eventID);
          if (eventSubs) {
            eventSubs.forEach(callback => callback(data));
          }
        } else if (data.type === 'props_update') {
          // Handle props-specific updates
          logger.info('[Streaming] Received props update', {
            eventID: data.eventID,
            timestamp: data.timestamp,
          });

          setLastUpdate(new Date(data.timestamp));

          // Notify props subscribers for this specific event
          const eventPropsSubs = propsSubscribers.get(data.eventID);
          if (eventPropsSubs) {
            eventPropsSubs.forEach(callback => callback({
              eventID: data.eventID,
              type: data.propsType || 'both',
              timestamp: data.timestamp,
            }));
          }
        } else if (data.type === 'state_change') {
          setConnectionState(data.state);
        }
      } catch (error) {
        logger.error('[Streaming] Failed to process update', error);
      }
    };

    eventSource.onerror = (error) => {
      logger.error('[Streaming] SSE connection error', error);
      setIsConnected(false);
      setConnectionState('error');
    };

    return () => {
      logger.info('[Streaming] Closing SSE connection');
      eventSource.close();
    };
  }, [isStreaming, isConnected, subscribers, propsSubscribers]);

  const value: StreamingContextValue = {
    isConnected,
    isStreaming,
    eventCount,
    lastUpdate,
    connectionState,
    startStreaming,
    stopStreaming,
    subscribe,
    subscribeToProps,
  };

  return (
    <StreamingContext.Provider value={value}>
      {children}
    </StreamingContext.Provider>
  );
}

export function useStreaming() {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error('useStreaming must be used within StreamingProvider');
  }
  return context;
}

/**
 * Hook for subscribing to real-time odds updates for a specific game
 */
export function useGameOddsStream(gameId: string, onUpdate: (data: OddsUpdateData) => void) {
  const { subscribe, isConnected } = useStreaming();

  useEffect(() => {
    if (!isConnected || !gameId) return;

    logger.debug('[useGameOddsStream] Subscribing to game', { gameId });
    const unsubscribe = subscribe(gameId, onUpdate);

    return () => {
      logger.debug('[useGameOddsStream] Unsubscribing from game', { gameId });
      unsubscribe();
    };
  }, [gameId, onUpdate, subscribe, isConnected]);
}

/**
 * Hook for subscribing to real-time props updates for a specific game
 * 
 * NEW: Enables real-time props streaming
 * - Subscribes to player and game props changes
 * - Triggers React Query cache invalidation on updates
 * - Works globally across all sports (NFL, NHL, NBA, MLB, etc.)
 * - <1s latency for props updates
 * 
 * Usage:
 * ```tsx
 * usePropsStream(gameId, (data) => {
 *   // Invalidate props cache
 *   queryClient.invalidateQueries(['playerProps', gameId]);
 *   queryClient.invalidateQueries(['gameProps', gameId]);
 * });
 * ```
 */
export function usePropsStream(gameId: string, onUpdate: (data: PropsUpdateData) => void) {
  const { subscribeToProps, isConnected } = useStreaming();
  
  // ⭐ CRITICAL FIX: Use ref to store latest callback without triggering re-subscriptions
  // This prevents infinite loops caused by callback recreation
  const onUpdateRef = useRef(onUpdate);
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!isConnected || !gameId) return;

    logger.debug('[usePropsStream] Subscribing to props updates', { gameId });
    
    // Use stable callback that references the ref
    const stableCallback = (data: PropsUpdateData) => {
      onUpdateRef.current(data);
    };
    
    const unsubscribe = subscribeToProps(gameId, stableCallback);

    return () => {
      logger.debug('[usePropsStream] Unsubscribing from props updates', { gameId });
      unsubscribe();
    };
  }, [gameId, subscribeToProps, isConnected]); // ⭐ Removed onUpdate from deps
}
