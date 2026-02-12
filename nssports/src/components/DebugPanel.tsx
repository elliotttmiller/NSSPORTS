"use client";

import { useEffect, useState } from 'react';
import { useDebugStore, type DebugLogEntry } from '@/store/debugStore';
import { X, ChevronDown, ChevronUp, AlertCircle, Info, AlertTriangle, Activity, CheckCircle } from 'lucide-react';

export function DebugPanel() {
  const { isVisible, logs, config, stats, toggleVisibility, hide, clearLogs } = useDebugStore();
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'api' | 'sdk' | 'error' | 'warning'>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Keyboard shortcut: Ctrl+Shift+D to toggle debug panel
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleVisibility();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleVisibility]);

  // Don't render on server
  if (!mounted) return null;
  
  if (!isVisible) {
    // Show floating toggle button when hidden
    return (
      <button
        onClick={toggleVisibility}
        className="fixed bottom-4 right-4 z-[9999] bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-all hover:scale-110"
        title="Open Debug Panel (Ctrl+Shift+D)"
      >
        <Activity className="w-6 h-6" />
      </button>
    );
  }

  const toggleLog = (id: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const getLogIcon = (log: DebugLogEntry) => {
    if (log.status === 'pending') {
      return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    }
    if (log.status === 'error' || log.type === 'error') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (log.type === 'warning') {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
    if (log.status === 'success') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <Info className="w-4 h-4 text-blue-500" />;
  };

  const getLogColor = (log: DebugLogEntry) => {
    if (log.status === 'error' || log.type === 'error') {
      return 'bg-red-950/50 border-red-800';
    }
    if (log.type === 'warning') {
      return 'bg-yellow-950/50 border-yellow-800';
    }
    if (log.status === 'success') {
      return 'bg-green-950/50 border-green-800';
    }
    return 'bg-gray-900/50 border-gray-700';
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  };

  const errorCount = logs.filter(l => l.type === 'error' || l.status === 'error').length;
  const warningCount = logs.filter(l => l.type === 'warning').length;

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Debug Panel */}
      <div className="absolute bottom-0 right-0 w-full md:w-[600px] lg:w-[800px] h-[70vh] bg-black/95 backdrop-blur-lg border-l border-t border-gray-800 flex flex-col pointer-events-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-white">Debug Panel</h2>
            <div className="flex gap-2 text-xs">
              {errorCount > 0 && (
                <span className="px-2 py-0.5 bg-red-900/50 text-red-300 rounded-full">
                  {errorCount} errors
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-300 rounded-full">
                  {warningCount} warnings
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Ctrl+Shift+D</span>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Clear
            </button>
            <button
              onClick={hide}
              className="p-1 hover:bg-gray-800 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Stats & Config */}
        <div className="p-4 border-b border-gray-800 bg-gray-900/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-400">Total Requests</div>
              <div className="text-lg font-semibold text-white">{stats.totalRequests}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Success Rate</div>
              <div className="text-lg font-semibold text-green-400">
                {stats.totalRequests > 0
                  ? `${Math.round((stats.successfulRequests / stats.totalRequests) * 100)}%`
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Failed</div>
              <div className="text-lg font-semibold text-red-400">{stats.failedRequests}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Avg Response</div>
              <div className="text-lg font-semibold text-blue-400">
                {stats.averageResponseTime > 0
                  ? `${Math.round(stats.averageResponseTime)}ms`
                  : 'N/A'}
              </div>
            </div>
          </div>

          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">API Key:</span>
              <span className={config.apiKeyConfigured ? 'text-green-400' : 'text-red-400'}>
                {config.apiKeyConfigured ? '✓ Configured' : '✗ Missing'}
                {config.apiKey && ` (${config.apiKey.substring(0, 8)}...)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Direct SDK:</span>
              <span className="text-white">{config.useDirectSDK ? '✓ Yes' : '✗ No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">GitHub Pages:</span>
              <span className="text-white">{config.isGitHubPages ? '✓ Yes' : '✗ No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Environment:</span>
              <span className="text-white">{config.environment}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 p-3 border-b border-gray-800 bg-gray-900/20 overflow-x-auto">
          {(['all', 'api', 'sdk', 'error', 'warning'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && ` (${logs.filter(l => l.type === f || l.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No logs yet. API calls and errors will appear here.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              return (
                <div
                  key={log.id}
                  className={`border rounded-lg p-3 ${getLogColor(log)} transition-all`}
                >
                  <div
                    className="flex items-start gap-2 cursor-pointer"
                    onClick={() => toggleLog(log.id)}
                  >
                    <div className="flex-shrink-0 mt-0.5">{getLogIcon(log)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-gray-400">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded">
                            {log.category}
                          </span>
                          {log.duration && (
                            <span className="text-xs text-gray-400">
                              {log.duration}ms
                            </span>
                          )}
                        </div>
                        <button className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <div className="text-sm text-white break-words">{log.message}</div>
                      {isExpanded && log.details && (
                        <pre className="mt-2 text-xs bg-black/50 p-2 rounded overflow-x-auto text-gray-300">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
