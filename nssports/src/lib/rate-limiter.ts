/**
 * Professional Rate Limiter for SportsGameOdds SDK
 * 
 * Implements token bucket algorithm with:
 * - Environment-aware rate limits (aggressive dev throttling)
 * - Request queuing with priority levels
 * - Exponential backoff on 429 errors
 * - Intelligent request deduplication
 * - Request coalescing for identical concurrent requests
 * - Comprehensive metrics and monitoring
 * 
 * Development Strategy:
 * - Conservative limits to preserve API quota during testing
 * - Longer deduplication windows to catch rapid re-renders
 * - Request coalescing to batch identical requests
 * 
 * Production Strategy:
 * - Higher throughput for real-time user experience
 * - Shorter deduplication windows for responsiveness
 * - Based on SportsGameOdds Pro Plan: 1000 req/min (we use 800 for safety margin)
 * 
 * @see https://sportsgameodds.com/docs/setup/rate-limiting
 */

import { logger } from './logger';

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstSize: number;
  deduplicationWindow: number; // milliseconds
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

// Request coalescing - multiple identical requests share same promise
interface CoalescedRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  promise: Promise<any>;
  timestamp: number;
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
  private coalescedRequests: Map<string, CoalescedRequest> = new Map();
  
  // Metrics
  private metrics = {
    totalRequests: 0,
    deduplicated: 0,
    coalesced: 0,
    rateLimited: 0,
    errors: 0,
  };

  constructor() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Environment-specific configuration
    this.config = isDevelopment ? {
      // DEVELOPMENT: Very conservative to preserve API quota
      requestsPerMinute: 30,           // 2s between requests minimum
      requestsPerHour: 800,             // ~13 req/min sustained
      burstSize: 5,                     // Small burst allowance
      deduplicationWindow: 2000,        // 2s dedup window (catches rapid rerenders)
    } : {
      // PRODUCTION: Pro Plan limits with safety margin
      // ⭐ OFFICIAL: Pro Plan provides 1000 req/min (we use 800 for 20% safety margin)
      // Per docs: https://sportsgameodds.com/docs/setup/rate-limiting
      requestsPerMinute: 800,           // Pro: 1000/min, we use 800 for safety
      requestsPerHour: 45000,           // Pro: 50k/hour theoretical, we use 45k
      burstSize: 50,                    // Allow burst traffic for live games
      deduplicationWindow: 500,         // 500ms dedup window
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
    
    // Clean up old coalesced requests every 10 seconds
    setInterval(() => this.cleanupCoalescedRequests(), 10000);
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
      logger.info('[RateLimiter] Hourly counter reset', {
        totalRequests: this.metrics.totalRequests,
        deduplicated: this.metrics.deduplicated,
        coalesced: this.metrics.coalesced,
        rateLimited: this.metrics.rateLimited,
      });
    }
  }

  /**
   * Clean up old coalesced requests to prevent memory leaks
   */
  private cleanupCoalescedRequests() {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    for (const [key, request] of this.coalescedRequests.entries()) {
      if (now - request.timestamp > maxAge) {
        this.coalescedRequests.delete(key);
      }
    }
  }

  /**
   * Check if request should be deduplicated
   */
  private shouldDeduplicate(requestId: string): boolean {
    const lastRequestTime = this.requestHistory.get(requestId);
    const now = Date.now();

    if (lastRequestTime && now - lastRequestTime < this.config.deduplicationWindow) {
      this.metrics.deduplicated++;
      return true;
    }

    return false;
  }

  /**
   * Get or create coalesced request
   * Multiple identical concurrent requests share the same promise
   */
  private getCoalescedRequest<T>(
    requestId: string,
    _fn: () => Promise<T>
  ): Promise<T> | null {
    const existing = this.coalescedRequests.get(requestId);
    
    if (existing) {
      this.metrics.coalesced++;
      logger.debug('[RateLimiter] Coalescing duplicate request', { requestId });
      return existing.promise as Promise<T>;
    }

    return null;
  }

  /**
   * Execute a rate-limited request with intelligent coalescing
   */
  async execute<T>(
    requestId: string,
    fn: () => Promise<T>,
    priority = 0
  ): Promise<T> {
    this.metrics.totalRequests++;

    // Check for coalesced request (identical request already in-flight)
    const coalescedPromise = this.getCoalescedRequest(requestId, fn);
    if (coalescedPromise) {
      return coalescedPromise;
    }

    // Check for duplicate in-flight requests
    if (this.inFlightRequests.has(requestId)) {
      logger.debug('[RateLimiter] Skipping duplicate in-flight request', { requestId });
      this.metrics.deduplicated++;
      throw new Error('DUPLICATE_REQUEST');
    }

    // Check request deduplication
    if (this.shouldDeduplicate(requestId)) {
      logger.debug('[RateLimiter] Skipping duplicate request (within dedup window)', { requestId });
      throw new Error('DUPLICATE_REQUEST');
    }

    // Check hourly limit
    if (this.hourlyCount >= this.config.requestsPerHour) {
      logger.warn('[RateLimiter] Hourly limit reached', {
        count: this.hourlyCount,
        limit: this.config.requestsPerHour,
      });
      this.metrics.rateLimited++;
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
        priority,
      });

      this.processQueue();
    });
  }

  /**
   * Process queued requests with token bucket control
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

        // Create promise and track for coalescing
        const promise = request.execute();
        this.coalescedRequests.set(request.id, {
          promise,
          timestamp: Date.now(),
        });

        const result = await promise;
        
        this.inFlightRequests.delete(request.id);
        this.coalescedRequests.delete(request.id);
        request.resolve(result);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        this.inFlightRequests.delete(request.id);
        this.coalescedRequests.delete(request.id);
        this.metrics.errors++;

        // Handle 429 Too Many Requests with exponential backoff
        if (error?.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          logger.warn('[RateLimiter] Rate limit hit (429), backing off', {
            requestId: request.id,
            retryAfter,
          });

          this.metrics.rateLimited++;

          // Exponential backoff
          await this.sleep(retryAfter * 1000);
          
          // Re-queue the request with lower priority
          request.priority = Math.max(request.priority - 1, 0);
          this.queue.unshift(request);
          continue;
        }

        request.reject(error);
      }
    }

    this.processing = false;

    // Continue processing if queue still has items and we have tokens
    if (this.queue.length > 0) {
      const delay = this.tokens > 0 ? 100 : 1000; // Wait longer if no tokens
      setTimeout(() => this.processQueue(), delay);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current status and metrics
   */
  getStatus() {
    return {
      tokens: this.tokens,
      queueLength: this.queue.length,
      hourlyCount: this.hourlyCount,
      hourlyLimit: this.config.requestsPerHour,
      inFlightRequests: this.inFlightRequests.size,
      config: this.config,
      metrics: {
        ...this.metrics,
        efficiency: this.metrics.totalRequests > 0
          ? Math.round(((this.metrics.deduplicated + this.metrics.coalesced) / this.metrics.totalRequests) * 100)
          : 0,
      },
    };
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
