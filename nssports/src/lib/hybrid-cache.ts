/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Smart Cache System - PRIMARY Real-Time Data Source
 * 
 * This is the MAIN and ONLY required system for real-time odds/props updates.
 * Uses REST API polling with intelligent TTL-based caching for Pro Plan.
 * 
 * Core Architecture (Pro Plan - REST Polling):
 * - Prisma provides intelligent caching with dynamic TTL based on game timing
 * - SDK REST API is the source of truth, fetched when cache is stale
 * - 300 requests/minute rate limit (using 250/min for safety)
 * - Sub-minute update frequency for live games
 * 
 * Data Flow (Every Single Request):
 * 1. Check Prisma cache with smart TTL
 * 2. If fresh (within TTL): Return cached data immediately
 * 3. If stale (expired TTL): Fetch fresh data from SDK REST API
 * 4. Update cache with new data
 * 5. Return real-time data to frontend
 * 
 * Smart TTL Strategy (Automatic Based on Game Timing):
 * - LIVE games: 15s TTL (sub-minute updates for in-game odds)
 * - Games starting within 1 hour: 30s TTL (line movements accelerate near kickoff)
 * - Games starting 1-24 hours: 45s TTL (moderate market activity)
 * - Games starting 24+ hours: 60s TTL (odds relatively stable)
 * 
 * Why This Works Perfectly for Pro Plan:
 * - Sub-minute updates for live games (15s polling)
 * - 300 req/min allows ~20 concurrent live games at 15s intervals
 * - Efficient rate limit usage with smart TTL scaling
 * - Critical window (<1hr): Users get freshest data when it matters most
 * - Active window (1-24hr): Balanced freshness + performance
 * - Far future (24hr+): Optimized performance, odds are stable anyway
 * 
 * Note: Using `any` types for SDK responses as the sports-odds-api package
 * doesn't export proper TypeScript types. This is acceptable for external API data.
 */

import prisma from './prisma';
import { logger } from './logger';
import type { LeagueID } from '@/types/game';
import {
  getEvents as sdkGetEvents,
  getPlayerProps as sdkGetPlayerProps,
  getGameProps as sdkGetGameProps,
} from './sportsgameodds-sdk';
import { cacheGet, cacheSet, CachePrefix, CacheTTL } from './cache';
import { createHash } from 'crypto';

// In-memory map to deduplicate concurrent SDK fetches for identical queries.
// Keyed by a stable JSON representation of the fetch options.
const inflightFetches = new Map<string, Promise<{ data: any[]; source: string }>>();

function stableKeyForOptions(options: Record<string, any>) {
  // Create a shallow stable key - options are simple and not deeply nested in current usage
  const keys = Object.keys(options).sort();
  const obj: Record<string, any> = {};
  for (const k of keys) {
    const v = (options as any)[k];
    // Normalize undefined -> null to keep key stable
    obj[k] = v === undefined ? null : v;
  }
  return JSON.stringify(obj);
}

// Cache TTL in seconds - optimized for development/testing
/**
 * Smart Cache TTL Strategy - Pro Plan REST Polling Optimization
 * 
 * This TTL system powers real-time updates via REST API polling (Pro Plan).
 * Every request flows through this logic to determine data freshness automatically.
 * 
 * HOW IT WORKS:
 * 1. Every API request checks: "Is cached data still fresh?"
 * 2. Fresh = within TTL → Return immediately (microseconds response)
 * 3. Stale = expired TTL → Fetch from SDK REST API, update cache, return
 * 4. Result: Sub-minute real-time updates with optimal rate limit usage
 * 
 * TTL VALUES (Optimized for Pro Plan - 300 req/min):
 * 
 * LIVE GAMES (Game in progress):
 * - TTL: 5 seconds (aggressive real-time updates)
 * - Why: In-game odds change VERY rapidly during live play, need near-instant updates
 * - Rate limit: ~12 req/min per game (300/min allows 25+ concurrent live games)
 * - Critical for accurate live betting odds
 * 
 * CRITICAL WINDOW (Game starts in < 1 hour):
 * - TTL: 30 seconds  
 * - Why: Line movements accelerate as kickoff approaches
 * - Rate limit: ~2 req/min per game (efficient for pre-game rush)
 * 
 * ACTIVE WINDOW (Game starts in 1-24 hours):
 * - TTL: 45 seconds
 * - Why: Moderate betting activity, odds still moving
 * - Rate limit: ~1.3 req/min per game (balanced freshness + efficiency)
 * 
 * FAR FUTURE (Game starts in 24+ hours):
 * - TTL: 60 seconds
 * - Why: Odds relatively stable, lower betting volume
 * - Rate limit: ~1 req/min per game (optimized for many future games)
 * 
 * KEY INSIGHT: Live games need MUCH more aggressive polling than pre-game.
 * 5s TTL ensures odds changes are reflected almost immediately, which is
 * critical for live betting accuracy and user trust.
 */
const CACHE_TTL = {
  live: 5,         // Live games - aggressive real-time updates (was 15s, now 5s)
  critical: 30,    // <1hr to start - line movements accelerate
  active: 45,      // 1-24hr to start - moderate market activity  
  standard: 60,    // 24hr+ to start - stable odds
};

/**
 * Calculate dynamic TTL based on game start time and live status
 * Returns appropriate cache duration in seconds
 * 
 * Pro Plan Strategy: Use REST polling with smart TTL for sub-minute updates
 * Live games poll every 15s, upcoming games scale based on start time
 */
function getSmartCacheTTL(startTime: Date, isLive?: boolean): number {
  const now = new Date();
  const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // EXPLICIT LIVE GAME CHECK (highest priority)
  // Live games get 15s TTL for sub-minute REST polling updates
  if (isLive === true) {
    return CACHE_TTL.live;
  }
  
  // LIVE or already started (time-based fallback)
  // Games that started should use streaming, cache is emergency fallback
  if (hoursUntilStart <= 0) {
    return CACHE_TTL.live;
  }
  
  // CRITICAL WINDOW: < 1 hour to start (pre-game, odds volatile)
  if (hoursUntilStart < 1) {
    return CACHE_TTL.critical;
  }
  
  // ACTIVE WINDOW: 1-24 hours to start (moderate updates)
  if (hoursUntilStart < 24) {
    return CACHE_TTL.active;
  }
  
  // FAR FUTURE: 24+ hours to start (stable odds)
  return CACHE_TTL.standard;
}

