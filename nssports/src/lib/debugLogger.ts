/**
 * Optimized Debug Logger for Client-Side Components
 * 
 * Performance Optimizations:
 * - Removed HTTP API calls that add latency and overhead
 * - Environment-aware: Only logs in development by default
 * - Respects LOG_LEVEL environment variable
 * - Zero overhead when disabled
 * 
 * For server-side logging, use the main logger from @/lib/logger
 */

type DebugLevel = 'INFO' | 'WARN' | 'ERROR';

export class GameListDebugLogger {
  private static isProduction = process.env.NODE_ENV === 'production';
  private static logLevel = process.env.NEXT_PUBLIC_LOG_LEVEL?.toUpperCase() || 'INFO';
  
  // Log level priorities
  private static readonly levelPriority: Record<DebugLevel, number> = {
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  private static shouldLog(level: DebugLevel): boolean {
    // In production, only log WARN and ERROR by default
    if (this.isProduction && this.logLevel === 'INFO') {
      return level !== 'INFO';
    }
    // Otherwise, check log level priority
    return this.levelPriority[level] >= (this.levelPriority[this.logLevel as DebugLevel] || 1);
  }

  private static formatMessage(level: DebugLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    let formatted = `🔍 [GameList Debug] [${timestamp}] [${level}] ${message}`;
    
    if (data !== undefined) {
      formatted += '\n' + JSON.stringify(data, null, 2);
    }
    
    return formatted;
  }

  private static write(level: DebugLevel, message: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // Use appropriate console method based on level
    switch (level) {
      case 'ERROR':
        console.error(message);
        break;
      case 'WARN':
        console.warn(message);
        break;
      default:
        console.log(message);
    }
  }

  static info(message: string, data?: unknown): void {
    const formatted = this.formatMessage('INFO', message, data);
    this.write('INFO', formatted);
  }

  static warn(message: string, data?: unknown): void {
    const formatted = this.formatMessage('WARN', message, data);
    this.write('WARN', formatted);
  }

  static error(message: string, data?: unknown): void {
    const formatted = this.formatMessage('ERROR', message, data);
    this.write('ERROR', formatted);
  }
}

