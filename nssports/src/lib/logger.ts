/**
 * Centralized logging utility for the application
 * Provides structured logging with different levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...context,
    };

    // In production, you might want to send logs to a service like Sentry, DataDog, etc.
    if (this.isDevelopment) {
      const logMethod = level === 'error' ? console.error : 
                       level === 'warn' ? console.warn : 
                       console.log;
      logMethod(`[${timestamp}] [${level.toUpperCase()}]`, message, context || '');
    } else if (level === 'error' || level === 'warn') {
      // In production, only log warnings and errors
      console[level](JSON.stringify(logData));
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
}

export const logger = new Logger();
export default logger;
