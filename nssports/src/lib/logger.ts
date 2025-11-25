/**
 * High-Performance Centralized Logging Utility
 * Production-ready with zero-overhead telemetry when disabled
 */

import { loggerConfig, getLoggerConfig } from './logger-config';
import { TransportManager, ConsoleTransport, LogEntry, Transport } from './logger-transport';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface SerializedError {
  message: string;
  name: string;
  stack?: string;
}

type LazyMessage = string | (() => string);
type LazyContext = LogContext | (() => LogContext) | undefined;

interface LoggerTelemetry {
  logsByLevel: { debug: number; info: number; warn: number; error: number };
  evaluateFailures: number;
  rateLimitedLogs: number;
  transportFailures: number;
  contextWarnings: number;
}

class Logger {
  private config = getLoggerConfig();
  private enabledLevels: Set<LogLevel> = new Set();
  private readonly transportManager: TransportManager;
  
  // Telemetry structure remains in place but updates are gated
  private telemetry: LoggerTelemetry = {
    logsByLevel: { debug: 0, info: 0, warn: 0, error: 0 },
    evaluateFailures: 0,
    rateLimitedLogs: 0,
    transportFailures: 0,
    contextWarnings: 0
  };

  // Rate limiting with configurable settings
  private readonly errorCounts: Map<string, { count: number; timestamp: number }> = new Map();
  private lastCleanup: number = Date.now();

  // Performance tracking (debug-level only)
  private readonly performanceMarks: Map<string, number> = new Map();

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  // Optional parent logger for child loggers
  private parent?: Logger;
  private childContext?: LogContext;

  constructor(parent?: Logger, childContext?: LogContext, sharedTelemetry?: LoggerTelemetry) {
    this.parent = parent;
    this.childContext = childContext;
    
    if (parent) {
      this.config = parent.config;
      this.transportManager = parent.transportManager;
      // share telemetry if provided, otherwise parent telemetry
      this.telemetry = sharedTelemetry || parent.telemetry;
    } else {
      this.config = getLoggerConfig();
      this.transportManager = new TransportManager();
      this.transportManager.addTransport(
        new ConsoleTransport(this.config.prettyPrint, this.config.redaction)
      );
    }

    this.initializeEnabledLevels();
  }

  private initializeEnabledLevels(): void {
    this.enabledLevels.clear();
    const currentPriority = this.levelPriority[this.config.logLevel];
    (Object.keys(this.levelPriority) as LogLevel[]).forEach(level => {
      if (this.levelPriority[level] >= currentPriority) {
        this.enabledLevels.add(level);
      }
    });
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enabledLevels.has(level);
  }

  private incrementTelemetry<K extends keyof LoggerTelemetry>(
    field: K, 
    subField?: keyof LoggerTelemetry[K]
  ): void {
    if (!this.config.telemetryEnabled) return;

    // Special-case logsByLevel because it's a nested object
    if (field === 'logsByLevel' && subField && typeof subField === 'string') {
      const key = subField as unknown as 'debug' | 'info' | 'warn' | 'error';
      this.telemetry.logsByLevel[key] = (this.telemetry.logsByLevel[key] ?? 0) + 1;
      return;
    }

    // For numeric fields on telemetry, increment known numeric fields
    switch (field) {
      case 'evaluateFailures':
        this.telemetry.evaluateFailures++;
        break;
      case 'rateLimitedLogs':
        this.telemetry.rateLimitedLogs++;
        break;
      case 'transportFailures':
        this.telemetry.transportFailures++;
        break;
      case 'contextWarnings':
        this.telemetry.contextWarnings++;
        break;
      default:
        break;
    }
  }

  private safeLazyEvaluation<T>(value: T | (() => T)): T | null {
    try {
      return typeof value === 'function' ? (value as unknown as () => T)() : value as T;
    } catch {
      this.incrementTelemetry('evaluateFailures');
      return null;
    }
  }

  private generateErrorKey(lazyMessage: LazyMessage, error?: unknown): string {
    try {
      if (error instanceof Error) {
        const firstStackLine = error.stack?.split('\n')[1]?.trim() || '';
        const stackHash = firstStackLine.substring(0, 50);
        return `error:${error.name}:${stackHash}`;
      }
      
      if (typeof lazyMessage === 'string') {
        return `msg:${lazyMessage.substring(0, 80)}`;
      }
      
      return 'lazy:function';
    } catch {
      return 'unknown-error';
    }
  }

  private shouldAllowErrorLog(lazyMessage: LazyMessage, error?: unknown): boolean {
    if (!this.config.rateLimit.enabled) return true;

    const now = Date.now();
    const { windowMs, maxErrorsPerMinute } = this.config.rateLimit;
    
    if (now - this.lastCleanup > windowMs) {
      for (const [key, value] of this.errorCounts.entries()) {
        if (now - value.timestamp > windowMs) {
          this.errorCounts.delete(key);
        }
      }
      this.lastCleanup = now;
    }

    const key = this.generateErrorKey(lazyMessage, error);
    const current = this.errorCounts.get(key);
    
    if (current && now - current.timestamp <= windowMs) {
      if (current.count >= maxErrorsPerMinute) {
        this.incrementTelemetry('rateLimitedLogs');
        return false;
      }
      current.count++;
    } else {
      this.errorCounts.set(key, { count: 1, timestamp: now });
    }

    return true;
  }