/**
 * Fetch events with intelligent caching
 * - Checks cache first for performance
 * - Fetches from SDK if cache miss or stale
 * - Updates cache after SDK fetch
 * - NO fallback logic - only returns fresh SDK data or cached data within TTL
 */
export async function getEventsWithCache(options: {
  leagueID?: string;
  eventIDs?: string | string[];
  oddsAvailable?: boolean;
  oddIDs?: string; // Filter specific markets (e.g., "game-ml,game-ats,game-ou")
  bookmakerID?: string; // Filter specific sportsbooks
  includeOpposingOddIDs?: boolean; // Get both sides of markets (recommended: true)
  includeConsensus?: boolean; // CRITICAL: Request bookOdds calculations (defaults to true)
  live?: boolean;
  finalized?: boolean;
  limit?: number;
  startsAfter?: string;
  startsBefore?: string;
}) {
  const key = stableKeyForOptions(options as any);

  // If a full SDK fetch for this same options is already in-flight, reuse it
  const existing = inflightFetches.get(key);
  if (existing) {
    // Return the in-flight promise so we don't duplicate SDK calls
    return existing;
  }
  // Redis cache: use a stable key that includes all query params to avoid stale
  // collisions across different time window queries. We hash the serialized
  // options to keep keys short and deterministic.
  function redisKeyForOptions(opts: Record<string, any>) {
    const prefix = `${CachePrefix.LIVE_GAMES}${opts.leagueID || 'all'}`;
    const stable = stableKeyForOptions(opts);
    const hash = createHash('sha1').update(stable).digest('hex');
    return `${prefix}:${hash}`;
  }


  const skipRedisCache = false;
  
  if (!skipRedisCache) {
    const redisKey = redisKeyForOptions(options as any);

    try {
      const redisData = await cacheGet<any[]>(redisKey);
      if (redisData && redisData.length > 0) {
        logger.debug('[Cache] ✅ Redis hit:', { key: redisKey, count: redisData.length });
        return { data: redisData, source: 'redis' as const };
      }
    } catch (redisError) {
      logger.warn('[Cache] Redis check failed, falling back to Prisma', { error: redisError });
    }
  }
  
  // 1. Check Prisma cache (slower than Redis, but still fast)
  try {
    const cachedEvents = await getEventsFromCache(options);
    if (cachedEvents.length > 0) {
      logger.info(`[Cache] ✅ Prisma cache hit for ${options.leagueID || 'all'} (live=${options.live}): ${cachedEvents.length} games`);
      // If this is a live query, ensure the cached set contains at least one live game
      // Returning a cached set with no live games causes the live endpoint to show "no live games"
      if (options.live === true) {
        const liveCached = cachedEvents.filter((e: any) => e.status?.live === true);
        if (liveCached.length > 0) {
          if (!skipRedisCache) {
            const redisKey = redisKeyForOptions(options as any);
            const ttl = CacheTTL.LIVE_GAMES;
            await cacheSet(redisKey, liveCached, ttl);
          }
          return { data: liveCached, source: 'prisma-cache' as const };
        }

        // No live games in cached set - continue to SDK fetch / stale path
        logger.debug('[Cache] Prisma cache contains games but none are live; continuing to SDK for live query');
      } else {
        // Non-live queries can safely return the cached set
        if (!skipRedisCache) {
          const redisKey = redisKeyForOptions(options as any);
          const ttl = CacheTTL.UPCOMING_GAMES;
          await cacheSet(redisKey, cachedEvents, ttl);
        }

        return { data: cachedEvents, source: 'prisma-cache' as const };
      }
    } else {
      logger.info(`[Cache] ⚠️ Prisma cache miss for ${options.leagueID || 'all'} (live=${options.live}) - fetching from SDK`);
    }
  } catch (cacheError) {
    logger.warn('Prisma cache check failed, will fetch from SDK', { error: cacheError });
    // Continue to SDK fetch - cache errors shouldn't break the flow
  }

  // At this point, Prisma did not return a valid (non-expired) set.
  // Implement stale-while-revalidate: return stale Prisma data immediately if present
  // then revalidate in background. This improves perceived latency on cache misses.
  try {
    // Build the same 'where' filter used in getEventsFromCache to fetch raw entries
    const rawWhere: any = {};
    if (options.leagueID) rawWhere.leagueId = options.leagueID;
    if (options.startsAfter || options.startsBefore) {
      rawWhere.startTime = {};
      if (options.startsAfter) rawWhere.startTime.gte = new Date(options.startsAfter);
      if (options.startsBefore) rawWhere.startTime.lte = new Date(options.startsBefore);
    }

    const rawGames = await prisma.game.findMany({
      where: rawWhere,
      include: { homeTeam: true, awayTeam: true, odds: true },
      orderBy: { startTime: 'asc' },
    });

    if (rawGames.length > 0) {
      // Transform raw games to SDK format (no TTL filtering)
      const staleData = rawGames.map((game: any) => ({
        eventID: game.id,
        leagueID: game.leagueId.toUpperCase(),
        commence: game.startTime.toISOString(),
        startTime: game.startTime.toISOString(),
        activity: game.status === 'live' ? 'in_progress' : game.status === 'finished' ? 'final' : 'scheduled',
        status: {
          startsAt: game.startTime.toISOString(),
          live: game.status === 'live',
          completed: game.status === 'finished',
          ended: game.status === 'finished',
        },
        teams: {
          home: {
            teamID: game.homeTeamId,
            name: game.homeTeam.name,
            names: { long: game.homeTeam.name, short: game.homeTeam.shortName || game.homeTeam.name },
            logo: game.homeTeam.logo || '',
            standings: game.homeTeam.record ? { record: game.homeTeam.record } : undefined,
          },
          away: {
            teamID: game.awayTeamId,
            name: game.awayTeam.name,
            names: { long: game.awayTeam.name, short: game.awayTeam.shortName || game.awayTeam.name },
            logo: game.awayTeam.logo || '',
            standings: game.awayTeam.record ? { record: game.awayTeam.record } : undefined,
          },
        },
        scores: game.homeScore !== null ? { home: game.homeScore, away: game.awayScore } : undefined,
        period: game.period,
        clock: game.timeRemaining,
        odds: transformOddsFromCache(game.odds),
      }));

      // Revalidate in background - dedupe inflight SDK fetches
      const bgFetch = (async () => {
        const sdkPromise = (async () => {
          try {
            logger.info(`[SWR] Revalidating SDK for ${options.leagueID || 'all'} (live=${options.live})`);
            const { data: sdkEvents } = await sdkGetEvents({ ...options, includeConsensus: options.includeConsensus !== false });
            await Promise.all([updateEventsCache(sdkEvents)]);
            logger.info(`[SWR] Revalidation completed for ${options.leagueID || 'all'} (fetched=${sdkEvents.length})`);
            return { data: sdkEvents, source: 'sdk' as const };
          } catch (e) {
            logger.warn('[SWR] Background revalidation failed', { error: e });
            throw e;
          }
        })();

        // Track the revalidation so other callers don't start duplicate SDK requests
        inflightFetches.set(key, sdkPromise as any);
        try {
          return await sdkPromise;
        } finally {
          inflightFetches.delete(key);
        }
      })();

      // Fire-and-forget background revalidation
      bgFetch.catch(() => null);
      // If this is a live query, only return stale data if the stale set contains
      // at least one game that is still marked live in the DB. Returning stale
      // non-live games for a live endpoint causes the client to show "no live games".
      if (options.live === true) {
        const staleLive = staleData.filter((e: any) => e.status?.live === true);
        if (staleLive.length === 0) {
          // No live games in stale cache - skip returning stale and continue to SDK
          logger.debug('[Cache] Stale Prisma cache contains no live games, skipping stale return for live query');
        } else {
          logger.info(`[Cache] Returning stale Prisma live data for ${options.leagueID || 'all'} while revalidating (count=${staleLive.length})`);
          return { data: staleLive, source: 'stale-prisma-cache' as const };
        }
      } else {
        logger.info(`[Cache] Returning stale Prisma data for ${options.leagueID || 'all'} while revalidating (count=${staleData.length})`);
        return { data: staleData, source: 'stale-prisma-cache' as const };
      }
    }
  } catch (e) {
    logger.warn('Failed to fetch stale Prisma cache, continuing to SDK', { error: e });
  }
  
  // 2. Fetch from SDK (source of truth)
  // CRITICAL: Always request consensus odds (bookOdds) for real market data
  logger.info(`[SDK] 📡 Fetching from SDK for ${options.leagueID || 'all'} (live=${options.live})`);
  // Deduplicate concurrent SDK fetches for identical queries
  const sdkFetchPromise = (async () => {
    try {
      const { data: events } = await sdkGetEvents({ ...options, includeConsensus: options.includeConsensus !== false });
      logger.info(`[SDK] ✅ SDK returned ${events.length} events for ${options.leagueID || 'all'} (live=${options.live})`);
      return { data: events, source: 'sdk' as const };
    } catch (e) {
      logger.error('[SDK] SDK fetch failed', e);
      throw e;
    }
  })();

  // Track inflight SDK fetch so other identical callers reuse it
  inflightFetches.set(key, sdkFetchPromise as any);

  try {
    const sdkResult = await sdkFetchPromise;
    const events = sdkResult.data;

    // 3. Update Prisma cache for next request (async, non-blocking)
    const promises: Promise<unknown>[] = [updateEventsCache(events)];

    if (!skipRedisCache) {
      const ttl = options.live ? CacheTTL.LIVE_GAMES : CacheTTL.UPCOMING_GAMES;

      // If caller requested a specific league, write single key. If this was
      // a single all-leagues fetch (no options.leagueID), partition results
      // by league and write per-league keys so one league's cache write
      // doesn't evict or overwrite other leagues in Redis.
      if (options.leagueID) {
        const redisKey = `${CachePrefix.LIVE_GAMES}${options.leagueID}:${options.live ? 'live' : 'upcoming'}`;
        promises.push(cacheSet(redisKey, events, ttl) as any);
      } else {
        try {
          const byLeague: Record<string, any[]> = {};
          for (const ev of events) {
            const league = (ev.leagueID || 'all').toString().toUpperCase();
            if (!byLeague[league]) byLeague[league] = [];
            byLeague[league].push(ev);
          }

          for (const [league, arr] of Object.entries(byLeague)) {
            const redisKey = `${CachePrefix.LIVE_GAMES}${league}:${options.live ? 'live' : 'upcoming'}`;
            promises.push(cacheSet(redisKey, arr, ttl) as any);
          }
        } catch {
          // In case partitioning fails for unexpected data, fall back to writing
          // a global key to avoid losing cache entirely.
          const fallbackKey = `${CachePrefix.LIVE_GAMES}all:${options.live ? 'live' : 'upcoming'}`;
          promises.push(cacheSet(fallbackKey, events, ttl) as any);
        }
      }
    }

    Promise.all(promises).catch(error => {
      logger.error('Failed to update caches', error);
      // Don't throw - cache update failure shouldn't break the response
    });

    return { data: events, source: 'sdk' as const };
  } finally {
    inflightFetches.delete(key);
  }
}

