/**
 * Sports Odds API – Client-Side Service Layer
 *
 * This module is the single point of integration between the Next.js static
 * export frontend and the SportsGameOdds SDK.
 *
 * Because the app is deployed as a fully-static bundle on GitHub Pages there
 * are no server-side API routes.  All data is fetched directly from the
 * SportsGameOdds REST API using the official TypeScript SDK, whose key is
 * injected at build time via the NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY env var
 * (sourced from the SPORTSGAMEODDS_API_KEY GitHub repo secret).
 *
 * Architecture:
 *   GitHub Secret (SPORTSGAMEODDS_API_KEY)
 *     → GitHub Actions workflow env (NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY)
 *       → next.config.ts env section (bakes value into bundle)
 *         → getSportsGameOddsClient() in sportsgameodds-sdk.ts
 *           → this service layer (all data-fetch helpers)
 *             → React hooks / Zustand stores / UI components
 */

import type { Game, Sport, League, PaginatedResponse } from "@/types";
import { BetsResponseSchema } from "@/lib/schemas/bets";
import { useDebugStore } from "@/store/debugStore";
import {
  getEvents,
  getAllEvents,
  getLeagues as sdkGetLeagues,
  MAIN_LINE_ODDIDS,
  REPUTABLE_BOOKMAKERS,
} from "@/lib/sportsgameodds-sdk";
import {
  transformSDKEvents,
  transformSDKEvent,
  getSportForLeague,
} from "@/lib/transformers/sportsgameodds-sdk";
import type { ExtendedSDKEvent } from "@/lib/transformers/sportsgameodds-sdk";
import { STATIC_SPORTS, getStaticLeague } from "@/lib/data/sportsDatabase";

// ---------------------------------------------------------------------------
// SDK league shape (the SDK types these as `any`; we use a minimal interface)
// ---------------------------------------------------------------------------

interface SDKLeague {
  leagueID?: string;
  id?: string;
  name?: string;
  names?: { long?: string; medium?: string; short?: string };
}

// ---------------------------------------------------------------------------
// Debug store initialisation
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  const debugStore = useDebugStore.getState();
  const hostname = window.location.hostname;
  // Precise GitHub Pages detection: must end with ".github.io" or equal "github.io"
  const isGitHubPages =
    hostname === 'github.io' || hostname.endsWith('.github.io');
  debugStore.setConfig({
    environment: process.env.NODE_ENV || 'development',
    apiKeyConfigured: !!process.env.NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY,
    apiKey: process.env.NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY || null,
    useDirectSDK: true,
    isGitHubPages,
  });
}

// ---------------------------------------------------------------------------
// Shared query options – applied to every events request
// ---------------------------------------------------------------------------

const EVENTS_QUERY_BASE = {
  oddsAvailable: true,
  oddIDs: MAIN_LINE_ODDIDS,
  includeOpposingOddIDs: true,
  includeConsensus: true,
  bookmakerID: REPUTABLE_BOOKMAKERS,
} as const;

