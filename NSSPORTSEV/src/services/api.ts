import type { Game, Sport, League, PaginatedResponse } from "@/types";
import { z } from "zod";
import { GameSchema } from "@/lib/schemas/game";
import { SportSchema } from "@/lib/schemas/sport";
import { paginatedResponseSchema } from "@/lib/schemas/pagination";
import type { ApiSuccessResponse } from "@/lib/apiResponse";
import { getAllEvents, getLeagues, MAIN_LINE_ODDIDS, type SDKEvent } from "@/lib/sportsgameodds-sdk";
import { logger } from "@/lib/logger";

// GitHub Pages Static Export: Call SDK directly instead of /api routes
// This allows the app to work without Next.js API routes
const USE_DIRECT_SDK = process.env.GITHUB_PAGES === 'true' || 
                       process.env.NEXT_PUBLIC_USE_DIRECT_SDK === 'true';

// Default leagues to fetch when no specific league is specified
const DEFAULT_LEAGUES = ['NBA', 'NFL', 'NHL'];

const log = logger.createScopedLogger('API');

class ApiHttpError extends Error {
  status: number;
  body?: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Transform SDK Event to Game type
 * Simplified transformer for GitHub Pages static export
 */
function transformSDKEventToGame(event: SDKEvent): Game {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const evt = event as any;
  
  // Determine game status
  let status: "upcoming" | "live" | "finished" = "upcoming";
  if (evt.status?.live || evt.status?.started) {
    status = "live";
  } else if (evt.status?.completed || evt.status?.finalized || evt.status?.ended) {
    status = "finished";
  }
  
  // Helper to extract odds from SDK event
  const extractOdds = (oddID: string) => {
    const odd = evt.odds?.[oddID];
    if (!odd?.bookOdds) return null;
    
    return {
      odds: odd.bookOdds?.odds || 0,
      line: odd.bookOdds?.line || null,
      lastUpdated: new Date(odd.timestamp || evt.timestamp || Date.now())
    };
  };
  
  // Build the game object
  const game: Game = {
    id: evt.eventID,
    leagueId: evt.leagueID || 'UNKNOWN',
    homeTeam: {
      id: evt.homeParticipantID || evt.homeID || 'home',
      name: evt.home || 'Home Team',
      shortName: evt.homeAbbr || evt.home || 'HOME',
      logo: '',
      record: null
    },
    awayTeam: {
      id: evt.awayParticipantID || evt.awayID || 'away',
      name: evt.away || 'Away Team',
      shortName: evt.awayAbbr || evt.away || 'AWAY',
      logo: '',
      record: null
    },
    startTime: new Date(evt.startTimestamp || Date.now()),
    status,
    venue: evt.venue || null,
    homeScore: evt.homeScore || null,
    awayScore: evt.awayScore || null,
    period: evt.status?.currentPeriodID || null,
    timeRemaining: evt.status?.clock || null,
    periodDisplay: evt.status?.currentPeriodID || null,
    odds: {
      moneyline: {
        home: extractOdds('points-home-game-ml-home') || { odds: 0, lastUpdated: new Date() },
        away: extractOdds('points-away-game-ml-away') || { odds: 0, lastUpdated: new Date() }
      },
      spread: {
        home: extractOdds('points-home-game-sp-home') || { odds: 0, line: null, lastUpdated: new Date() },
        away: extractOdds('points-away-game-sp-away') || { odds: 0, line: null, lastUpdated: new Date() }
      },
      total: {
        home: extractOdds('points-home-game-ou-over') || { odds: 0, line: null, lastUpdated: new Date() },
        away: extractOdds('points-away-game-ou-under') || { odds: 0, line: null, lastUpdated: new Date() },
        over: extractOdds('points-all-game-ou-over') || { odds: 0, line: null, lastUpdated: new Date() },
        under: extractOdds('points-all-game-ou-under') || { odds: 0, line: null, lastUpdated: new Date() }
      }
    }
  };
  
  return game;
}

// Pagination response interface
// ...removed local PaginatedResponse, now using shared type from src/types/index.ts

// Helper function to make API requests with error handling and optimizations
// Only used as fallback when not using direct SDK calls
async function fetchAPI<T>(
  endpoint: string, 
  options?: RequestInit & { 
    priority?: 'high' | 'low' | 'auto';  // Request priority hint for browser
  }
): Promise<T> {
  // For GitHub Pages static export, we should not be calling this function
  // All calls should go through the SDK directly
  if (USE_DIRECT_SDK) {
    throw new Error('fetchAPI should not be called in static export mode. Use SDK directly.');
  }
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  const url = `${API_BASE_URL}${endpoint}`;
  const { priority, ...fetchOptions } = options || {};
  
  try {
    // Build fetch options with priority if in browser environment
    const requestOptions: RequestInit = {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions?.headers,
      },
      // No authentication required for EV app
      credentials: 'omit',
    };
    
    // ✅ OPTIMIZATION: Add priority hint for browser (Chrome, Edge support)
    // Only applies in browser context, ignored in Node.js
    if (typeof window !== 'undefined' && priority) {
      (requestOptions as Record<string, unknown>).priority = priority;
    }
    
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      let body: unknown = undefined;
      try {
        body = await response.json();
      } catch {
        // ignore body parse errors
      }
      
      // Enhanced error logging for 422 validation errors
      if (response.status === 422) {
        console.error(`422 Validation Error on ${endpoint}:`, {
          status: response.status,
          statusText: response.statusText,
          body,
          url: response.url
        });
      }
      
      throw new ApiHttpError(`API Error: ${response.status} ${response.statusText}`, response.status, body);
    }

