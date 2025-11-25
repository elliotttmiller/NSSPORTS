/**
 * Temporary compatibility layer for debugLogger
 * @deprecated Use import { logger } from '@/lib/logger' instead
 * This file will be removed in the next major version
 */

import { GameListDebugLogger as NewDebugLogger } from './logger';

export class LegacyGameListDebugLogger {
  static info(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ GameListDebugLogger is deprecated. Use logger.createScopedLogger() instead.');
    }
    NewDebugLogger.info('LegacyComponent', message, data);
  }
  
  static warn(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ GameListDebugLogger is deprecated. Use logger.createScopedLogger() instead.');
    }
    NewDebugLogger.warn('LegacyComponent', message, data);
  }
  
  static error(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ GameListDebugLogger is deprecated. Use logger.createScopedLogger() instead.');
    }
    NewDebugLogger.error('LegacyComponent', message, data);
  }
}

// Export singleton for backward compatibility
export const debugLogger = {
  info: (message: string, data?: unknown) => LegacyGameListDebugLogger.info(message, data),
  warn: (message: string, data?: unknown) => LegacyGameListDebugLogger.warn(message, data),
  error: (message: string, data?: unknown) => LegacyGameListDebugLogger.error(message, data)
};


