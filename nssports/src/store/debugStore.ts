/**
 * Debug Store - Track API calls, errors, and SDK status
 * 
 * Provides real-time visibility into:
 * - API requests and responses
 * - SDK calls and errors
 * - Network failures
 * - Configuration issues
 * - Performance metrics
 */

import { create } from 'zustand';

export interface DebugLogEntry {
  id: string;
  timestamp: number;
  type: 'api' | 'sdk' | 'error' | 'info' | 'warning';
  category: string;
  message: string;
  details?: unknown;
  duration?: number;
  status?: 'pending' | 'success' | 'error';
}

export interface DebugConfig {
  apiKey: string | null;
  apiKeyConfigured: boolean;
  useDirectSDK: boolean;
  isGitHubPages: boolean;
  environment: string;
}

interface DebugState {
  // Visibility
  isVisible: boolean;
  
  // Logs
  logs: DebugLogEntry[];
  maxLogs: number;
  
  // Configuration status
  config: DebugConfig;
  
  // Statistics
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
  
  // Actions
  toggleVisibility: () => void;
  show: () => void;
  hide: () => void;
  addLog: (entry: Omit<DebugLogEntry, 'id' | 'timestamp'>) => void;
  updateLog: (id: string, updates: Partial<DebugLogEntry>) => void;
  clearLogs: () => void;
  setConfig: (config: Partial<DebugConfig>) => void;
  updateStats: (stats: Partial<DebugState['stats']>) => void;
}

const initialConfig: DebugConfig = {
  apiKey: null,
  apiKeyConfigured: false,
  useDirectSDK: false,
  isGitHubPages: false,
  environment: 'unknown',
};

const initialStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
};

export const useDebugStore = create<DebugState>((set, get) => ({
  isVisible: false,
  logs: [],
  maxLogs: 100,
  config: initialConfig,
  stats: initialStats,
  
  toggleVisibility: () => {
    set((state) => ({ isVisible: !state.isVisible }));
  },
  
  show: () => {
    set({ isVisible: true });
  },
  
  hide: () => {
    set({ isVisible: false });
  },
  
  addLog: (entry) => {
    const newLog: DebugLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    set((state) => {
      const newLogs = [newLog, ...state.logs].slice(0, state.maxLogs);
      return { logs: newLogs };
    });
    
    // Auto-show debug panel on errors
    if (entry.type === 'error') {
      set({ isVisible: true });
    }
  },
  
  updateLog: (id, updates) => {
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === id ? { ...log, ...updates } : log
      ),
    }));
  },
  
  clearLogs: () => {
    set({ logs: [] });
  },
  
  setConfig: (config) => {
    set((state) => ({
      config: { ...state.config, ...config },
    }));
  },
  
  updateStats: (stats) => {
    set((state) => ({
      stats: { ...state.stats, ...stats },
    }));
  },
}));

// Helper function to create a pending log and return its ID
export function createPendingLog(
  type: DebugLogEntry['type'],
  category: string,
  message: string,
  details?: unknown
): string {
  const store = useDebugStore.getState();
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const newLog: DebugLogEntry = {
    id,
    timestamp: Date.now(),
    type,
    category,
    message,
    details,
    status: 'pending',
  };
  
  store.addLog(newLog as Omit<DebugLogEntry, 'id' | 'timestamp'>);
  return id;
}

// Helper to complete a pending log
export function completePendingLog(
  id: string,
  success: boolean,
  duration?: number,
  details?: unknown
): void {
  const store = useDebugStore.getState();
  store.updateLog(id, {
    status: success ? 'success' : 'error',
    duration,
    details,
  });
  
  // Update stats
  const stats = store.stats;
  const totalRequests = stats.totalRequests + 1;
  const successfulRequests = success
    ? stats.successfulRequests + 1
    : stats.successfulRequests;
  const failedRequests = success
    ? stats.failedRequests
    : stats.failedRequests + 1;
  
  // Update average response time
  const averageResponseTime = duration
    ? (stats.averageResponseTime * stats.totalRequests + duration) /
      totalRequests
    : stats.averageResponseTime;
  
  store.updateStats({
    totalRequests,
    successfulRequests,
    failedRequests,
    averageResponseTime,
  });
}