/**
 * Update events in Prisma cache
 */
async function updateEventsCache(events: any[]) {
  try {
    // Only allow caching for leagues we support in the DB seed.
    // Prevents foreign key violations when the SDK returns leagues we haven't added (e.g. AHL)
    const SUPPORTED_LEAGUES = new Set<string>([
      'NBA', 'NCAAB', 'NFL', 'NCAAF', 'NHL', 'ATP', 'WTA', 'ITF'
    ]);

    for (const event of events) {
      // SDK v2 structure: start time in status.startsAt
      const startTimeValue = event.status?.startsAt;
      
      // Skip events without valid data - NO FALLBACKS
      if (!startTimeValue) {
        logger.warn(`Skipping event ${event.eventID} - missing status.startsAt`);
        continue;
      }
      
      if (!event.teams?.home?.teamID || !event.teams?.away?.teamID) {
        logger.warn(`Skipping event ${event.eventID} - missing team data`);
        continue;
      }
      
      const startTime = new Date(startTimeValue);
      
      // Validate the date is valid
      if (isNaN(startTime.getTime())) {
        logger.warn(`Skipping event ${event.eventID} - invalid start time: ${startTimeValue}`);
        continue;
      }
      
      // Extract team data from SDK v2 structure
      const homeTeam = event.teams.home;
      const awayTeam = event.teams.away;
      const leagueId = event.leagueID; // Keep uppercase to match SDK (NBA, NFL, NHL)

      // Skip leagues we haven't implemented/seeded in the DB to avoid FK errors
      if (!leagueId || !SUPPORTED_LEAGUES.has(String(leagueId).toUpperCase())) {
        logger.info(`[updateEventsCache] Skipping event ${event.eventID} - unsupported league: ${leagueId}`);
        continue;
      }
      
      // Helper function to generate local logo path using exact SDK team ID
      const getTeamLogoPath = (teamID: string, leagueId: string): string => {
        const leagueLogoPaths: Record<string, string> = {
          'NBA': '/logos/nba',
          'NFL': '/logos/nfl',
          'NHL': '/logos/nhl',
          'ATP': '/logos/atp',
          'WTA': '/logos/wta',
          'ITF': '/logos/itf',
        };
        const logoPath = leagueLogoPaths[leagueId];
        // Use the exact SDK team ID (e.g., SACRAMENTO_KINGS_NBA.svg)
        return logoPath ? `${logoPath}/${teamID}.svg` : '';
      };
      
      // Ensure teams exist in database first
      await prisma.team.upsert({
        where: { id: homeTeam.teamID },
        update: {
          name: homeTeam.names.long,
          shortName: homeTeam.names.short,
          logo: getTeamLogoPath(homeTeam.teamID, leagueId),
          record: homeTeam.standings?.record || null,
        },
        create: {
          id: homeTeam.teamID,
          name: homeTeam.names.long,
          shortName: homeTeam.names.short,
          logo: getTeamLogoPath(homeTeam.teamID, leagueId),
          leagueId: leagueId,
          record: homeTeam.standings?.record || null,
        },
      });
      
      await prisma.team.upsert({
        where: { id: awayTeam.teamID },
        update: {
          name: awayTeam.names.long,
          shortName: awayTeam.names.short,
          logo: getTeamLogoPath(awayTeam.teamID, leagueId),
          record: awayTeam.standings?.record || null,
        },
        create: {
          id: awayTeam.teamID,
          name: awayTeam.names.long,
          shortName: awayTeam.names.short,
          logo: getTeamLogoPath(awayTeam.teamID, leagueId),
          leagueId: leagueId,
          record: awayTeam.standings?.record || null,
        },
      });
      
      // Determine game status from SDK status object
      let gameStatus: string;
      if (event.status.live) {
        gameStatus = 'live';
      } else if (event.status.completed || event.status.ended) {
        gameStatus = 'finished';
      } else {
        gameStatus = 'upcoming';
      }
      
      // Extract scores from SDK event (for live and finished games)
      // Per SDK docs: event.scores contains { home: number, away: number } when available
      const homeScore = event.scores?.home ?? null;
      const awayScore = event.scores?.away ?? null;
      
      // Log score updates for finished games (critical for settlement verification)
      if (gameStatus === 'finished' && (homeScore !== null || awayScore !== null)) {
        logger.info(`[updateEventsCache] Storing final scores for ${event.eventID}: ${awayTeam.names.short} ${awayScore} @ ${homeTeam.names.short} ${homeScore}`);
      }
      
      // Check if game just finished (was not finished before, now is finished)
      const existingGame = await prisma.game.findUnique({
        where: { id: event.eventID },
        select: { status: true, homeScore: true, awayScore: true }
      });
      
      const gameJustFinished = existingGame && 
                               existingGame.status !== 'finished' && 
                               gameStatus === 'finished';
      
      // Upsert game
      await prisma.game.upsert({
        where: { id: event.eventID },
        update: {
          startTime,
          status: gameStatus,
          homeScore, // ⭐ CRITICAL: Update scores for settlement
          awayScore, // ⭐ CRITICAL: Update scores for settlement
          updatedAt: new Date(),
        },
        create: {
          id: event.eventID,
          leagueId: leagueId,
          homeTeamId: homeTeam.teamID,
          awayTeamId: awayTeam.teamID,
          startTime,
          status: gameStatus,
          homeScore, // Store initial scores (null for upcoming games)
          awayScore,
        },
      });
      
      // 🔥 REAL-TIME SETTLEMENT TRIGGER
      // If game just finished, immediately queue settlement job
      if (gameJustFinished && homeScore !== null && awayScore !== null) {
        logger.info(`[updateEventsCache] 🔥 Game just finished! Triggering immediate settlement: ${event.eventID}`);
        
        // Import settlement queue dynamically to avoid circular dependencies
        const { getSettlementQueue } = await import('../services/settlement-queue.service');
        
        // Queue immediate settlement job for this game (worker processes within seconds)
        const queue = getSettlementQueue();
        queue.addSettleGameJob(event.eventID, 1) // Priority 1 (highest)
          .then((job) => {
            logger.info(`[updateEventsCache] ✅ Real-time settlement job queued`, { 
              jobId: job.id,
              gameId: event.eventID,
              score: `${awayScore}-${homeScore}`
            });
          })
          .catch((error) => {
            logger.error(`[updateEventsCache] ❌ Failed to queue settlement`, { 
              error,
              gameId: event.eventID 
            });
          });
      }
      
      // Update odds if available
      if (event.odds) {
        await updateOddsCache(event.eventID, event.odds);
      }
    }
  } catch (error) {
    logger.error('Error updating events cache', error);
    // Don't throw - cache update failure shouldn't break the response
  }
}

