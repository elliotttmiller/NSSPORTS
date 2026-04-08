// Cache disabled for static export
export const CachePrefix = { GAMES: 'games:', ODDS: 'odds:', PLAYER_PROPS: 'player-props:', GAME_PROPS: 'game-props:', PLAYER_STATS: 'player-stats:', LIVE_GAMES: 'live:games:', USER_SESSION: 'session:' } as const;
export const CacheTTL = { LIVE_GAMES: 15, UPCOMING_GAMES: 60, ODDS_LIVE: 5, ODDS_UPCOMING: 30, PLAYER_PROPS: 60, GAME_PROPS: 60, PLAYER_STATS: 300, USER_SESSION: 3600 } as const;
export async function cacheGet<T>(_key: string): Promise<T | null> { return null; }
export async function cacheSet<T>(_key: string, _value: T, _ttl?: number): Promise<boolean> { return false; }
export async function cacheDelete(_key: string): Promise<boolean> { return false; }
export async function cacheDeletePattern(_pattern: string): Promise<number> { return 0; }
export async function cacheExists(_key: string): Promise<boolean> { return false; }
export async function cacheTTL(_key: string): Promise<number> { return -1; }
export async function cacheOrFetch<T>(_key: string, fetcher: () => Promise<T>, _ttl?: number): Promise<T> { return fetcher(); }
export async function cacheIncrement(_key: string, _ttl?: number): Promise<number> { return 0; }
export async function cacheFlushAll(): Promise<void> {}
export async function cacheStats() { return null; }
