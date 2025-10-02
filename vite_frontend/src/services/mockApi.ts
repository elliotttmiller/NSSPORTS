import {
  mockSports,
  mockAllGames,
  TEAMS,
  generateGamesForLeague,
} from "@/lib/mockData";
import type { Game, Sport, League, PlayerProp, PropCategory } from "@/types";

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

// Main paginated games API - compatible with WorkspacePanel
export const getGamesPaginated = async (
  leagueId?: string,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedResponse<Game>> => {
  await delay(100);

  let allGames = [...mockAllGames];

  // Filter by league if specified (case-insensitive to handle both NFL and nfl)
  if (leagueId) {
    allGames = allGames.filter(
      (game) => game.leagueId.toLowerCase() === leagueId.toLowerCase(),
    );
  }

  // Sort by start time (live games first, then upcoming, then finished)
  allGames.sort((a, b) => {
    if (a.status === "live" && b.status !== "live") return -1;
    if (b.status === "live" && a.status !== "live") return 1;
    if (a.status === "upcoming" && b.status === "finished") return -1;
    if (b.status === "upcoming" && a.status === "finished") return 1;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  const total = allGames.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = allGames.slice(startIndex, endIndex);

  return {
    data,
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

// Get game by ID - works with all games including mockAllGames
export const getGameById = async (gameId: string): Promise<Game | null> => {
  await delay(200);

  // Search in mockAllGames first (most comprehensive)
  const game = mockAllGames.find((g) => g.id === gameId);
  if (game) return game;

  // If not found, search in sports/leagues structure
  for (const sport of mockSports) {
    for (const league of sport.leagues) {
      const game = league.games.find((g) => g.id === gameId);
      if (game) return game;
    }
  }

  return null;
};

// Generate mock player props
const generatePlayerProps = (gameId: string): PlayerProp[] => {
  const props: PlayerProp[] = [];

  // Mock players and their stats
  const mockPlayers = [
    {
      name: "Patrick Mahomes",
      position: "QB",
      team: "home",
      categories: ["passing", "rushing", "scoring"],
    },
    {
      name: "Josh Allen",
      position: "QB",
      team: "away",
      categories: ["passing", "rushing", "scoring"],
    },
    {
      name: "Travis Kelce",
      position: "TE",
      team: "home",
      categories: ["receiving", "scoring"],
    },
    {
      name: "Stefon Diggs",
      position: "WR",
      team: "away",
      categories: ["receiving", "scoring"],
    },
    {
      name: "Clyde Edwards-Helaire",
      position: "RB",
      team: "home",
      categories: ["rushing", "receiving", "scoring"],
    },
    {
      name: "James Cook",
      position: "RB",
      team: "away",
      categories: ["rushing", "receiving", "scoring"],
    },
    {
      name: "Harrison Butker",
      position: "K",
      team: "home",
      categories: ["kicking"],
    },
    {
      name: "Tyler Bass",
      position: "K",
      team: "away",
      categories: ["kicking"],
    },
  ];

  const statsByCategory = {
    passing: [
      { name: "Passing Yards", baseRange: [250, 350] },
      { name: "TD Passes", baseRange: [1.5, 3.5] },
      { name: "Completions", baseRange: [20.5, 30.5] },
      { name: "Pass Attempts", baseRange: [30.5, 45.5] },
      { name: "Longest Completion", baseRange: [25.5, 45.5] },
      { name: "Interceptions", baseRange: [0.5, 1.5] },
    ],
    rushing: [
      { name: "Rushing Yards", baseRange: [35.5, 95.5] },
      { name: "Rush Attempts", baseRange: [15.5, 23.5] },
      { name: "Rushing TDs", baseRange: [0.5, 1.5] },
      { name: "Longest Rush", baseRange: [12.5, 25.5] },
      { name: "Rushing 1st Downs", baseRange: [3.5, 8.5] },
    ],
    receiving: [
      { name: "Receiving Yards", baseRange: [65.5, 125.5] },
      { name: "Receptions", baseRange: [5.5, 9.5] },
      { name: "Receiving TDs", baseRange: [0.5, 1.5] },
      { name: "Longest Reception", baseRange: [18.5, 35.5] },
      { name: "Receiving 1st Downs", baseRange: [3.5, 6.5] },
    ],
    scoring: [
      { name: "Anytime TD", baseRange: [0.5, 0.5] },
      { name: "First TD", baseRange: [0.5, 0.5] },
      { name: "Last TD", baseRange: [0.5, 0.5] },
      { name: "Total TDs", baseRange: [0.5, 2.5] },
    ],
    kicking: [
      { name: "Field Goals Made", baseRange: [1.5, 3.5] },
      { name: "Extra Points Made", baseRange: [2.5, 4.5] },
      { name: "Longest Field Goal", baseRange: [42.5, 52.5] },
      { name: "Total Kicking Points", baseRange: [7.5, 12.5] },
    ],
  };

  mockPlayers.forEach((player, playerIndex) => {
    player.categories.forEach((category) => {
      const categoryStats =
        statsByCategory[category as keyof typeof statsByCategory];

      categoryStats.forEach((stat, statIndex) => {
        let line =
          stat.baseRange[0] +
          Math.random() * (stat.baseRange[1] - stat.baseRange[0]);

        // Adjust line based on position for certain stats
        if (stat.name === "Rushing Yards" && player.position === "QB") {
          line = 35.5 + Math.random() * 20;
        }
        if (stat.name === "Rush Attempts" && player.position === "QB") {
          line = 5.5 + Math.random() * 3;
        }

        // Round to appropriate decimal places
        if (
          stat.name.includes("TD") ||
          stat.name.includes("Attempts") ||
          stat.name.includes("Completions") ||
          stat.name.includes("Receptions")
        ) {
          line = Math.round(line * 2) / 2; // Round to nearest 0.5
        } else {
          line = Math.round(line * 2) / 2; // Round to nearest 0.5
        }

        props.push({
          id: `${gameId}-prop-${playerIndex}-${statIndex}`,
          playerId: `player-${playerIndex}`,
          playerName: player.name,
          position: player.position,
          category: category as PlayerProp["category"],
          statType: stat.name,
          line,
          overOdds: -110 + Math.floor(Math.random() * 40) - 20,
          underOdds: -110 + Math.floor(Math.random() * 40) - 20,
          team: player.team as "home" | "away",
        });
      });
    });
  });

  return props;
};

// Get player props for a game
export const getPlayerProps = async (gameId: string): Promise<PlayerProp[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return generatePlayerProps(gameId);
};

// Get categorized player props for a game
export const getCategorizedPlayerProps = async (
  gameId: string,
): Promise<PropCategory[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const allProps = generatePlayerProps(gameId);

  // Group props by category
  const categoryMap: Record<string, PlayerProp[]> = {};

  allProps.forEach((prop) => {
    if (!categoryMap[prop.category]) {
      categoryMap[prop.category] = [];
    }
    categoryMap[prop.category].push(prop);
  });

  // Create category objects with friendly names
  const categories: PropCategory[] = [];

  const categoryNames = {
    passing: "Passing",
    rushing: "Rushing",
    receiving: "Receiving",
    scoring: "Scoring",
    kicking: "Kicking",
    defense: "Defense",
  };

  Object.entries(categoryMap).forEach(([key, props]) => {
    categories.push({
      name: categoryNames[key as keyof typeof categoryNames] || key,
      key,
      props: props.sort((a, b) => a.playerName.localeCompare(b.playerName)),
    });
  });

  // Sort categories by priority
  const categoryOrder = [
    "passing",
    "rushing",
    "receiving",
    "scoring",
    "kicking",
    "defense",
  ];
  categories.sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a.key);
    const bIndex = categoryOrder.indexOf(b.key);
    return aIndex - bIndex;
  });

  return categories;
};
