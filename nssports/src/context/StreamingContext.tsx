"use client";

/**
 * Real-Time Streaming Context for Live Odds Updates
 * 
 * Provides WebSocket-based streaming of odds updates from SportsGameOdds API
 * Uses the official SDK streaming service with Pusher protocol
 * 
 * Official Documentation:
 * https://sportsgameodds.com/docs/guides/realtime-streaming-api
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface StreamingContextValue {
  isConnected: boolean;
  isStreaming: boolean;
  eventCount: number;
  lastUpdate: Date | null;
  connectionState: string;
  startStreaming: (leagueID?: string) => Promise<void>;
  stopStreaming: () => void;
  subscribe: (eventID: string, callback: (data: any) => void) => () => void;
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
  const [subscribers, setSubscribers] = useState<Map<string, Set<(data: any) => void>>>(new Map());

  // Start streaming for a specific league or all live games
  const startStreaming = useCallback(async (leagueID?: string) => {
    if (isStreaming) {
      logger.warn('[Streaming] Already streaming, ignoring duplicate request');
      return;
    }

    try {
      logger.info('[Streaming] Starting streaming connection', { leagueID });
      setIsStreaming(true);

      // Call our API endpoint to establish streaming connection
      const response = await fetch('/api/streaming/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feed: leagueID ? 'events:upcoming' : 'events:live',
          leagueID,
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
  const subscribe = useCallback((eventID: string, callback: (data: any) => void) => {
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
  }, [isStreaming, isConnected, subscribers]);

  const value: StreamingContextValue = {
    isConnected,
    isStreaming,
    eventCount,
    lastUpdate,
    connectionState,
    startStreaming,
    stopStreaming,
    subscribe,
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
export function useGameOddsStream(gameId: string, onUpdate: (data: any) => void) {
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