/**
 * Update odds in Prisma cache
 */
async function updateOddsCache(gameId: string, oddsData: any) {
  try {
    // Delete old odds
    await prisma.odds.deleteMany({ where: { gameId } });
    
    // Insert new odds from SDK structure
    // SDK returns odds as: { "oddID": { fairOdds, fairSpread, fairOverUnder, ... } }
    const oddsToCreate: any[] = [];
    
    if (!oddsData || typeof oddsData !== 'object') {
      logger.warn(`No odds data to cache for game ${gameId}`);
      return;
    }
    
    // Process each odd by oddID
    Object.entries(oddsData).forEach(([oddID, oddData]: [string, any]) => {
      // Skip if not an object or if it's player/game props
      if (!oddData || typeof oddData !== 'object') return;
      
      // CRITICAL: Only process MAIN GAME ODDS (moneyline, spread, total)
      // Must match EXACTLY these patterns to exclude player props, quarter/half odds:
      // - "points-home-game-ml-home" or "points-away-game-ml-away" (moneyline)
      // - "points-home-game-sp-home" or "points-away-game-sp-away" (spread / ATS)
      // - "points-all-game-ou-over" or "points-all-game-ou-under" (game totals)
      // 
      // EXCLUDES:
      // - Player props: "points-PLAYER_ID-game-ou-over" (has player ID instead of home/away/all)
      // - Quarter odds: "points-home-1q-ml-home" (has period ID like 1q, 2q, 1h, 2h)
      // - Half odds: "points-away-1h-sp-away"
      //
      // Official format per docs: https://sportsgameodds.com/docs/data-types/odds
      if (!oddID.includes('-game-')) return;
      
      // Additional check: Must start with "points-home-", "points-away-", or "points-all-"
      // This excludes player props which have player IDs
      const isTeamOdd = oddID.startsWith('points-home-') || 
                        oddID.startsWith('points-away-') || 
                        oddID.startsWith('points-all-');
      
      if (!isTeamOdd) {
        // Silently skip non-team odds (player props, fantasy scores, etc.)
        // These are filtered out to focus on main game betting lines
        return;
      }
      
      // Extract CONSENSUS odds - SDK has already done sophisticated calculation!
      // Per official docs: https://sportsgameodds.com/docs/info/consensus-odds
      // - fairOdds: Most fair odds via linear regression + juice removal (SYMMETRIC)
      // - fairSpread/fairOverUnder: Most balanced line across all bookmakers
      // - bookOdds: Most common line (highest data points) - ASYMMETRIC REAL MARKET
      
      // ⭐ CRITICAL: Store BOTH fairOdds and bookOdds to preserve asymmetry
      const fairOddsValue = oddData.fairOdds ? parseFloat(String(oddData.fairOdds)) : null;
      const bookOddsValue = oddData.bookOdds ? parseFloat(String(oddData.bookOdds)) : null;
      
      // Skip if we don't have at least bookOdds (real market data)
      if (!bookOddsValue) return;
      
      // OFFICIAL ALGORITHM IMPLEMENTATION
      // Per docs: "Only positive lines are considered for over-unders and non-zero lines are considered for spreads"
      // If fairSpread returns 0, it means the algorithm excluded zero-spread lines from fair calculation
      // In this case, we MUST use bookSpread (which contains the actual consensus main line from bookmakers)
      let consensusSpread;
      if (oddData.fairSpread !== undefined && oddData.fairSpread !== null) {
        const parsed = parseFloat(String(oddData.fairSpread));
        // Use fairSpread ONLY if non-zero (per official algorithm excludes zero spreads)
        if (!isNaN(parsed) && parsed !== 0) {
          consensusSpread = oddData.fairSpread;
        } else {
          // Fair calculation returned 0 (excluded), use book consensus main line
          consensusSpread = oddData.bookSpread;
        }
      } else {
        consensusSpread = oddData.bookSpread;
      }
      
      // Same for totals: "Only positive lines are considered for over-unders"
      let consensusTotal;
      if (oddData.fairOverUnder !== undefined && oddData.fairOverUnder !== null) {
        const parsed = parseFloat(String(oddData.fairOverUnder));
        // Use fairOverUnder only if positive (per official algorithm)
        if (!isNaN(parsed) && parsed > 0) {
          consensusTotal = oddData.fairOverUnder;
        } else {
          consensusTotal = oddData.bookOverUnder;
        }
      } else {
        consensusTotal = oddData.bookOverUnder;
      }
      
      // CRITICAL: Get the ACTUAL line value from the oddData (what bookmakers are offering)
      // This distinguishes main lines from alternate lines
      const actualSpread = oddData.spread;
      const actualTotal = oddData.overUnder;
      
      // Debug logging for total odds
      if (oddID.includes('-game-ou-')) {
        const isMainTotal = oddID.includes('-all-game-ou-');
        logger.debug(`${isMainTotal ? 'MAIN' : 'TEAM'} Total odd: ${oddID}`, {
          consensusTotal,
          actualTotal,
          bookOdds: bookOddsValue,
          fairOdds: fairOddsValue,
          willStore: isMainTotal,
        });
      }
      
      // Determine bet type and selection from oddID
      // Examples: "points-away-game-ml-away", "points-home-game-sp-home", "points-all-game-ou-over"
      let betType: string;
      let selection: string;
      let line: number | undefined;
      
      if (oddID.includes('-game-ml-')) {
        betType = 'moneyline';
        selection = oddID.includes('-home') ? 'home' : 'away';
        line = undefined; // Moneyline has no line
      } else if (oddID.includes('-game-sp-')) {
        betType = 'spread';
        selection = oddID.includes('-home') ? 'home' : 'away';
        
        // Store the CONSENSUS spread line (SDK's calculated optimal line)
        // Per official docs, fairSpread is the most balanced line via linear regression
        if (consensusSpread !== undefined) {
          line = parseFloat(String(consensusSpread));
        } else if (actualSpread !== undefined) {
          // Fallback to actual if consensus not available
          line = parseFloat(String(actualSpread));
        }
      } else if (oddID.includes('-all-game-ou-')) {
        // CRITICAL: ONLY match "points-all-game-ou-" for MAIN game total
        // Excludes team totals: "points-home-game-ou-" and "points-away-game-ou-"
        // This ensures we only display the consensus game total, not individual team totals
        betType = 'total';
        selection = oddID.includes('-over') ? 'over' : 'under';
        
        // Store the CONSENSUS total line (SDK's calculated optimal line)
        // Per official docs: fairOverUnder is the most balanced line via linear regression
        // This gives us the TRUE main line (e.g., 226) not alternates (115, 117)
        if (consensusTotal !== undefined) {
          line = parseFloat(String(consensusTotal));
        } else if (actualTotal !== undefined) {
          // Fallback to actual if consensus not available
          line = parseFloat(String(actualTotal));
        }
      } else {
        return; // Skip other market types
      }
      
      // ⭐ Store BOTH bookOdds and fairOdds to preserve asymmetry
      oddsToCreate.push({
        gameId,
        betType,
        selection,
        odds: bookOddsValue || 0,         // Legacy field (use bookOdds)
        bookOdds: bookOddsValue || 0,     // Real market consensus (asymmetric)
        fairOdds: fairOddsValue,          // Mathematical odds (symmetric, optional)
        line,
        lastUpdated: new Date(),
      });
    });
    
    if (oddsToCreate.length > 0) {
      logger.info(`Caching ${oddsToCreate.length} odds for game ${gameId}`);
      await prisma.odds.createMany({
        data: oddsToCreate,
        skipDuplicates: true,
      });
    } else {
      logger.warn(`No processable odds found for game ${gameId}`);
    }
  } catch (error) {
    logger.error('Error updating odds cache', error);
  }
}

