import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getEventsWithCache } from '@/lib/hybrid-cache';
import { transformSDKEvents } from '@/lib/transformers/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { applyStratifiedSampling } from '@/lib/devDataLimit';
import { MAIN_LINE_ODDIDS, getEvents as sdkGetEvents } from '@/lib/sportsgameodds-sdk';
import type { ExtendedSDKEvent } from '@/lib/transformers/sportsgameodds-sdk';

// Smart cache strategy: Let hybrid-cache.ts handle TTL (5s for live, 30-60s for upcoming)
// Route revalidation should match cache TTL for optimal performance
export const revalidate = 5; // Match live game cache TTL (was 10s)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Always run fresh, no static generation

export async function GET() {
  return withErrorHandling(async () => {
    try {
      // Silent operation - reduce log spam with 5s polling
      
      // Development-friendly limits
      const isDevelopment = process.env.NODE_ENV === 'development';
      const fetchLimit = isDevelopment ? 50 : 100;
      
      // Per-commit behavior: fetch live games per-league in parallel to isolate
      // failures and reduce partial/empty response races. This prevents a single
      // slow league from causing the whole live endpoint to appear empty.
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      // Operation timeout - allow slightly longer when fetching multiple leagues
      const OPERATION_TIMEOUT = 25000; // 25 seconds

      const operationPromise = Promise.allSettled([
        getEventsWithCache({
          leagueID: 'NBA',
          live: true,
          finalized: false,
          startsAfter: startOfToday.toISOString(),
          startsBefore: endOfToday.toISOString(),
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
        getEventsWithCache({
          leagueID: 'NCAAB',
          live: true,
          finalized: false,
          startsAfter: startOfToday.toISOString(),
          startsBefore: endOfToday.toISOString(),
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
        getEventsWithCache({
          leagueID: 'NFL',
          live: true,
          finalized: false,
          startsAfter: startOfToday.toISOString(),
          startsBefore: endOfToday.toISOString(),
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
        getEventsWithCache({
          leagueID: 'NCAAF',
          live: true,
          finalized: false,
          startsAfter: startOfToday.toISOString(),
          startsBefore: endOfToday.toISOString(),
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
        getEventsWithCache({
          leagueID: 'NHL',
          live: true,
          finalized: false,
          startsAfter: startOfToday.toISOString(),
          startsBefore: endOfToday.toISOString(),
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
        // Fallback: fetch ALL leagues (captures AHL, LIDOM, etc.) so we don't miss
        // live games from smaller leagues that aren't in the explicit list above.
        getEventsWithCache({
          live: true,
          finalized: false,
          startsAfter: startOfToday.toISOString(),
          startsBefore: endOfToday.toISOString(),
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          limit: fetchLimit,
        }),
      ]);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), OPERATION_TIMEOUT)
      );

      let results;
      try {
        // Race between operation and timeout
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results = await Promise.race([operationPromise, timeoutPromise]) as PromiseSettledResult<any>[];
      } catch (timeoutError) {
        logger.warn('[/api/games/live] Operation timeout, may return partial results');
        results = [
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
          { status: 'rejected' as const, reason: timeoutError },
        ];
      }

      const [nbaResult, ncaabResult, nflResult, ncaafResult, nhlResult, allResult] = results;

      // Merge results; prefer per-league fetches, then include any remaining events
      // from the all-leagues fetch. Dedupe by eventID to avoid duplicates.
      const merged: ExtendedSDKEvent[] = [];
      const pushIfNew = (arr: ExtendedSDKEvent[] | undefined) => {
        if (!arr) return;
        for (const ev of arr) {
          if (!merged.find(m => m.eventID === ev.eventID)) merged.push(ev);
        }
      };

      pushIfNew(nbaResult.status === 'fulfilled' ? nbaResult.value.data : []);
      pushIfNew(ncaabResult.status === 'fulfilled' ? ncaabResult.value.data : []);
      pushIfNew(nflResult.status === 'fulfilled' ? nflResult.value.data : []);
      pushIfNew(ncaafResult.status === 'fulfilled' ? ncaafResult.value.data : []);
      pushIfNew(nhlResult.status === 'fulfilled' ? nhlResult.value.data : []);
      // Include any other leagues returned by the global fetch
      pushIfNew(allResult && allResult.status === 'fulfilled' ? allResult.value.data : []);

      const liveEvents = merged;
      
      // Silent operation - only log errors, not every successful fetch
      
  // Transform SDK events to internal format
  // The transformer will use official Event.status fields to map status
  // Events from cache/SDK match ExtendedSDKEvent structure
  let games = await transformSDKEvents(liveEvents as ExtendedSDKEvent[]);
      
      // ⭐ Trust the SDK's live flag and our transformer's status mapping
      // The SDK query already filtered with live: true
      // Only add sanity check: keep games marked as 'live' status
      // Remove overly aggressive time-based filtering that was causing issues
      games = games.filter(game => {
        // Game must be marked as live by the transformer
        if (game.status !== 'live') {
          return false;
        }
        
        return true;
      });
      
      // Apply stratified sampling in development (Protocol I-IV)
      games = applyStratifiedSampling(games, 'leagueId');

      // Augment transformed games with any richer fields available on the
      // original SDK event payload. Some cache/DB rows may lack
      // `timeRemaining` or scores; prefer SDK/transformer-derived values
      // when available so the frontend receives the ticking clock/scores.
      const srcByEventId = new Map<string, ExtendedSDKEvent>();
      for (const ev of liveEvents) {
        if (!ev) continue;
        const maybe = ev as unknown as { eventID?: string };
        if (maybe.eventID) srcByEventId.set(maybe.eventID, ev as ExtendedSDKEvent);
      }

      const parseClockFromStatus = (status: unknown): string | undefined => {
        if (!status || typeof status !== 'object') return undefined;
        const s = status as { clock?: unknown; displayLong?: unknown; display?: unknown };
        if (typeof s.clock === 'string' && s.clock.trim()) return s.clock;
        const display = typeof s.displayLong === 'string' ? s.displayLong : (typeof s.display === 'string' ? s.display : '');
        const m = String(display).match(/(\d{1,2}:\d{2})/);
        return m ? m[1] : undefined;
      };

      const getNested = (o: unknown, path: string[]): unknown => {
        if (!o || typeof o !== 'object') return undefined;
        return path.reduce<unknown>((acc, key) => {
          if (acc && typeof acc === 'object' && Object.prototype.hasOwnProperty.call(acc, key)) {
            return (acc as Record<string, unknown>)[key];
          }
          return undefined;
        }, o);
      };

      games = games.map((g) => {
        const src = srcByEventId.get(String(g.id));

        const statusDisplayLong = getNested(src, ['status', 'displayLong']);
        const statusDisplay = getNested(src, ['status', 'display']);
        let periodDisplay = g.periodDisplay ?? (typeof statusDisplayLong === 'string' ? statusDisplayLong : (typeof statusDisplay === 'string' ? statusDisplay : undefined));

        // Explicit handling for NCAA Basketball games
        if (g.leagueId === 'ncaab') {
          const periodNumber = parseInt(g.period ?? '', 10);
          if (periodNumber === 1) {
            periodDisplay = '1st Half';
          } else if (periodNumber === 2) {
            periodDisplay = '2nd Half';
          }
        }

        const timeRemaining = g.timeRemaining ?? parseClockFromStatus(getNested(src, ['status'])) ?? undefined;

        const homeScoreCandidate = getNested(src, ['results', 'home', 'points']) ?? getNested(src, ['results', 'home_points']) ?? getNested(src, ['homeScore']);
        const homeScore = (typeof g.homeScore === 'number') ? g.homeScore : (typeof homeScoreCandidate === 'number' ? homeScoreCandidate : undefined);

        const awayScoreCandidate = getNested(src, ['results', 'away', 'points']) ?? getNested(src, ['results', 'away_points']) ?? getNested(src, ['awayScore']);
        const awayScore = (typeof g.awayScore === 'number') ? g.awayScore : (typeof awayScoreCandidate === 'number' ? awayScoreCandidate : undefined);

        return {
          ...g,
          periodDisplay,
          timeRemaining,
          homeScore,
          awayScore,
        };
      });
      
      // If some games are missing clock/score info, attempt a small SDK enrichment
      const needsEnrichment = games.filter(g => !g.timeRemaining || typeof g.homeScore !== 'number' || typeof g.awayScore !== 'number');
      if (needsEnrichment.length > 0) {
        try {
          const idsToFetch = needsEnrichment.map(g => String(g.id));
          // Fetch the SDK events for these IDs (odds-focused, but includes status/results)
          const sdkResp = await sdkGetEvents({ eventIDs: idsToFetch, oddIDs: MAIN_LINE_ODDIDS, includeOpposingOddIDs: true, live: true, includeConsensus: true, limit: idsToFetch.length });
          const sdkData = sdkResp?.data || [];
          if (sdkData.length > 0) {
            const enriched = await transformSDKEvents(sdkData as ExtendedSDKEvent[]);
            const enrichedById = new Map<string, typeof enriched[0]>();
            for (const e of enriched) enrichedById.set(String(e.id), e);
            games = games.map(g => {
              const enrichedGame = enrichedById.get(String(g.id));
              if (!enrichedGame) return g;
              return {
                ...g,
                timeRemaining: g.timeRemaining ?? enrichedGame.timeRemaining,
                homeScore: typeof g.homeScore === 'number' ? g.homeScore : enrichedGame.homeScore,
                awayScore: typeof g.awayScore === 'number' ? g.awayScore : enrichedGame.awayScore,
                periodDisplay: g.periodDisplay ?? enrichedGame.periodDisplay,
              };
            });
          }
        } catch (sdkErr) {
          logger.debug('Live enrichment failed', { err: sdkErr });
        }
      }

      const parsed = z.array(GameSchema).parse(games);
      
      // ✅ OPTIMIZATION: Add cache headers for live games
      // - Very short cache (5s) to ensure fresh data
      // - Longer stale-while-revalidate (30s) for smooth transitions
      const cacheOptions = { maxAge: 5, sMaxAge: 5, staleWhileRevalidate: 30 };
      
      return successResponse(parsed, 200, undefined, cacheOptions);
    } catch (error) {
      logger.error('Error fetching live games', error);
      
      return ApiErrors.serviceUnavailable(
        'Unable to fetch live sports data at this time. Please try again later.'
      );
    }
  });
}
