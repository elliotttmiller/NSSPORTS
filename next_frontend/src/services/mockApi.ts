import { mockSports, mockAllGames } from "@/lib/data/mockData";
import type { Game, Sport, League } from "@/types";

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

// Mock API delay for realistic loading
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  await delay(100);
  return mockSports;
};

// Get specific league
export const getLeague = async (
  leagueId: string,
): Promise<League | undefined> => {
  await delay(100);
  for (const sport of mockSports) {
    const league = sport.leagues.find((l) => l.id === leagueId);
    if (league) return league;
  }
  return undefined;
};

// Get games by league
export const getGamesByLeague = async (leagueId: string): Promise<Game[]> => {
  await delay(100);
  for (const sport of mockSports) {
    const league = sport.leagues.find((l) => l.id === leagueId);
    if (league) return league.games;
  }
  return [];
};

// Get single game
export const getGame = async (gameId: string): Promise<Game | undefined> => {
  await delay(100);
  return mockAllGames.find((game) => game.id === gameId);
};

// Get trending games
export const getTrendingGames = async (): Promise<Game[]> => {
  await delay(100);
  return mockAllGames.filter((game) => game.status === "live").slice(0, 6);
};

// Get live games
export const getLiveGames = async (): Promise<Game[]> => {
  await delay(100);
  return mockAllGames.filter((game) => game.status === "live");
};

// Get upcoming games
export const getUpcomingGames = async (): Promise<Game[]> => {
  await delay(100);
  return mockAllGames.filter((game) => game.status === "upcoming").slice(0, 20);
};

// Main paginated games API
export const getGamesPaginated = async (
  leagueId?: string,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedResponse<Game>> => {
  await delay(100);

  let allGames = [...mockAllGames];

  // Filter by league if specified
  if (leagueId) {
    allGames = allGames.filter(
      (game) => game.leagueId.toLowerCase() === leagueId.toLowerCase(),
    );
  }

  const total = allGames.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedGames = allGames.slice(startIndex, endIndex);

  return {
    data: paginatedGames,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};
