import type { Game, Sport, League, PaginatedResponse } from "@/types";
import { z } from "zod";
import { GameSchema } from "@/lib/schemas/game";
import { SportSchema } from "@/lib/schemas/sport";
import { paginatedResponseSchema } from "@/lib/schemas/pagination";
import { BetsResponseSchema } from "@/lib/schemas/bets";

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
      // Ensure cookies are sent for same-origin auth
      credentials: 'same-origin',
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

// Get bet history
export const getBetHistory = async () => {
  try {
    const json = await fetchAPI<unknown>('/my-bets');
    const payload = (json && typeof json === 'object' && 'data' in (json as any)) ? (json as any).data : json;
    return BetsResponseSchema.parse(payload);
  } catch (err) {
    if (err instanceof ApiHttpError && err.status === 401) {
      // Not authenticated: return empty history without throwing
      return [] as any;
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
  const payload = (json && typeof json === 'object' && 'data' in (json as any)) ? (json as any).data : json;
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
  const payload = (json && typeof json === 'object' && 'data' in (json as any)) ? (json as any).data : json;
  return z.array(GameSchema).parse(payload) as Game[];
};

// Get single game
export const getGame = async (gameId: string): Promise<Game | undefined> => {
  try {
    const response = await fetchAPI<unknown>(`/games?limit=1000`);
    const Schema = paginatedResponseSchema(GameSchema);
    const parsed = Schema.parse(response) as PaginatedResponse<Game>;
    return parsed.data.find((game) => game.id === gameId);
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
export const getLiveGames = async (): Promise<Game[]> => {
  const json = await fetchAPI<unknown>('/games/live');
  const payload = (json && typeof json === 'object' && 'data' in (json as any)) ? (json as any).data : json;
  return z.array(GameSchema).parse(payload) as Game[];
};

// Get upcoming games
export const getUpcomingGames = async (): Promise<Game[]> => {
  const json = await fetchAPI<unknown>('/games/upcoming');
  const payload = (json && typeof json === 'object' && 'data' in (json as any)) ? (json as any).data : json;
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
  const Schema = paginatedResponseSchema(GameSchema);
  const parsed = Schema.parse(json) as PaginatedResponse<Game>;
  return parsed;
};