  private serializeError(error: unknown): SerializedError {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: this.config.includeStacks ? error.stack : undefined
      };
    }
    return {
      message: String(error),
      name: 'UnknownError'
    };
  }

  private createLogEntry(level: LogLevel, message: string, userContext?: LogContext): LogEntry {
    const safeMessage = message || '[Empty message]';
    
    const systemFields = {
      timestamp: new Date().toISOString(),
      level,
      message: safeMessage,
      service: this.config.service,
      version: this.config.version,
      environment: this.config.isProduction ? 'production' : 'development'
    };

    const baseContext = this.childContext || {};
    const safeUserContext = userContext || {};
    const mergedContext = { ...baseContext, ...safeUserContext };

    if (!this.config.isProduction) {
      const reservedKeys = ['timestamp', 'level', 'message', 'service', 'version', 'environment'];
      const conflictingKeys = Object.keys(mergedContext).filter(key => 
        reservedKeys.includes(key)
      );
      
      if (conflictingKeys.length > 0) {
        this.incrementTelemetry('contextWarnings');
        console.warn(`Logger: Reserved keys found in context (moved to nested context): ${conflictingKeys.join(', ')}`);
      }
    }

    return {
      ...systemFields,
      context: mergedContext
    } as LogEntry;
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    if (this.config.telemetryEnabled) {
      this.telemetry.logsByLevel[entry.level]++;
    }
    
    await this.transportManager.log(entry);
  }

  private async log(level: LogLevel, lazyMessage: LazyMessage, lazyContext?: LazyContext): Promise<void> {
    if (!this.shouldLog(level)) return;

    if (level === 'error') {
      if (!this.shouldAllowErrorLog(lazyMessage, lazyContext instanceof Error ? lazyContext : undefined)) {
        return;
      }
    }

    const messageResult = this.safeLazyEvaluation(lazyMessage);
    const contextResult = this.safeLazyEvaluation(lazyContext as unknown as (() => LogContext) | LogContext);

    const safeContext = (contextResult && typeof contextResult === 'object') ? contextResult as LogContext : {};

    const finalMessage = typeof messageResult === 'string' 
      ? messageResult 
      : '[Log evaluation failed]';

    const logEntry = this.createLogEntry(level, finalMessage, safeContext as LogContext);
    await this.writeLog(logEntry);
  }

  // ========== PUBLIC API ==========

  debug(message: LazyMessage, context?: LazyContext): void {
    this.log('debug', message, context).catch(() => { /* Fire and forget at public API level */ });
  }

  info(message: LazyMessage, context?: LazyContext): void {
    this.log('info', message, context).catch(() => { });
  }

  warn(message: LazyMessage, errorOrContext?: Error | unknown | LazyContext, context?: LazyContext): void {
  if (errorOrContext instanceof Error || 
    (errorOrContext && typeof errorOrContext === 'object' && 'message' in (errorOrContext as Record<string, unknown>))) {
      const baseContext = this.safeLazyEvaluation(context || {}) || {};
      const safeBaseContext = (baseContext && typeof baseContext === 'object') ? baseContext : {};
      
      const errorContext: LazyContext = () => ({
        ...safeBaseContext,
        error: this.serializeError(errorOrContext)
      });
      this.log('warn', message, errorContext).catch(() => { });
    } else {
      this.log('warn', message, errorOrContext as LazyContext).catch(() => { });
    }
  }

  error(message: LazyMessage, error?: Error | unknown, context?: LazyContext): void {
    if (error) {
      const baseContext = this.safeLazyEvaluation(context || {}) || {};
      const safeBaseContext = (baseContext && typeof baseContext === 'object') ? baseContext : {};
      
      const errorContext: LazyContext = () => ({
        ...safeBaseContext,
        error: this.serializeError(error)
      });
      this.log('error', message, errorContext).catch(() => { });
    } else {
      this.log('error', message, context).catch(() => { });
    }
  }

  request(method: string, path: string, startTime: number, statusCode?: number, context?: LazyContext): void {
    const duration = Date.now() - startTime;
    
    if (this.config.isProduction) {
      const isSlow = duration > 1000;
      const isError = statusCode && statusCode >= 400;
      if (!isSlow && !isError) return;
    }

    const baseContext = this.safeLazyEvaluation(context || {}) || {};
    const safeBaseContext = (baseContext && typeof baseContext === 'object') ? baseContext : {};

    this.info(`${method} ${path}`, () => ({
      type: 'request',
      durationMs: duration,
      statusCode,
      ...safeBaseContext
    }));
  }

  performance(operation: string, durationMs: number, thresholdMs: number = 100, context?: LazyContext): void {
    if (durationMs < thresholdMs) return;

    const baseContext = this.safeLazyEvaluation(context || {}) || {};
    const safeBaseContext = (baseContext && typeof baseContext === 'object') ? baseContext : {};

    this.info(`Performance: ${operation}`, () => ({
      type: 'performance',
      durationMs,
      thresholdMs,
      ...safeBaseContext
    }));
  }

  // ========== CHILD LOGGER WITH SHARED TELEMETRY ==========

  child(baseContext: LogContext): Logger {
    const childLogger = new Logger(this, baseContext, this.telemetry);
    return childLogger;
  }

  createScopedLogger(component: string, baseContext?: LogContext) {
    const scopedMarks = new Map<string, number>();
    
    return {
      debug: (message: string, data?: unknown) => 
        this.debug(`[${component}] ${message}`, { ...baseContext, component, data }),
      
      info: (message: string, data?: unknown) => 
        this.info(`[${component}] ${message}`, { ...baseContext, component, data }),
      
      warn: (message: string, data?: unknown) => 
        this.warn(`[${component}] ${message}`, { ...baseContext, component, data }),
      
      error: (message: string, data?: unknown) => 
        this.error(`[${component}] ${message}`, { ...baseContext, component, data }),

      startTimer: (operation: string) => {
        if (!this.shouldLog('debug')) return;
        scopedMarks.set(`${component}.${operation}`, Date.now());
      },
      
      endTimer: (operation: string, thresholdMs: number = 100) => {
        if (!this.shouldLog('debug')) return;
        const startTime = scopedMarks.get(`${component}.${operation}`);
        if (startTime) {
          const duration = Date.now() - startTime;
          this.performance(`${component}.${operation}`, duration, thresholdMs, baseContext);
          scopedMarks.delete(`${component}.${operation}`);
        }
      }
    };
  }

  startTimer(operation: string): void {
    if (!this.shouldLog('debug')) return;
    this.performanceMarks.set(operation, Date.now());
  }

  endTimer(operation: string, thresholdMs: number = 100, context?: LazyContext): void {
    if (!this.shouldLog('debug')) return;
    
    const startTime = this.performanceMarks.get(operation);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.performance(operation, duration, thresholdMs, context);
      this.performanceMarks.delete(operation);
    }
  }

  // ========== PUBLIC TELEMETRY API (GATED) ==========

  getTelemetry(): Readonly<LoggerTelemetry> | { message: string } {
    if (!this.config.telemetryEnabled) {
      return { message: 'Telemetry is disabled. Set LOG_TELEMETRY_ENABLED=true to enable.' };
    }
    
    return { ...this.telemetry };
  }

  resetTelemetry(): void {
    if (!this.config.telemetryEnabled) return;

    this.telemetry.logsByLevel = { debug: 0, info: 0, warn: 0, error: 0 };
    this.telemetry.evaluateFailures = 0;
    this.telemetry.rateLimitedLogs = 0;
    this.telemetry.transportFailures = 0;
    this.telemetry.contextWarnings = 0;
  }

  // ========== TRANSPORT MANAGEMENT ==========

  addTransport(transport: Transport): void {
    this.transportManager.addTransport(transport);
  }

  removeTransport(name: string): void {
    this.transportManager.removeTransport(name);
  }

  async shutdown(): Promise<void> {
    await this.transportManager.shutdown();
  }

  // ========== CONFIG MANAGEMENT ==========

  refreshConfig(): void {
    loggerConfig.refreshConfig();
    this.config = getLoggerConfig();
    this.initializeEnabledLevels();
  }

  isDebugEnabled(): boolean {
    return this.enabledLevels.has('debug');
  }

  isInfoEnabled(): boolean {
    return this.enabledLevels.has('info');
  }

  getCurrentLevel(): LogLevel {
    return this.config.logLevel;
  }

  // Configurable redaction
  setRedaction(redactionFn: (data: unknown) => unknown): void {
    loggerConfig.setRedaction(redactionFn);
    this.config.redaction = redactionFn;

    // Propagate to transports that support redaction updates
    const transports = this.transportManager.getTransports();
    if (transports && transports.length) {
      transports.forEach(t => {
        try {
          t.updateRedaction?.(redactionFn);
        } catch (err) {
          // non-fatal
          console.warn(`Failed to update redaction on transport ${t.name}:`, err);
        }
      });
    }
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;

// Export types for use in application code
export type { LogLevel, LogContext, LazyMessage, LazyContext };

// Export static debug methods for migration compatibility
export const GameListDebugLogger = {
  info: (component: string, message: string, data?: unknown) => 
    logger.info(`[${component}] ${message}`, { component, debugData: data }),
  
  warn: (component: string, message: string, data?: unknown) => 
    logger.warn(`[${component}] ${message}`, { component, debugData: data }),
  
  error: (component: string, message: string, data?: unknown) => 
    logger.error(`[${component}] ${message}`, { component, debugData: data })
};
 