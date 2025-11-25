/**
 * Centralized Logger Configuration
 * Safe environment variable parsing for both server and client
 */

export interface LoggerConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  includeStacks: boolean;
  isProduction: boolean;
  service: string;
  version: string;
  prettyPrint: boolean;
  telemetryEnabled: boolean;
  rateLimit: {
    enabled: boolean;
    maxErrorsPerMinute: number;
    windowMs: number;
  };
  redaction?: (data: unknown) => unknown;
}

class LoggerConfigManager {
  private static instance: LoggerConfigManager;
  private config: LoggerConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): LoggerConfigManager {
    if (!LoggerConfigManager.instance) {
      LoggerConfigManager.instance = new LoggerConfigManager();
    }
    return LoggerConfigManager.instance;
  }

  private loadConfig(): LoggerConfig {
    const isProduction = this.getEnvVar('NODE_ENV', 'development') === 'production';
    
    const rawConfig = {
      logLevel: this.getEnvVar('LOG_LEVEL', 'info', true),
      includeStacks: this.getEnvVar('LOG_INCLUDE_STACKS', isProduction ? 'false' : 'true', true) !== 'false',
      isProduction,
      service: this.getEnvVar('SERVICE_NAME', 'game-list', false),
      version: this.getEnvVar('VERSION', '1.0.0', false),
      prettyPrint: this.getEnvVar('LOG_PRETTY_LOCAL', 'false', true) === 'true',
      telemetryEnabled: this.getEnvVar('LOG_TELEMETRY_ENABLED', 'false', true) === 'true',
      rateLimit: {
        enabled: this.getEnvVar('LOG_RATE_LIMIT_ENABLED', 'true', true) === 'true',
        maxErrorsPerMinute: Math.max(1, parseInt(this.getEnvVar('LOG_RATE_LIMIT_MAX_ERRORS', '10', false)) || 10),
        windowMs: Math.max(1000, parseInt(this.getEnvVar('LOG_RATE_LIMIT_WINDOW_MS', '60000', false)) || 60000)
      }
    };

    return {
      ...rawConfig,
      logLevel: this.validateLogLevel(rawConfig.logLevel),
      prettyPrint: rawConfig.isProduction ? false : rawConfig.prettyPrint,
    };
  }

  private getEnvVar(key: string, defaultValue: string, lowercase: boolean = false): string {
    try {
      const normalizedKey = key.toUpperCase();
      let value: string | undefined;
      
      // Browser environment
      if (typeof window !== 'undefined') {
        // Try NEXT_PUBLIC_ prefixed vars first
        value = (window as unknown as Record<string, unknown>)[`NEXT_PUBLIC_${normalizedKey}`] as string | undefined;
        if (value === undefined) {
          // Try direct key (case insensitive)
          for (const [windowKey, windowValue] of Object.entries(window as unknown as Record<string, unknown>)) {
            if (windowKey.toUpperCase() === normalizedKey) {
              value = String(windowValue as unknown);
              break;
            }
          }
        }
        
        // Try process.env
        if (value === undefined && typeof process !== 'undefined' && process.env) {
          for (const [envKey, envValue] of Object.entries(process.env)) {
            if (envKey.toUpperCase() === normalizedKey) {
              value = String(envValue as unknown);
              break;
            }
          }
        }
      } else {
        // Server environment
        if (typeof process !== 'undefined' && process.env) {
          for (const [envKey, envValue] of Object.entries(process.env)) {
            if (envKey.toUpperCase() === normalizedKey) {
              value = String(envValue as unknown);
              break;
            }
          }
        }
      }
      
      const finalValue = value !== undefined ? value : defaultValue;
      return lowercase ? finalValue.toLowerCase() : finalValue;
    } catch {
      return lowercase ? defaultValue.toLowerCase() : defaultValue;
    }
  }

  private validateLogLevel(level: string): 'debug' | 'info' | 'warn' | 'error' {
    const normalizedLevel = level.toLowerCase();
    const validLevels = ['debug', 'info', 'warn', 'error'];
    return (validLevels.includes(normalizedLevel) ? (normalizedLevel as 'debug' | 'info' | 'warn' | 'error') : 'info');
  }

  getConfig(): LoggerConfig {
    return this.config;
  }

  refreshConfig(): void {
    this.config = this.loadConfig();
  }

  setRedaction(redactionFn: (data: unknown) => unknown): void {
    this.config.redaction = redactionFn;
  }
}

export const loggerConfig = LoggerConfigManager.getInstance();
export const getLoggerConfig = () => loggerConfig.getConfig();