    const json = await response.json();
    return json as T;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// Helper to unwrap our standardized success envelope shape when present
function unwrapApiData<T>(json: unknown): T {
  if (
    json &&
    typeof json === 'object' &&
    'data' in (json as Record<string, unknown>) &&
    'success' in (json as Record<string, unknown>) &&
    (json as ApiSuccessResponse<unknown>).success === true
  ) {
    return (json as ApiSuccessResponse<T>).data;
  }
  // Fallback: treat json as the payload itself
  return json as T;
}

// Get sports with leagues
export const getSports = async (): Promise<Sport[]> => {
  // GitHub Pages Static Export: Call SDK directly
  if (USE_DIRECT_SDK) {
    try {
      log.info('Fetching sports/leagues from SDK directly');
      
      // Fetch leagues from SDK
      const leagues = await getLeagues();
      
      // Transform SDK leagues to Sport objects with nested leagues
      const sportMap = new Map<string, Sport>();
      
      for (const league of leagues) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leagueData = league as any;
        const sportID = leagueData.sportID || 'UNKNOWN';
        
        if (!sportMap.has(sportID)) {
          // Create sport display name with proper handling of edge cases
          let sportName = 'Unknown Sport';
          if (sportID && sportID !== 'UNKNOWN' && sportID.length > 0) {
            sportName = sportID.charAt(0).toUpperCase() + sportID.slice(1).toLowerCase();
          }
          
          sportMap.set(sportID, {
            id: sportID.toLowerCase(),
            name: sportName,
            icon: '',
            leagues: []
          });
        }
        
        const sport = sportMap.get(sportID)!;
        sport.leagues.push({
          id: leagueData.leagueID,
          name: leagueData.name || leagueData.leagueID,
          sportId: sport.id,
          logo: '',
          games: []
        });
      }
      
      return Array.from(sportMap.values());
    } catch (error) {
      log.error('Error fetching sports from SDK', error);
      throw error;
    }
  }
  
  // Fallback to API routes
  const json = await fetchAPI<unknown>('/sports');
  // Some routes may return success envelope; unwrap if present
  const payload = unwrapApiData<unknown>(json);
  return z.array(SportSchema).parse(payload) as Sport[];
};

// Get specific league
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

// Get games by league
export const getGamesByLeague = async (leagueId: string): Promise<Game[]> => {
  // GitHub Pages Static Export: Call SDK directly
  if (USE_DIRECT_SDK) {
    try {
      log.info('Fetching games by league from SDK directly', { leagueId });
      
      const result = await getAllEvents({
        leagueID: leagueId,
        oddIDs: MAIN_LINE_ODDIDS,
        includeOpposingOddIDs: true,
        includeConsensus: true,
        finalized: false, // Only get upcoming and live games
      }, 10); // maxPages
      
      return result.data.map(transformSDKEventToGame);
    } catch (error) {
      log.error('Error fetching games by league from SDK', error);
      throw error;
    }
  }
  
  // Fallback to API routes
  const json = await fetchAPI<unknown>(`/games/league/${leagueId}`);
  const payload = unwrapApiData<unknown>(json);
  return z.array(GameSchema).parse(payload) as Game[];
};

// Get single game
export const getGame = async (gameId: string): Promise<Game | undefined> => {
  try {
    // The /api/games endpoint enforces limit <= 100 via Zod; iterate pages safely
    let page = 1;
    const limit = 100;
    while (true) {
      const pageResult = await getGamesPaginated(undefined, page, limit);
      const found = pageResult.data.find((g) => g.id === gameId);
      if (found) return found;
      if (!pageResult.pagination.hasNextPage) break;
      page += 1;
      // Safety stop to avoid accidental infinite loops
      if (page > 50) break; // 5,000 items upper bound
    }
    return undefined;
  } catch (error) {
    console.error('Error fetching game:', error);
    return undefined;
  }
};

// Get trending games (live games)
export const getTrendingGames = async (): Promise<Game[]> => {
  const liveGames = await getLiveGames();
  return liveGames.slice(0, 6);
};

