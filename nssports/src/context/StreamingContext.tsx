"use client";
import { createContext, useContext, ReactNode } from 'react';

type StreamingContextType = {
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connect: () => void;
  disconnect: () => void;
  startStreaming: (_leagueId?: string) => void;
  stopStreaming: () => void;
  isStreaming: boolean;
};

const StreamingContext = createContext<StreamingContextType>({
  isConnected: false,
  connectionStatus: 'disconnected',
  connect: () => {},
  disconnect: () => {},
  startStreaming: () => {},
  stopStreaming: () => {},
  isStreaming: false,
});

export function StreamingProvider({ children }: { children: ReactNode }) {
  return (
    <StreamingContext.Provider value={{
      isConnected: false,
      connectionStatus: 'disconnected',
      connect: () => {},
      disconnect: () => {},
      startStreaming: () => {},
      stopStreaming: () => {},
      isStreaming: false,
    }}>
      {children}
    </StreamingContext.Provider>
  );
}

export function useStreaming() {
  return useContext(StreamingContext);
}

export function usePropsStream(_gameId: string, _callback?: () => void) {
  return { data: null, isConnected: false };
}

export default StreamingContext;