/**
 * Get events from Prisma cache with smart TTL filtering
 * Uses dynamic cache duration based on game start time
 */
async function getEventsFromCache(options: {
  leagueID?: string;
  live?: boolean;
  startsAfter?: string;
  startsBefore?: string;
}) {
  const where: any = {};
  
  if (options.leagueID) {
    // Use uppercase league ID to match SDK and database (NBA, NFL, NHL)
    where.leagueId = options.leagueID;
  }
  
  // ⭐ CRITICAL FIX: Don't filter by status in Prisma cache for live games
  // Problem: Games might be cached with status='upcoming' but are now live
  // The SDK will provide the correct live status when we refetch
  // Only use time-based filtering for the cache query
  // The transformer will handle the actual status mapping
  
  if (options.startsAfter || options.startsBefore) {
    where.startTime = {};
    if (options.startsAfter) {
      where.startTime.gte = new Date(options.startsAfter);
    }
    if (options.startsBefore) {
      where.startTime.lte = new Date(options.startsBefore);
    }
  }
  
  // Fetch all matching games (we'll filter by smart TTL per game)
  const games = await prisma.game.findMany({
    where,
    include: {
      homeTeam: true,
      awayTeam: true,
      odds: true,
    },
    orderBy: { startTime: 'asc' },
  });
  
  // Apply smart TTL filtering - each game gets its own cache duration
  // Use the smart TTL directly. Doubling TTL caused delayed score propagation
  // for live games; keep the aggressive TTL for live games to ensure timely updates.
  const now = new Date();
  // Aggregate expired-game diagnostics to avoid log flooding. By default we
  // emit a compact summary. Set NODE_ENV=development or LOG_CACHE_EXPIRES=true
  // to get detailed per-game samples.
  let expiredCount = 0;
  const expiredSamples: string[] = [];
  const verboseExpiry = process.env.NODE_ENV === 'development' || process.env.LOG_CACHE_EXPIRES === 'true';

  const validGames = games.filter((game: any) => {
  const isLive = game.status === 'live';
  const smartTTL = getSmartCacheTTL(game.startTime, isLive);
  const effectiveTTL = smartTTL; // honor smart TTL directly
  const ttlDate = new Date(now.getTime() - effectiveTTL * 1000);

    // Game is valid if it was updated within its smart TTL window
    const isValid = game.updatedAt >= ttlDate;

    if (!isValid) {
      expiredCount += 1;
      // collect a few samples for richer diagnostics without spamming logs
      if (verboseExpiry && expiredSamples.length < 5) {
        const hoursUntilStart = (game.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        expiredSamples.push(
          `Game ${game.id} cache expired (status: ${game.status}, effective TTL: ${effectiveTTL}s, hours until start: ${hoursUntilStart.toFixed(1)}h)`
        );
      }
    }

    return isValid;
  });

  // Emit a single diagnostic line instead of per-game messages. This keeps
  // production logs clean while still surfacing cache expiration activity.
  if (expiredCount > 0) {
    if (verboseExpiry) {
      logger.debug(`[hybrid-cache] ${expiredCount} cached games expired for league=${options.leagueID || 'ALL'}; samples:\n${expiredSamples.join('\n')}`);
    } else {
      logger.debug(`[hybrid-cache] ${expiredCount} cached games expired for league=${options.leagueID || 'ALL'}`);
    }
  }
  
  // Transform valid games to SDK format
  return validGames.map((game: any) => ({
    eventID: game.id,
    leagueID: game.leagueId.toUpperCase(),
    commence: game.startTime.toISOString(),
    startTime: game.startTime.toISOString(),
    activity: game.status === 'live' ? 'in_progress' : 
              game.status === 'finished' ? 'final' : 'scheduled',
    // ⭐ CRITICAL: Include status object with startsAt for transformer compatibility
    // The transformer expects status.startsAt (SDK v2 format)
    status: {
      startsAt: game.startTime.toISOString(),
      live: game.status === 'live',
      completed: game.status === 'finished',
      ended: game.status === 'finished',
    },
    teams: {
      home: {
        teamID: game.homeTeamId,
        name: game.homeTeam.name,
        names: {
          long: game.homeTeam.name,
          short: game.homeTeam.shortName || game.homeTeam.name,
        },
        logo: game.homeTeam.logo || '',
        standings: game.homeTeam.record ? {
          record: game.homeTeam.record,
        } : undefined,
      },
      away: {
        teamID: game.awayTeamId,
        name: game.awayTeam.name,
        names: {
          long: game.awayTeam.name,
          short: game.awayTeam.shortName || game.awayTeam.name,
        },
        logo: game.awayTeam.logo || '',
        standings: game.awayTeam.record ? {
          record: game.awayTeam.record,
        } : undefined,
      },
    },
    scores: game.homeScore !== null ? {
      home: game.homeScore,
      away: game.awayScore,
    } : undefined,
    period: game.period,
    clock: game.timeRemaining,
    odds: transformOddsFromCache(game.odds),
  }));
}

/**
 * Transform cached odds to SDK format
 * Returns odds in the new SDK structure: { "oddID": { fairOdds, bookOdds, ... } }
 * ⭐ PRESERVES ASYMMETRY by returning cached bookOdds (real market) and fairOdds separately
 */
function transformOddsFromCache(odds: any[]) {
  const oddsObject: any = {};
  
  odds.forEach(odd => {
    // Reconstruct oddID based on betType and selection
    // Examples: "points-away-game-ml-away", "points-home-game-sp-home", "points-all-game-ou-over"
    let oddID: string;
    
    if (odd.betType === 'moneyline') {
      oddID = `points-${odd.selection}-game-ml-${odd.selection}`;
    } else if (odd.betType === 'spread') {
      oddID = `points-${odd.selection}-game-sp-${odd.selection}`;
    } else if (odd.betType === 'total') {
      oddID = `points-all-game-ou-${odd.selection}`;
    } else {
      return; // Skip unknown types
    }
    
    // ⭐ CRITICAL: Return bookOdds (asymmetric) and fairOdds (symmetric) separately
    // The transformer expects bookOdds to be the real market consensus (asymmetric)
    // This preserves the market imbalance that you see on real sportsbooks
    oddsObject[oddID] = {
      oddID,
      // Use bookOdds if available, fallback to legacy odds field for backwards compatibility
      bookOdds: String(odd.bookOdds ?? odd.odds),
      bookSpread: odd.line != null ? String(odd.line) : undefined,
      bookOverUnder: odd.line != null ? String(odd.line) : undefined,
      // fairOdds is optional (symmetric mathematical odds)
      fairOdds: odd.fairOdds != null ? String(odd.fairOdds) : undefined,
      fairSpread: odd.line != null ? String(odd.line) : undefined,
      fairOverUnder: odd.line != null ? String(odd.line) : undefined,
    };
  });
  
  return oddsObject;
}

/**
 * Fetch player props with intelligent caching
 * - Checks cache first for performance
 * - Fetches from SDK if cache miss or stale
 * - Updates cache after SDK fetch
 * - NO fallback logic - only returns fresh SDK data or cached data within TTL
 */
export async function getPlayerPropsWithCache(eventID: string) {
  // 1. Check cache first for performance (with smart TTL)
  try {
    const cachedProps = await getPlayerPropsFromCache(eventID);
    if (cachedProps.length > 0) {
      // Silent cache hits - reduce logging spam
      return { data: cachedProps, source: 'cache' as const };
    }
  } catch (cacheError) {
    logger.warn('Cache check failed for player props, will fetch from SDK', { error: cacheError });
    // Continue to SDK fetch
  }
  
  // 2. Fetch from SDK (source of truth)
  const props = await sdkGetPlayerProps(eventID);
  
  // 3. Update Prisma cache for next request (async, non-blocking)
  updatePlayerPropsCache(eventID, props).catch(error => {
    logger.error('Failed to update player props cache', error);
    // Don't throw - cache update failure shouldn't break the response
  });
  
  return { data: props, source: 'sdk' as const };
}

/**
 * Update player props in Prisma cache
 */
async function updatePlayerPropsCache(gameId: string, props: any[]) {
  try {
    // Delete old props for this game
    await prisma.playerProp.deleteMany({ where: { gameId } });
    
    // Create new props - with validation
    const propsToCreate: any[] = [];
    
    for (const prop of props) {
      // Skip if prop doesn't have required fields
      if (!prop.player || !prop.player.playerID || !prop.player.name || !prop.propType) {
        logger.warn(`Skipping invalid player prop for game ${gameId}:`, prop);
        continue;
      }
      
      // Skip if odds are invalid
      if (typeof prop.overOdds !== 'number' && typeof prop.underOdds !== 'number') {
        logger.warn(`Skipping player prop with no valid odds for game ${gameId}:`, prop);
        continue;
      }
      
      // Skip if player doesn't have a valid teamID
      if (!prop.player.teamID) {
        logger.warn(`Skipping player prop with no teamID for game ${gameId}:`, {
          player: prop.player.name,
          playerId: prop.player.playerID
        });
        continue;
      }
      
      // Ensure team exists first
      try {
        await prisma.team.upsert({
          where: { id: prop.player.teamID },
          update: {},
          create: {
            id: prop.player.teamID,
            name: prop.player.teamID, // Use teamID as name if we don't have the actual name
            shortName: prop.player.teamID,
            logo: '', // Empty logo for now
          },
        });
      } catch (teamError) {
        logger.warn(`Failed to upsert team ${prop.player.teamID}, skipping player`, { error: teamError });
        continue;
      }
      
      // Ensure player exists
      try {
        await prisma.player.upsert({
          where: { id: prop.player.playerID },
          update: {
            name: prop.player.name,
            position: prop.player.position || 'N/A',
          },
          create: {
            id: prop.player.playerID,
            name: prop.player.name,
            teamId: prop.player.teamID,
            position: prop.player.position || 'N/A',
          },
        });
      } catch (playerError) {
        logger.warn(`Failed to upsert player ${prop.player.name}, skipping prop`, { error: playerError });
        continue;
      }
      
      propsToCreate.push({
        gameId,
        playerId: prop.player.playerID,
        statType: prop.propType,
        line: prop.line ?? 0, // Allow 0 as valid line
        overOdds: prop.overOdds ?? 0, // Keep precise odds value (e.g., -110, +125)
        underOdds: prop.underOdds ?? 0, // Keep precise odds value
        category: prop.propType,
        lastUpdated: new Date(),
      });
    }
    
    if (propsToCreate.length > 0) {
      logger.info(`Creating ${propsToCreate.length} valid player props for ${gameId}`);
      await prisma.playerProp.createMany({
        data: propsToCreate,
        skipDuplicates: true,
      });
    } else {
      logger.warn(`No valid player props to create for ${gameId}`);
    }
  } catch (error) {
    logger.error('Error updating player props cache', error);
  }
}

/**
 * Get player props from Prisma cache with smart TTL
 * 
 * CRITICAL: Checks game live status to apply appropriate TTL
 * - Live games: 10s TTL (streaming fallback)
 * - Upcoming games: 30s-120s TTL (based on start time)
 */
async function getPlayerPropsFromCache(gameId: string) {
  // Get game to determine smart TTL based on start time AND live status
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { 
      startTime: true,
      status: true,  // CRITICAL: Check if game is live
    },
  });
  
  if (!game) {
    logger.warn(`Game ${gameId} not found in cache for player props lookup`);
    return [];
  }
  // Determine if game is live (use official status or time-based fallback)
  const isLive = game.status === 'live';

  // Use smart TTL based on game start time AND live status
  // Live games get 10s TTL (streaming should be primary source)
  // Upcoming games get 30s-120s TTL (based on proximity to start)
  const smartTTL = getSmartCacheTTL(game.startTime, isLive);
  const ttlDate = new Date(Date.now() - smartTTL * 1000);

  logger.debug(`Player props cache lookup for ${gameId}`, {
    isLive,
    ttlSeconds: smartTTL,
    status: game.status,
  });

  const props = await prisma.playerProp.findMany({
    where: {
      gameId,
      lastUpdated: { gte: ttlDate },
    },
    include: {
      player: {
        include: {
          team: true,
        },
      },
    },
  });

  // Transform to SDK format
  return props.map((prop: any) => ({
    propID: prop.id,
    eventID: gameId,
    marketType: `player_${prop.statType}`,
    propType: prop.statType,
    player: {
      playerID: prop.player.id,
      name: prop.player.name,
      teamID: prop.player.teamId,
      position: prop.player.position,
    },
    line: prop.line,
    overOdds: prop.overOdds,
    underOdds: prop.underOdds,
    bookmakerID: 'cached',
    bookmakerName: 'Cached',
    lastUpdated: prop.lastUpdated.toISOString(),
  }));
}

