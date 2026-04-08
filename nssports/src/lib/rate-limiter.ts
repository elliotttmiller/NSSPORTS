// Rate limiter disabled for static export
export class RateLimiter {
  async acquire(): Promise<void> {}
  async release(): Promise<void> {}
  getMetrics() { return {}; }
}
export const rateLimiter = new RateLimiter();
export async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> { return fn(); }

export function applyStratifiedSampling<T>(items: T[], _limit: number): T[] { return items; }
export function applySingleLeagueLimit<T>(items: T[], _limit: number): T[] { return items; }
export function applyDevLimit<T>(items: T[], _limit: number): T[] { return items; }
export function isDevLimitingEnabled(): boolean { return false; }