// Human-readable sport display names
const SPORT_DISPLAY_NAMES: Record<string, string> = {
  BASKETBALL: 'Basketball',
  FOOTBALL: 'Football',
  HOCKEY: 'Hockey',
  BASEBALL: 'Baseball',
  SOCCER: 'Soccer',
  TENNIS: 'Tennis',
  GOLF: 'Golf',
  MMA: 'MMA',
  BOXING: 'Boxing',
  HORSE_RACING: 'Horse Racing',
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Calculate potential payout from a stake and American odds value. */
export const calculatePayout = (stake: number, odds: number): number => {
  if (odds > 0) {
    return stake * (odds / 100);
  }
  return stake * (100 / Math.abs(odds));
};

// ---------------------------------------------------------------------------
// Bet history – no backend in static export; return empty list
// ---------------------------------------------------------------------------

export const getBetHistory = async (): Promise<
  ReturnType<typeof BetsResponseSchema.parse>
> => {
  return [] as ReturnType<typeof BetsResponseSchema.parse>;
};

// ---------------------------------------------------------------------------
// Sports / leagues
// ---------------------------------------------------------------------------

/**
 * Return the sports categories and leagues list.
 *
 * Strategy (development-first):
 *  1. Always start from the static local database so the sidebar is
 *     immediately populated without any API key.
 *  2. If the SDK is reachable (API key configured), merge the live league
 *     list on top: any league that the API returns but is missing from the
 *     static database is appended under the appropriate sport group, so new
 *     or regional leagues surface automatically.
 *  3. The static database always wins for logos and display names because
 *     the SDK returns empty logos.
 */
export const getSports = async (): Promise<Sport[]> => {
  // Deep-clone the static database so mutations don't pollute the module-
  // level constant across re-renders.
  const sports: Sport[] = STATIC_SPORTS.map((s) => ({
    ...s,
    leagues: s.leagues.map((l) => ({ ...l })),
  }));

  // Track which leagues are already present so we don't add duplicates.
  const knownLeagueIds = new Set<string>(
    sports.flatMap((s) => s.leagues.map((l) => l.id)),
  );

  // Attempt to augment with live SDK data (best-effort; never blocks render).
  try {
    if (process.env.NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY) {
      const sdkLeagues = await sdkGetLeagues({ active: true });

      for (const raw of sdkLeagues as SDKLeague[]) {
        const leagueId = raw.leagueID || raw.id || '';
        if (!leagueId || knownLeagueIds.has(leagueId)) continue;

        const sportId = getSportForLeague(leagueId);
        if (sportId === 'UNKNOWN') continue;

        const leagueName =
          raw.names?.long || raw.name || raw.leagueID || leagueId;

        const sport = sports.find((s) => s.id === sportId);
        const newLeague: League = {
          id: leagueId,
          name: leagueName,
          sportId,
          logo: '',
          games: [],
        };

        if (sport) {
          sport.leagues.push(newLeague);
        } else {
          sports.push({
            id: sportId,
            name: SPORT_DISPLAY_NAMES[sportId] || sportId,
            icon: '',
            leagues: [newLeague],
          });
        }

        knownLeagueIds.add(leagueId);
      }
    }
  } catch (err) {
    // SDK unavailable – static data is sufficient for development.
    console.warn('[api] SDK league fetch skipped (no API key or network error):', err);
  }

  return sports;
};

/** Find a specific league by its ID. Checks the static database first, then
 *  falls back to a full sports fetch if not found (handles SDK-only leagues). */
export const getLeague = async (
  leagueId: string,
): Promise<League | undefined> => {
  const staticResult = getStaticLeague(leagueId);
  if (staticResult) return staticResult;

  // Fallback: search across dynamically-fetched sports (SDK-only leagues)
  const sports = await getSports();
  for (const sport of sports) {
    const league = sport.leagues.find((l) => l.id === leagueId);
    if (league) return league;
  }
  return undefined;
};

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

/** Fetch all games for a specific league. */
export const getGamesByLeague = async (leagueId: string): Promise<Game[]> => {
  try {
    const result = await getEvents({
      leagueID: leagueId,
      ...EVENTS_QUERY_BASE,
    });
    const games = await transformSDKEvents(result.data as ExtendedSDKEvent[]);
    return games as unknown as Game[];
  } catch (error) {
    console.error(`[api] Error fetching games for league ${leagueId}:`, error);
    return [];
  }
};

/** Fetch a single game by its event ID. */
export const getGame = async (gameId: string): Promise<Game | undefined> => {
  try {
    const result = await getEvents({
      eventIDs: gameId,
      ...EVENTS_QUERY_BASE,
    });
    if (!result.data.length) return undefined;
    const transformed = await transformSDKEvent(
      result.data[0] as ExtendedSDKEvent,
    );
    return transformed ? (transformed as unknown as Game) : undefined;
  } catch (error) {
    console.error('[api] Error fetching game:', error);
    return undefined;
  }
};

/** Return the top 6 currently-live games for the trending section. */
export const getTrendingGames = async (): Promise<Game[]> => {
  const liveGames = await getLiveGames();
  return liveGames.slice(0, 6);
};

/** Fetch all currently in-progress games. */
export const getLiveGames = async (): Promise<Game[]> => {
  try {
    const result = await getEvents({
      live: true,
      finalized: false,
      ...EVENTS_QUERY_BASE,
    });
    const games = await transformSDKEvents(result.data as ExtendedSDKEvent[]);
    return games as unknown as Game[];
  } catch (error) {
    console.error('[api] Error fetching live games:', error);
    return [];
  }
};

/** Fetch all upcoming (not-yet-started) games. */
export const getUpcomingGames = async (): Promise<Game[]> => {
  try {
    const result = await getEvents({
      live: false,
      finalized: false,
      ...EVENTS_QUERY_BASE,
    });
    const games = await transformSDKEvents(result.data as ExtendedSDKEvent[]);
    return games as unknown as Game[];
  } catch (error) {
    console.error('[api] Error fetching upcoming games:', error);
    return [];
  }
};

/**
 * Paginated games API – compatibility shim for existing hooks & the live-data
 * store that iterate pages via `hasNextPage`.
 *
 * Because the SDK uses cursor-based pagination internally (handled by
 * `getAllEvents`) we fetch ALL events in a single SDK call on page 1 and
 * return them as one page with `hasNextPage: false`.  Callers that loop on
 * `hasNextPage` will therefore complete in a single iteration.
 *
 * @param leagueId   Optional league filter (uppercase, e.g. 'NBA')
 * @param page       1-based page number (only page 1 returns data)
 * @param limit      Kept for interface compatibility; ignored (all results are
 *                   returned at once)
 * @param bypassCache  Kept for interface compatibility; no-op in SDK mode
 * @param skipDevLimit Kept for interface compatibility; no-op in SDK mode
 */
export const getGamesPaginated = async (
  leagueId?: string,
  page: number = 1,
  _limit: number = 10,
  _bypassCache: boolean = false,
  _skipDevLimit: boolean = false,
): Promise<PaginatedResponse<Game>> => {
  const empty: PaginatedResponse<Game> = {
    data: [],
    pagination: {
      page,
      limit: 0,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: page > 1,
    },
  };

  // Only the first page carries data
  if (page > 1) return empty;

  try {
    const result = await getAllEvents(
      {
        leagueID: leagueId,
        ...EVENTS_QUERY_BASE,
      },
      20, // SDK-level page limit safety cap
    );

    const games = await transformSDKEvents(result.data as ExtendedSDKEvent[]);
    const total = games.length;

    return {
      data: games as unknown as Game[],
      pagination: {
        page: 1,
        limit: total,
        total,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  } catch (error) {
    console.error('[api] Error fetching paginated games:', error);
    return empty;
  }
};