/**
 * Fetch game props with intelligent caching
 * - Checks cache first for performance
 * - Fetches from SDK if cache miss or stale
 * - Updates cache after SDK fetch
 * - NO fallback logic - only returns fresh SDK data or cached data within TTL
 */
export async function getGamePropsWithCache(eventID: string) {
  // 1. Check cache first for performance (with smart TTL)
  try {
    const cachedProps = await getGamePropsFromCache(eventID);
    if (cachedProps.length > 0) {
      // Apply industry-standard period filtering before returning cached data
      const dbGame = await prisma.game.findUnique({
        where: { id: eventID },
        select: { 
          status: true, 
          period: true, 
          startTime: true,
          homeScore: true,
          awayScore: true,
          timeRemaining: true,
          league: { select: { id: true } }
        },
      });
      
      if (dbGame) {
        const { filterCompletedPeriodProps } = await import('./market-closure-rules');
        const gameState = {
          leagueId: dbGame.league?.id as unknown as LeagueID,
          status: dbGame.status as 'upcoming' | 'live' | 'finished',
          startTime: dbGame.startTime instanceof Date ? dbGame.startTime.toISOString() : String(dbGame.startTime),
          homeScore: dbGame.homeScore ?? undefined,
          awayScore: dbGame.awayScore ?? undefined,
          period: dbGame.period ?? undefined,
          timeRemaining: dbGame.timeRemaining ?? undefined,
        };

        const filteredProps = filterCompletedPeriodProps(cachedProps, gameState);
        return { data: filteredProps, source: 'cache' as const };
      }
      
      // Silent cache hits - reduce logging spam
      return { data: cachedProps, source: 'cache' as const };
    }
  } catch (cacheError) {
    logger.warn('Cache check failed for game props, will fetch from SDK', { error: cacheError });
    // Continue to SDK fetch
  }
  
  // 2. Fetch from SDK (source of truth)
  const props = await sdkGetGameProps(eventID);

  // 3. Apply industry-standard period filtering for live/finished games
  try {
    const dbGame = await prisma.game.findUnique({
      where: { id: eventID },
      select: { 
        status: true, 
        period: true, 
        startTime: true,
        homeScore: true,
        awayScore: true,
        timeRemaining: true,
        league: { select: { id: true } }
      },
    });

    if (dbGame && (dbGame.status === 'live' || dbGame.status === 'finished')) {
      const { filterCompletedPeriodProps } = await import('./market-closure-rules');
      const gameState = {
        leagueId: dbGame.league?.id as unknown as LeagueID,
        status: dbGame.status as 'upcoming' | 'live' | 'finished',
        startTime: dbGame.startTime instanceof Date ? dbGame.startTime.toISOString() : String(dbGame.startTime),
        homeScore: dbGame.homeScore ?? undefined,
        awayScore: dbGame.awayScore ?? undefined,
        period: dbGame.period ?? undefined,
        timeRemaining: dbGame.timeRemaining ?? undefined,
      };
      
      const filteredProps = filterCompletedPeriodProps(props, gameState);
      
      // Update cache with original props (before filtering)
      updateGamePropsCache(eventID, props).catch(error => {
        logger.error('Failed to update game props cache', error);
      });
      
      logger.info(`Filtered ${props.length - filteredProps.length} completed period props for game ${eventID}`);
      
      return { data: filteredProps, source: 'sdk' as const };
    }
  } catch (e) {
    logger.warn('Could not apply period filtering for game props', { gameId: eventID, error: e });
  }

  // 4. Update Prisma cache for next request (async, non-blocking)
  updateGamePropsCache(eventID, props).catch(error => {
    logger.error('Failed to update game props cache', error);
    // Don't throw - cache update failure shouldn't break the response
  });
  
  return { data: props, source: 'sdk' as const };
}


