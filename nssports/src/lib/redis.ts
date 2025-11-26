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

    redisClient.on('error', (err) => {
      log.error('[Redis] ❌ Redis client error:', err);
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

// Export singleton instance getter
export const redis = getRedisClient();
