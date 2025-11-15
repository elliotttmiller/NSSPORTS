/**
 * Redis Cache Utility
 * ────────────────────────────────────────────────────────────────
 * High-level caching wrapper with:
 * - Type-safe get/set operations
 * - TTL management
 * - Cache key namespacing
 * - JSON serialization
 * - Error handling
 */

import { redis } from './redis';
import { logger } from './logger';

/**
 * Cache key prefixes for organization
 */
export const CachePrefix = {
  GAMES: 'games:',
  ODDS: 'odds:',
  PLAYER_PROPS: 'player-props:',
  GAME_PROPS: 'game-props:',
  PLAYER_STATS: 'player-stats:',
  LIVE_GAMES: 'live:games:',
  USER_SESSION: 'session:',
} as const;

/**
 * Default TTL values (in seconds)
 */
export const CacheTTL = {
  LIVE_GAMES: 15,           // 15 seconds - live data needs frequent updates
  UPCOMING_GAMES: 60,       // 1 minute - upcoming games change less frequently
  ODDS_LIVE: 5,             // 5 seconds - live odds update rapidly
  ODDS_UPCOMING: 30,        // 30 seconds - upcoming odds more stable
  PLAYER_PROPS: 60,         // 1 minute - player props
  GAME_PROPS: 60,           // 1 minute - game props
  PLAYER_STATS: 300,        // 5 minutes - stats after game finishes
  USER_SESSION: 3600,       // 1 hour - user sessions
} as const;

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error('[Cache] Error getting key:', { key, error });
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttl?: number
): Promise<boolean> {
  try {
    const serialized = JSON.stringify(value);
    
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
    
    return true;
  } catch (error) {
    logger.error('[Cache] Error setting key:', { key, error });
    return false;
  }
}

/**
 * Delete value from cache
 */
export async function cacheDelete(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    logger.error('[Cache] Error deleting key:', { key, error });
    return false;
  }
}

/**
 * Delete multiple keys matching pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    
    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    logger.error('[Cache] Error deleting pattern:', { pattern, error });
    return 0;
  }
}

/**
 * Check if key exists in cache
 */
export async function cacheExists(key: string): Promise<boolean> {
  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error('[Cache] Error checking existence:', { key, error });
    return false;
  }
}

/**
 * Get remaining TTL for a key
 */
export async function cacheTTL(key: string): Promise<number> {
  try {
    return await redis.ttl(key);
  } catch (error) {
    logger.error('[Cache] Error getting TTL:', { key, error });
    return -1;
  }
}

/**
 * Cache-aside pattern helper
 * Try cache first, fallback to fetcher function, cache result
 */
export async function cacheOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    logger.debug('[Cache] ✅ Cache hit:', { key });
    return cached;
  }
  
  // Cache miss - fetch data
  logger.debug('[Cache] ❌ Cache miss, fetching:', { key });
  const data = await fetcher();
  
  // Store in cache
  await cacheSet(key, data, ttl);
  
  return data;
}

/**
 * Increment counter (useful for rate limiting)
 */
export async function cacheIncrement(
  key: string,
  ttl?: number
): Promise<number> {
  try {
    const value = await redis.incr(key);
    
    // Set TTL on first increment
    if (value === 1 && ttl) {
      await redis.expire(key, ttl);
    }
    
    return value;
  } catch (error) {
    logger.error('[Cache] Error incrementing:', { key, error });
    return 0;
  }
}

/**
 * Flush all cache (use with caution)
 */
export async function cacheFlushAll(): Promise<void> {
  try {
    await redis.flushall();
    logger.info('[Cache] ⚠️  Flushed entire cache');
  } catch (error) {
    logger.error('[Cache] Error flushing cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function cacheStats() {
  try {
    const info = await redis.info('stats');
    const keyspace = await redis.info('keyspace');
    
    return {
      info,
      keyspace,
      totalKeys: await redis.dbsize(),
    };
  } catch (error) {
    logger.error('[Cache] Error getting stats:', error);
    return null;
  }
}