/**
 * Update game props in Prisma cache
 */
async function updateGamePropsCache(gameId: string, props: any[]) {
  try {
    // Delete old props for this game
    await prisma.gameProp.deleteMany({ where: { gameId } });
    
    // Create new props - with validation to prevent undefined fields
    const propsToCreate: any[] = [];
    
    for (const market of props) {
      // Skip if market doesn't have required fields
      if (!market.marketType || !market.outcomes || !Array.isArray(market.outcomes)) {
        logger.warn(`Skipping invalid market for game ${gameId}:`, market);
        continue;
      }
      
      for (const outcome of market.outcomes) {
        // Skip if outcome doesn't have required fields
        if (!outcome.name || typeof outcome.price !== 'number') {
          logger.warn(`Skipping invalid outcome for game ${gameId}:`, outcome);
          continue;
        }
        
        propsToCreate.push({
          gameId,
          propType: market.marketType,
          description: outcome.name,
          selection: outcome.name,
          odds: outcome.price, // Keep precise odds value (e.g., -110, +125)
          line: outcome.point ?? null, // Allow null for props without lines
          lastUpdated: new Date(),
        });
      }
    }
    
    if (propsToCreate.length > 0) {
      logger.info(`Creating ${propsToCreate.length} valid game props for ${gameId}`);
      await prisma.gameProp.createMany({
        data: propsToCreate,
        skipDuplicates: true,
      });
    } else {
      logger.warn(`No valid game props to create for ${gameId}`);
    }
  } catch (error) {
    logger.error('Error updating game props cache', error);
  }
}

