/**
 * Redis Client Configuration
 * ────────────────────────────────────────────────────────────────
 * Centralized Redis connection using ioredis for:
 * - Caching (live odds, game data, player stats)
 * - BullMQ job queues (settlement processing)
 * 
 * Features:
 * - Connection pooling
 * - Auto-reconnect
 * - Error handling
 * - Graceful shutdown
 */

import Redis from 'ioredis';
import { logger } from './logger';
import { inspect } from 'util';
const log = logger.createScopedLogger('Redis');

/**
 * Get Redis configuration from environment variables
 * This is a function to ensure env vars are read at runtime, not module load time
 */
function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    
    // Connection options
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false, // Disable ready check for faster connection
    enableOfflineQueue: true,
    lazyConnect: false, // Connect immediately

    // Decide whether to reconnect on certain errors. Return true to attempt reconnect.
    reconnectOnError(err: Error) {
      const e = err as Error & { code?: string; message?: string };
      const code = e.code ? String(e.code) : undefined;

      // Non-retryable errors (auth/command/redirects) — don't attempt reconnect
      const nonRetryable = ['NOAUTH', 'WRONGPASS', 'ERR', 'MOVED', 'ASK'];
      if (code && nonRetryable.includes(code)) {
        log.error('[Redis] Non-retryable Redis error received, will not reconnect', { code, message: e.message });
        return false;
      }

      // Retry for common transient network errors
      const retryable = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH'];
      if (code && retryable.includes(code)) {
        log.warn('[Redis] Transient network error, will attempt reconnect', { code, message: e.message });
        return true;
      }

      // Default: allow reconnect and let ioredis decide
      return true;
    },
    
    // Reconnection strategy - exponential backoff with a higher cap
    retryStrategy(times: number) {
      if (times > 20) {
        log.error('[Redis] Max reconnection attempts reached');
        return null; // Stop retrying after many attempts
      }
      const delay = Math.min(Math.pow(2, times) * 50, 30000); // up to 30s
      log.debug(`[Redis] Reconnecting attempt ${times}, delay: ${delay}ms`);
      return delay;
    },

  // Timeouts (increase to account for cloud latency)
  connectTimeout: 20000,
  // commandTimeout limits how long a single command may wait — increase to avoid spurious timeouts
  // Setting to null would disable per-command timeouts; choose 60s as a safer global default for networked Redis cloud instances
  commandTimeout: 60000,
    
    // TLS for Redis Cloud
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  };
}

// Singleton Redis client
let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const config = getRedisConfig();
    log.info('[Redis] Creating new Redis client...', {
      host: config.host,
      port: config.port,
    });

    redisClient = new Redis(config);

    // Event handlers
    redisClient.on('connect', () => {
      log.info('[Redis] ✅ Connected to Redis');
    });

    redisClient.on('ready', () => {
      log.info('[Redis] ✅ Redis client ready');
    });

    // Enhanced error logging: attempt to deeply serialize nested error objects so we
    // don't end up with message === '[object Object]'. Use JSON.stringify where
    // possible, otherwise fallback to util.inspect.
    redisClient.on('error', (err) => {
      const serialize = (v: unknown) => {
        if (v === undefined || v === null) return v;
        if (typeof v === 'string') return v;
        try {
          return JSON.stringify(v);
        } catch {
          return inspect(v, { depth: 6, maxArrayLength: 200 });
        }
      };

      try {
        const maybeErr = err as unknown as Record<string, unknown>;
        const errInfo = {
          message: maybeErr && 'message' in maybeErr ? serialize(maybeErr.message) : serialize(err),
          name: maybeErr && 'name' in maybeErr ? String(maybeErr.name) : undefined,
          stack: maybeErr && 'stack' in maybeErr ? String(maybeErr.stack) : undefined,
          code: maybeErr && 'code' in maybeErr ? String(maybeErr.code) : undefined,
          // include the whole error object for deep inspection
          raw: serialize(maybeErr),
          host: config.host,
          port: config.port,
          tls: !!config.tls,
        };

        // Use the underlying logger to pass the Error as the second argument
        // and metadata as the context. The scoped `log` helper only accepts
        // (message, data?) so calling it with three args would type-error.
        logger.error('[Redis] ❌ Redis client error', err as unknown as Error, errInfo);
      } catch (serErr) {
        // If serialization fails, log the inspected error so we don't lose information
        logger.error('[Redis] ❌ Redis client error (failed to serialize)', err as unknown as Error, { err: inspect(err, { depth: 6 }), serializeErrorFailure: String(serErr) });
      }
    });

    redisClient.on('close', () => {
      log.warn('[Redis] ⚠️  Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      log.debug('[Redis] 🔄 Reconnecting to Redis...');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
  log.info('[Redis] Received SIGTERM, closing Redis connection...');
      await redisClient?.quit();
      redisClient = null;
    });

    process.on('SIGINT', async () => {
  log.info('[Redis] Received SIGINT, closing Redis connection...');
      await redisClient?.quit();
      redisClient = null;
    });
  }

  return redisClient;
}

/**
 * Create a new Redis connection for workers
 * BullMQ workers need their own dedicated connections
 */
export function createRedisConnection(): Redis {
  const config = getRedisConfig();
  log.info('[Redis] Creating dedicated worker connection...');
  return new Redis(config);
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
  log.info('[Redis] Closing Redis connection...');
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Health check - verify Redis connectivity
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
  log.error('[Redis] Health check failed:', error);
    return false;
  }
}

// Export a lazily-initialized proxy that delegates to getRedisClient().
// This prevents creating the Redis connection at module import time (which can
// happen before environment variables are loaded by dotenv/Next.js) and
// ensures the client is created with the correct runtime environment.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const redis: Redis = new Proxy({} as any, {
  get(_target, prop: string | symbol) {
    const client = getRedisClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop as any];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  // Support await redis (not used here) and other reflective operations
  has(_target, prop) {
    const client = getRedisClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return prop in (client as any);
  }
} as ProxyHandler<Redis>) as unknown as Redis;
