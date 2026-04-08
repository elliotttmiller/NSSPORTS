// Environment - simplified for static export
export const env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  AUTH_SECRET: process.env.AUTH_SECRET || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'NSSPORTS',
  SPORTSGAMEODDS_API_KEY: process.env.SPORTSGAMEODDS_API_KEY || process.env.NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
} as const;

export type Env = typeof env;

export function validateEnv(): Env { return env; }
export function getEnv(): Env { return env; }
