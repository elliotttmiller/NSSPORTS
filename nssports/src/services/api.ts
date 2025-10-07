import type { Game, Sport, League, PaginatedResponse } from "@/types";
import { z } from "zod";
import { GameSchema } from "@/lib/schemas/game";
import { SportSchema } from "@/lib/schemas/sport";
import { paginatedResponseSchema } from "@/lib/schemas/pagination";
import { BetsResponseSchema } from "@/lib/schemas/bets";
import type { ApiSuccessResponse } from "@/lib/apiResponse";

// API Base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

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

// Pagination response interface
// ...removed local PaginatedResponse, now using shared type from src/types/index.ts

// Helper function to make API requests with error handling
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      // Always include cookies for auth (supports same-origin and cross-origin with CORS)
      credentials: 'include',
    });

    if (!response.ok) {
      let body: unknown = undefined;
      try {
        body = await response.json();
      } catch {
        // ignore body parse errors
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

// Get bet history
export const getBetHistory = async (): Promise<ReturnType<typeof BetsResponseSchema.parse>> => {
  try {
    const json = await fetchAPI<unknown>('/my-bets');
    const payload = unwrapApiData<unknown>(json);
    return BetsResponseSchema.parse(payload);
  } catch (err) {
    if (err instanceof ApiHttpError && err.status === 401) {
      // Not authenticated: return empty history without throwing
      return [] as ReturnType<typeof BetsResponseSchema.parse>;
    }
    throw err;
  }
};

// Helper function to calculate odds payout
export const calculatePayout = (stake: number, odds: number): number => {
  if (odds > 0) {
    return stake * (odds / 100);
  } else {
    return stake * (100 / Math.abs(odds));
  }
};

// Get sports with leagues
export const getSports = async (): Promise<Sport[]> => {
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
  const json = await fetchAPI<unknown>('/games/live');
  const payload = unwrapApiData<unknown>(json);
  return z.array(GameSchema).parse(payload) as Game[];
};

// Get upcoming games
// NOTE: This function is deprecated in favor of using the centralized liveDataStore
// For new code, use: useLiveDataStore(selectUpcomingMatches)
export const getUpcomingGames = async (): Promise<Game[]> => {
  const json = await fetchAPI<unknown>('/games/upcoming');
  const payload = unwrapApiData<unknown>(json);
  return z.array(GameSchema).parse(payload) as Game[];
};

// Main paginated games API
export const getGamesPaginated = async (
  leagueId?: string,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedResponse<Game>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (leagueId) {
    params.append('leagueId', leagueId);
  }

  const json = await fetchAPI<unknown>(`/games?${params.toString()}`);
  // Unwrap the success envelope to get the actual data
  const payload = unwrapApiData<unknown>(json);
  const Schema = paginatedResponseSchema(GameSchema);
  const parsed = Schema.parse(payload) as PaginatedResponse<Game>;
  return parsed;
};