// Get live games
// NOTE: This function is deprecated in favor of using the centralized liveDataStore
// For new code, use: useLiveDataStore(selectLiveMatches)
export const getLiveGames = async (): Promise<Game[]> => {
  // GitHub Pages Static Export: Call SDK directly
  if (USE_DIRECT_SDK) {
    try {
      log.info('Fetching live games from SDK directly');
      
      const leagues = DEFAULT_LEAGUES;
      const allEvents: SDKEvent[] = [];
      
      for (const league of leagues) {
        const result = await getAllEvents({
          leagueID: league,
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          includeConsensus: true,
          live: true, // Only get live games
        }, 5); // maxPages
        
        allEvents.push(...result.data);
      }
      
      return allEvents.map(transformSDKEventToGame);
    } catch (error) {
      log.error('Error fetching live games from SDK', error);
      throw error;
    }
  }
  
  // Fallback to API routes
  const json = await fetchAPI<unknown>('/games/live');
  const payload = unwrapApiData<unknown>(json);
  return z.array(GameSchema).parse(payload) as Game[];
};

// Get upcoming games
// NOTE: This function is deprecated in favor of using the centralized liveDataStore
// For new code, use: useLiveDataStore(selectUpcomingMatches)
export const getUpcomingGames = async (): Promise<Game[]> => {
  // GitHub Pages Static Export: Call SDK directly
  if (USE_DIRECT_SDK) {
    try {
      log.info('Fetching upcoming games from SDK directly');
      
      const leagues = DEFAULT_LEAGUES;
      const allEvents: SDKEvent[] = [];
      
      for (const league of leagues) {
        const result = await getAllEvents({
          leagueID: league,
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          includeConsensus: true,
          live: false, // Only get upcoming games
          finalized: false,
        }, 5); // maxPages
        
        allEvents.push(...result.data);
      }
      
      return allEvents.map(transformSDKEventToGame);
    } catch (error) {
      log.error('Error fetching upcoming games from SDK', error);
      throw error;
    }
  }
  
  // Fallback to API routes
  const json = await fetchAPI<unknown>('/games/upcoming');
  const payload = unwrapApiData<unknown>(json);
  return z.array(GameSchema).parse(payload) as Game[];
};

// Main paginated games API
export const getGamesPaginated = async (
  leagueId?: string,
  page: number = 1,
  limit: number = 10,
  bypassCache: boolean = false,
  // When true, instruct server to bypass development sampling/limits (development only)
  skipDevLimit: boolean = false,
): Promise<PaginatedResponse<Game>> => {
  // Validate and sanitize pagination parameters to prevent 422 errors
  // Ensure page and limit are valid positive integers
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 500 ? Math.floor(limit) : 100;
  
  // GitHub Pages Static Export: Call SDK directly
  if (USE_DIRECT_SDK) {
    try {
      log.info('Fetching games from SDK directly', { leagueId, page: safePage, limit: safeLimit });
      
      // Fetch events from SDK
      const leagues = leagueId ? [leagueId] : DEFAULT_LEAGUES;
      const allEvents: SDKEvent[] = [];
      
      for (const league of leagues) {
        const result = await getAllEvents({
          leagueID: league,
          oddIDs: MAIN_LINE_ODDIDS,
          includeOpposingOddIDs: true,
          includeConsensus: true,
          finalized: false, // Only get upcoming and live games
          limit: safeLimit,
        }, 10); // maxPages
        
        allEvents.push(...result.data);
      }
      
      // Transform SDK events to Game objects
      const games = allEvents.map(transformSDKEventToGame);
      
      // Apply pagination
      const startIndex = (safePage - 1) * safeLimit;
      const endIndex = startIndex + safeLimit;
      const paginatedGames = games.slice(startIndex, endIndex);
      
      const total = games.length;
      const totalPages = Math.ceil(total / safeLimit);
      
      return {
        data: paginatedGames,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
          hasNextPage: safePage < totalPages,
          hasPrevPage: safePage > 1,
        },
      };
    } catch (error) {
      log.error('Error fetching games from SDK', error);
      throw error;
    }
  }
  
  // Fallback to API routes (for server-side rendering)
  const params = new URLSearchParams({
    page: safePage.toString(),
    limit: safeLimit.toString(),
  });

  if (leagueId) {
    params.append('leagueId', leagueId);
  }

  // Add cache-busting parameter to force fresh data from SDK
  if (bypassCache) {
    params.append('_t', Date.now().toString());
  }

  // Allow callers to request full results in development by passing skipDevLimit
  if (skipDevLimit) {
    params.append('noDevLimit', 'true');
  }

  const json = await fetchAPI<unknown>(`/games?${params.toString()}`);
  // Unwrap the success envelope to get the actual data
  const payload = unwrapApiData<unknown>(json);
  const Schema = paginatedResponseSchema(GameSchema);
  const parsed = Schema.parse(payload) as PaginatedResponse<Game>;
  return parsed;
};
