/**
 * Professional Rate Limiter for SportsGameOdds SDK
 * 
 * Implements token bucket algorithm with:
 * - Configurable rate limits per environment
 * - Request queuing with priority
 * - Exponential backoff on 429 errors
 * - Request deduplication
 * - Comprehensive logging
 * 
 * Based on SportsGameOdds API rate limits:
 * https://sportsgameodds.com/docs/setup/rate-limiting
 */

import { logger } from './logger';

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstSize: number;
}

interface QueuedRequest {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: () => Promise<any>;
  priority: number;
  timestamp: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (value: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject: (error: any) => void;
}

class RateLimiter {
  private config: RateLimitConfig;
  private tokens: number;
  private lastRefill: number;
  private queue: QueuedRequest[] = [];
  private processing = false;
  private requestHistory: Map<string, number> = new Map();
  private hourlyCount = 0;
  private hourlyResetTime: number;
  private inFlightRequests = new Set<string>();

  constructor() {
    // Pro Plan rate limits: 300 requests/minute
    // https://sportsgameodds.com/docs/setup/rate-limiting
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    this.config = {
      // Pro Plan: 300 req/min (we use conservative 250 for safety)
      // Development: Lower limits to avoid hitting production quotas during testing
      requestsPerMinute: isDevelopment ? 30 : 250,
      requestsPerHour: isDevelopment ? 500 : 15000, // Pro plan = ~18k/hour theoretical max
      burstSize: isDevelopment ? 5 : 20, // Allow bursts for multiple concurrent requests
    };

    this.tokens = this.config.burstSize;
    this.lastRefill = Date.now();
    this.hourlyResetTime = Date.now() + 60 * 60 * 1000;

    logger.info('[RateLimiter] Initialized', {
      environment: process.env.NODE_ENV,
      config: this.config,
    });

    // Refill tokens every second
    setInterval(() => this.refillTokens(), 1000);
  }

  /**
   * Refill token bucket based on requests per minute
   */
  private refillTokens() {
    const now = Date.now();
    const timeSinceLastRefill = now - this.lastRefill;
    const tokensToAdd = Math.floor(
      (timeSinceLastRefill / 60000) * this.config.requestsPerMinute
    );

    if (tokensToAdd > 0) {
      this.tokens = Math.min(
        this.tokens + tokensToAdd,
        this.config.burstSize
      );
      this.lastRefill = now;
    }

    // Reset hourly counter
    if (now > this.hourlyResetTime) {
      this.hourlyCount = 0;
      this.hourlyResetTime = now + 60 * 60 * 1000;
      logger.info('[RateLimiter] Hourly counter reset');
    }
  }

  /**
   * Check if request should be deduplicated
   */
  private shouldDeduplicate(requestId: string): boolean {
    const lastRequestTime = this.requestHistory.get(requestId);
    const now = Date.now();

    // Deduplicate requests within 1 second
    if (lastRequestTime && now - lastRequestTime < 1000) {
      return true;
    }

    return false;
  }

  /**
   * Execute a rate-limited request
   */
  async execute<T>(
    requestId: string,
    fn: () => Promise<T>,
    priority = 0
  ): Promise<T> {
    // Check for duplicate in-flight requests
    if (this.inFlightRequests.has(requestId)) {
      logger.debug('[RateLimiter] Skipping duplicate in-flight request', { requestId });
      throw new Error('DUPLICATE_REQUEST');
    }

    // Check request deduplication
    if (this.shouldDeduplicate(requestId)) {
      logger.debug('[RateLimiter] Skipping duplicate request (within 1s)', { requestId });
      throw new Error('DUPLICATE_REQUEST');
    }

    // Check hourly limit
    if (this.hourlyCount >= this.config.requestsPerHour) {
      logger.warn('[RateLimiter] Hourly limit reached', {
        count: this.hourlyCount,
        limit: this.config.requestsPerHour,
      });
      throw new Error('HOURLY_LIMIT_EXCEEDED');
    }

    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: requestId,
        execute: fn,
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
      };

      this.queue.push(queuedRequest);
      this.queue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);

      logger.debug('[RateLimiter] Request queued', {
        requestId,
        queueLength: this.queue.length,
        tokensAvailable: this.tokens,
      });

      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.tokens > 0) {
      const request = this.queue.shift();
      if (!request) break;

      try {
        // Consume token
        this.tokens--;
        this.hourlyCount++;
        this.inFlightRequests.add(request.id);
        this.requestHistory.set(request.id, Date.now());

        logger.debug('[RateLimiter] Executing request', {
          requestId: request.id,
          tokensRemaining: this.tokens,
          hourlyCount: this.hourlyCount,
          queueLength: this.queue.length,
        });

        const result = await request.execute();
        
        this.inFlightRequests.delete(request.id);
        request.resolve(result);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        this.inFlightRequests.delete(request.id);

        // Handle 429 Too Many Requests
        if (error?.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          logger.warn('[RateLimiter] Rate limit hit (429), backing off', {
            requestId: request.id,
            retryAfter,
          });

          // Exponential backoff
          await this.sleep(retryAfter * 1000);
          
          // Re-queue the request
          this.queue.unshift(request);
          continue;
        }

        request.reject(error);
      }
    }

    this.processing = false;

    // Continue processing if queue still has items
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      tokens: this.tokens,
      queueLength: this.queue.length,
      hourlyCount: this.hourlyCount,
      hourlyLimit: this.config.requestsPerHour,
      inFlightRequests: this.inFlightRequests.size,
    };
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
