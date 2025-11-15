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

// Redis configuration from environment
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'redis-15342.c10.us-east-1-3.ec2.cloud.redislabs.com',
  port: parseInt(process.env.REDIS_PORT || '15342'),
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || 'Rv2x26xUeBzCpZiPKzLW4kz9oVLkqruY',
  
  // Connection options
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: true,
  enableOfflineQueue: true,
  
  // Reconnection strategy
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  
  // Timeouts
  connectTimeout: 10000,
  commandTimeout: 5000,
  
  // TLS for Redis Cloud
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
};

// Singleton Redis client
let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    logger.info('[Redis] Creating new Redis client...', {
      host: REDIS_CONFIG.host,
      port: REDIS_CONFIG.port,
    });

    redisClient = new Redis(REDIS_CONFIG);

    // Event handlers
    redisClient.on('connect', () => {
      logger.info('[Redis] ✅ Connected to Redis');
    });

    redisClient.on('ready', () => {
      logger.info('[Redis] ✅ Redis client ready');
    });

    redisClient.on('error', (err) => {
      logger.error('[Redis] ❌ Redis client error:', err);
    });

    redisClient.on('close', () => {
      logger.warn('[Redis] ⚠️  Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('[Redis] 🔄 Reconnecting to Redis...');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('[Redis] Received SIGTERM, closing Redis connection...');
      await redisClient?.quit();
      redisClient = null;
    });

    process.on('SIGINT', async () => {
      logger.info('[Redis] Received SIGINT, closing Redis connection...');
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
  logger.info('[Redis] Creating dedicated worker connection...');
  return new Redis(REDIS_CONFIG);
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    logger.info('[Redis] Closing Redis connection...');
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
    logger.error('[Redis] Health check failed:', error);
    return false;
  }
}

// Export singleton instance getter
export const redis = getRedisClient();
