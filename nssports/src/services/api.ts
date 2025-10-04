import type { Game, Sport, League } from "@/types";

// API Base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

// Pagination response interface
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Helper function to make API requests with error handling
// Get bet history
export const getBetHistory = async () => {
  return fetchAPI('/my-bets');
};
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}

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
  return fetchAPI<Sport[]>('/sports');
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
  return fetchAPI<Game[]>(`/games/league/${leagueId}`);
};

// Get single game
export const getGame = async (gameId: string): Promise<Game | undefined> => {
  try {
    const response = await fetchAPI<PaginatedResponse<Game>>(`/games?limit=1000`);
    return response.data.find((game) => game.id === gameId);
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
  return fetchAPI<Game[]>('/games/live');
};

// Get upcoming games
export const getUpcomingGames = async (): Promise<Game[]> => {
  return fetchAPI<Game[]>('/games/upcoming');
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

  return fetchAPI<PaginatedResponse<Game>>(`/games?${params.toString()}`);
};
