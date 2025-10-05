/**
 * Centralized logging utility for the application
 * Provides structured logging with different levels
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

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      environment: process.env.NODE_ENV,
      ...context,
    };

    // In production, use structured JSON logging
    if (this.isProduction) {
      // Only log warnings and errors in production, or info if explicitly configured
      if (level === 'error' || level === 'warn' || (level === 'info' && process.env.LOG_LEVEL === 'info')) {
        console[level === 'error' || level === 'warn' ? level : 'log'](JSON.stringify(logData));
      }
    } else if (this.isDevelopment) {
      // In development, use colored console output
      const logMethod = level === 'error' ? console.error : 
                       level === 'warn' ? console.warn : 
                       console.log;
      logMethod(`[${timestamp}] [${level.toUpperCase()}]`, message, context || '');
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };
    this.log('error', message, errorContext);
  }

  // Request-specific logging helper
  request(method: string, path: string, context?: LogContext) {
    this.info(`${method} ${path}`, { type: 'request', ...context });
  }

  // Performance tracking helper
  performance(operation: string, durationMs: number, context?: LogContext) {
    this.info(`Performance: ${operation}`, { 
      type: 'performance', 
      durationMs, 
      ...context 
    });
  }
}

export const logger = new Logger();
export default logger;
