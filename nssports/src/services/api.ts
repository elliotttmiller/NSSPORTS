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

// ---------------------------------------------------------------------------
// Debug store initialisation
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  const debugStore = useDebugStore.getState();
  debugStore.setConfig({
    environment: process.env.NODE_ENV || 'development',
    apiKeyConfigured: !!process.env.NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY,
    apiKey: process.env.NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY || null,
    useDirectSDK: true,
    isGitHubPages:
      typeof window !== 'undefined' &&
      window.location.hostname.includes('github.io'),
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
 * Fetch available sports and their leagues from the SDK.
 * Results are grouped by sport using the league→sport mapping in the
 * transformer.  Falls back to an empty array on error so the UI degrades
 * gracefully when the API key has not been configured yet.
 */
export const getSports = async (): Promise<Sport[]> => {
  try {
    const leagues = await sdkGetLeagues({ active: true });

    // Group leagues by sport
    const sportMap = new Map<string, { name: string; leagues: League[] }>();

    for (const league of leagues) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = league as any;
      const leagueId: string = raw.leagueID || raw.id || '';
      if (!leagueId) continue;

      const sportId = getSportForLeague(leagueId);
      if (sportId === 'UNKNOWN') continue;

      if (!sportMap.has(sportId)) {
        sportMap.set(sportId, {
          name: SPORT_DISPLAY_NAMES[sportId] || sportId,
          leagues: [],
        });
      }

      const leagueName: string =
        raw.names?.long || raw.name || raw.leagueID || leagueId;

      sportMap.get(sportId)!.leagues.push({
        id: leagueId,
        name: leagueName,
        sportId,
        logo: '',
        games: [],
      });
    }

    return Array.from(sportMap.entries()).map(([id, { name, leagues }]) => ({
      id,
      name,
      icon: '',
      leagues,
    }));
  } catch (error) {
    console.error('[api] Error fetching sports from SDK:', error);
    return [];
  }
};

/** Find a specific league by its ID across all sports. */
export const getLeague = async (
  leagueId: string,
): Promise<League | undefined> => {
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


