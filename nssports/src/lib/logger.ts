/**
 * High-Performance Centralized Logging Utility
 * Optimized for production performance with minimal overhead
 * 
 * Performance Features:
 * - Lazy evaluation: Messages/context only computed when actually logged
 * - Environment-aware: Zero overhead for disabled log levels
 * - Conditional compilation: Respects LOG_LEVEL environment variable
 * - Structured logging: JSON format for production, readable for development
 * 
 * Official Next.js Best Practices:
 * - Structured logging with JSON format for production
 * - Context enrichment for debugging
 * - Request ID tracking
 * - Performance metrics
 * 
 * Reference: https://nextjs.org/docs/app/guides/production-checklist
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

// Type for lazy evaluation of log messages and context
type LazyMessage = string | (() => string);
type LazyContext = LogContext | (() => LogContext) | undefined;

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';
  private logLevel: LogLevel;
  
  // Log level priorities for filtering
  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    // Determine effective log level from environment
    const envLogLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    
    if (this.isProduction) {
      // Production: default to 'warn' (only warnings and errors)
      this.logLevel = envLogLevel || 'warn';
    } else {
      // Development: default to 'debug' (all logs)
      this.logLevel = envLogLevel || 'debug';
    }
  }

  /**
   * Check if a log level should be output based on current configuration
   * Enables zero-cost abstraction for disabled log levels
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.logLevel];
  }

  /**
   * Internal log method with lazy evaluation support
   * Messages and context are only evaluated if the log will actually be written
   */
  private log(level: LogLevel, lazyMessage: LazyMessage, lazyContext?: LazyContext): void {
    // Fast path: check if we should log before doing any work
    if (!this.shouldLog(level)) {
      return;
    }

    // Lazy evaluation: only compute message and context if we're actually logging
    const message = typeof lazyMessage === 'function' ? lazyMessage() : lazyMessage;
    const context = typeof lazyContext === 'function' ? lazyContext() : lazyContext;

    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      environment: process.env.NODE_ENV,
      ...context,
    };

    // Production: structured JSON logging
    if (this.isProduction) {
      console[level === 'error' || level === 'warn' ? level : 'log'](JSON.stringify(logData));
    } else {
      // Development: colored console output with readable format
      const logMethod = level === 'error' ? console.error : 
                       level === 'warn' ? console.warn : 
                       console.log;
      logMethod(`[${timestamp}] [${level.toUpperCase()}]`, message, context || '');
    }
  }

  /**
   * Debug logging - disabled by default in production
   * Use for detailed diagnostic information
   */
  debug(message: LazyMessage, context?: LazyContext): void {
    this.log('debug', message, context);
  }

  /**
   * Info logging - important application events
   * Disabled by default in production unless LOG_LEVEL=info
   */
  info(message: LazyMessage, context?: LazyContext): void {
    this.log('info', message, context);
  }

  /**
   * Warning logging - potentially harmful situations
   * Always enabled
   */
  warn(message: LazyMessage, errorOrContext?: Error | unknown | LazyContext, context?: LazyContext): void {
    // Check if second argument is an Error
    if (errorOrContext instanceof Error || (errorOrContext && typeof errorOrContext === 'object' && 'message' in errorOrContext)) {
      const error = errorOrContext;
      const errorContext: LazyContext = () => {
        const baseContext = typeof context === 'function' ? context() : (context || {});
        return {
          ...baseContext,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          } : error,
        };
      };
      this.log('warn', message, errorContext);
    } else {
      // Second argument is context
      this.log('warn', message, errorOrContext as LazyContext);
    }
  }

  /**
   * Error logging - error events that might still allow the application to continue
   * Always enabled
   */
  error(message: LazyMessage, error?: Error | unknown, context?: LazyContext): void {
    if (!error) {
      // No error provided, just log the message with context
      this.log('error', message, context);
      return;
    }

    // Create lazy context that includes the error
    const errorContext: LazyContext = () => {
      const baseContext = typeof context === 'function' ? context() : (context || {});
      return {
        ...baseContext,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
      };
    };
    this.log('error', message, errorContext);
  }

  /**
   * Request-specific logging helper
   * Automatically tagged with request metadata
   */
  request(method: string, path: string, context?: LazyContext): void {
    this.info(`${method} ${path}`, () => {
      const baseContext = typeof context === 'function' ? context() : (context || {});
      return { type: 'request', ...baseContext };
    });
  }

  /**
   * Performance tracking helper
   * Use for measuring operation durations
   */
  performance(operation: string, durationMs: number, context?: LazyContext): void {
    this.info(`Performance: ${operation}`, () => {
      const baseContext = typeof context === 'function' ? context() : (context || {});
      return { 
        type: 'performance', 
        durationMs, 
        ...baseContext 
      };
    });
  }

  /**
   * Check if debug logging is enabled
   * Useful for avoiding expensive operations when debug is disabled
   */
  isDebugEnabled(): boolean {
    return this.shouldLog('debug');
  }

  /**
   * Check if info logging is enabled
   */
  isInfoEnabled(): boolean {
    return this.shouldLog('info');
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;

// Export types for use in application code
export type { LogLevel, LogContext, LazyMessage, LazyContext };