/**
 * Get game props from Prisma cache with smart TTL
 * 
 * CRITICAL: Checks game live status to apply appropriate TTL
 * - Live games: 10s TTL (streaming fallback)
 * - Upcoming games: 30s-120s TTL (based on start time)
 */
async function getGamePropsFromCache(gameId: string) {
  // Get game to determine smart TTL based on start time AND live status
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { 
      startTime: true,
      status: true,  // CRITICAL: Check if game is live
    },
  });
  
  if (!game) {
    logger.warn(`Game ${gameId} not found in cache for game props lookup`);
    return [];
  }
  
  // Determine if game is live (use official status or time-based fallback)
  const isLive = game.status === 'live';
  
  // Use smart TTL based on game start time AND live status
  // Live games get 10s TTL (streaming should be primary source)
  // Upcoming games get 30s-120s TTL (based on proximity to start)
  const smartTTL = getSmartCacheTTL(game.startTime, isLive);
  const ttlDate = new Date(Date.now() - smartTTL * 1000);
  
  logger.debug(`Game props cache lookup for ${gameId}`, {
    isLive,
    ttlSeconds: smartTTL,
    status: game.status,
  });
  
  const props = await prisma.gameProp.findMany({
    where: {
      gameId,
      lastUpdated: { gte: ttlDate },
    },
  });
  
  // Transform to SDK format
  const grouped: Record<string, any> = {};
  
  props.forEach((prop: any) => {
    if (!grouped[prop.propType]) {
      grouped[prop.propType] = {
        marketID: `${gameId}_${prop.propType}`,
        eventID: gameId,
        marketType: prop.propType,
        bookmakerID: 'cached',
        bookmakerName: 'Cached',
        outcomes: [],
        lastUpdated: prop.lastUpdated.toISOString(),
      };
    }
    
    grouped[prop.propType].outcomes.push({
      name: prop.description,
      price: prop.odds,
      point: prop.line,
      type: prop.selection,
    });
  });
  
  return Object.values(grouped);
}
