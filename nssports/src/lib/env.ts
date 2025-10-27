/**
 * Environment Variable Validation
 * 
 * Official Next.js Production Best Practices:
 * - Validate required environment variables at build time
 * - Provide clear error messages for missing config
 * - Type-safe environment access
 * 
 * Reference: https://nextjs.org/docs/app/guides/production-checklist
 */

import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  
  // Authentication
  AUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // App Configuration
  NODE_ENV: z.enum(["development", "production", "test"]),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default("NorthStar Sports"),
  
  // CORS
  ALLOWED_ORIGINS: z.string().optional(),
  
  // Optional: Monitoring & Analytics
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  
  // SportsGameOdds API (Primary - Required)
  // Official SDK: https://sportsgameodds.com/docs/sdk
  SPORTSGAMEODDS_API_KEY: z.string().min(1),
  
  // The Odds API (Deprecated - No longer used)
  // Kept for backward compatibility only, will be removed in future version
  THE_ODDS_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * Call this in next.config.ts to fail fast on missing config
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join(".")).join(", ");
      throw new Error(
        `❌ Invalid environment variables: ${missingVars}\n\n` +
        `Please check your .env file and ensure all required variables are set.\n` +
        `See .env.example for reference.`
      );
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 * Use this in your application code for type-safe access
 */
export function getEnv(): Env {
  return envSchema.parse(process.env);
}
