import type { Game, Sport } from "@/types";

// Simplified mock data for Next.js migration
export const mockSports: Sport[] = [
  {
    id: "nba",
    name: "NBA",
    icon: "basketball",
    leagues: [
      {
        id: "nba",
        name: "NBA",
        sportId: "nba",
        games: [],
      },
    ],
  },
  {
    id: "nfl",
    name: "NFL",
    icon: "football",
    leagues: [
      {
        id: "nfl",
        name: "NFL",
        sportId: "nfl",
        games: [],
      },
    ],
  },
  {
    id: "nhl",
    name: "NHL",
    icon: "hockey",
    leagues: [
      {
        id: "nhl",
        name: "NHL",
        sportId: "nhl",
        games: [],
      },
    ],
  },
];

const now = new Date();

// Sample games for demonstration
export const mockAllGames: Game[] = [
  {
    id: "1",
    leagueId: "nba",
    homeTeam: {
      id: "lakers",
      name: "Los Angeles Lakers",
      shortName: "LAL",
      logo: "/logos/nba/los-angeles-lakers.svg",
      record: "15-10",
    },
    awayTeam: {
      id: "warriors",
      name: "Golden State Warriors",
      shortName: "GSW",
      logo: "/logos/nba/golden-state-warriors.svg",
      record: "12-13",
    },
    startTime: new Date(now.getTime() + 3600000),
    status: "upcoming",
    odds: {
      spread: {
        away: { line: 2.5, odds: -110, lastUpdated: now },
        home: { line: -2.5, odds: -110, lastUpdated: now },
      },
      total: {
        home: { odds: -110, lastUpdated: now },
        away: { odds: -110, lastUpdated: now },
        over: { line: 225.5, odds: -110, lastUpdated: now },
        under: { line: 225.5, odds: -110, lastUpdated: now },
      },
      moneyline: {
        away: { odds: 130, lastUpdated: now },
        home: { odds: -150, lastUpdated: now },
      },
    },
  },
  {
    id: "2",
    leagueId: "nba",
    homeTeam: {
      id: "celtics",
      name: "Boston Celtics",
      shortName: "BOS",
      logo: "/logos/nba/boston-celtics.svg",
      record: "18-7",
    },
    awayTeam: {
      id: "heat",
      name: "Miami Heat",
      shortName: "MIA",
      logo: "/logos/nba/miami-heat.svg",
      record: "13-12",
    },
    startTime: new Date(now.getTime() + 5400000),
    status: "upcoming",
    odds: {
      spread: {
        away: { line: 5.5, odds: -110, lastUpdated: now },
        home: { line: -5.5, odds: -110, lastUpdated: now },
      },
      total: {
        home: { odds: -110, lastUpdated: now },
        away: { odds: -110, lastUpdated: now },
        over: { line: 218.5, odds: -110, lastUpdated: now },
        under: { line: 218.5, odds: -110, lastUpdated: now },
      },
      moneyline: {
        away: { odds: 190, lastUpdated: now },
        home: { odds: -225, lastUpdated: now },
      },
    },
  },
  {
    id: "3",
    leagueId: "nba",
    homeTeam: {
      id: "nets",
      name: "Brooklyn Nets",
      shortName: "BKN",
      logo: "/logos/nba/brooklyn-nets.svg",
      record: "11-14",
    },
    awayTeam: {
      id: "76ers",
      name: "Philadelphia 76ers",
      shortName: "PHI",
      logo: "/logos/nba/philadelphia-76ers.svg",
      record: "14-11",
    },
    startTime: new Date(now.getTime() + 7200000),
    status: "live",
    odds: {
      spread: {
        away: { line: -3.5, odds: -110, lastUpdated: now },
        home: { line: 3.5, odds: -110, lastUpdated: now },
      },
      total: {
        home: { odds: -110, lastUpdated: now },
        away: { odds: -110, lastUpdated: now },
        over: { line: 220.5, odds: -110, lastUpdated: now },
        under: { line: 220.5, odds: -110, lastUpdated: now },
      },
      moneyline: {
        away: { odds: -155, lastUpdated: now },
        home: { odds: 135, lastUpdated: now },
      },
    },
  },
  {
    id: "4",
    leagueId: "nba",
    homeTeam: {
      id: "bucks",
      name: "Milwaukee Bucks",
      shortName: "MIL",
      logo: "/logos/nba/milwaukee-bucks.svg",
      record: "16-9",
    },
    awayTeam: {
      id: "bulls",
      name: "Chicago Bulls",
      shortName: "CHI",
      logo: "/logos/nba/chicago-bulls.svg",
      record: "10-15",
    },
    startTime: new Date(now.getTime() + 9000000),
    status: "live",
    odds: {
      spread: {
        away: { line: 7.5, odds: -110, lastUpdated: now },
        home: { line: -7.5, odds: -110, lastUpdated: now },
      },
      total: {
        home: { odds: -110, lastUpdated: now },
        away: { odds: -110, lastUpdated: now },
        over: { line: 228.5, odds: -110, lastUpdated: now },
        under: { line: 228.5, odds: -110, lastUpdated: now },
      },
      moneyline: {
        away: { odds: 270, lastUpdated: now },
        home: { odds: -330, lastUpdated: now },
      },
    },
  },
  {
    id: "5",
    leagueId: "nba",
    homeTeam: {
      id: "mavericks",
      name: "Dallas Mavericks",
      shortName: "DAL",
      logo: "/logos/nba/dallas-mavericks.svg",
      record: "17-8",
    },
    awayTeam: {
      id: "suns",
      name: "Phoenix Suns",
      shortName: "PHX",
      logo: "/logos/nba/phoenix-suns.svg",
      record: "14-11",
    },
    startTime: new Date(now.getTime() + 10800000),
    status: "live",
    odds: {
      spread: {
        away: { line: 1.5, odds: -110, lastUpdated: now },
        home: { line: -1.5, odds: -110, lastUpdated: now },
      },
      total: {
        home: { odds: -110, lastUpdated: now },
        away: { odds: -110, lastUpdated: now },
        over: { line: 232.5, odds: -110, lastUpdated: now },
        under: { line: 232.5, odds: -110, lastUpdated: now },
      },
      moneyline: {
        away: { odds: 105, lastUpdated: now },
        home: { odds: -125, lastUpdated: now },
      },
    },
  },
  // NFL Games
  {
    id: "nfl-1",
    leagueId: "nfl",
    homeTeam: {
      id: "chiefs",
      name: "Kansas City Chiefs",
      shortName: "KC",
      logo: "/logos/nfl/kansas-city-chiefs.svg",
      record: "11-1",
    },
    awayTeam: {
      id: "bills",
      name: "Buffalo Bills",
      shortName: "BUF",
      logo: "/logos/nfl/buffalo-bills.svg",
      record: "10-2",
    },
    startTime: new Date(now.getTime() + 14400000),
    status: "live",
    odds: {
      spread: {
        away: { line: 2.5, odds: -110, lastUpdated: now },
        home: { line: -2.5, odds: -110, lastUpdated: now },
      },
      total: {
        home: { odds: -110, lastUpdated: now },
        away: { odds: -110, lastUpdated: now },
        over: { line: 48.5, odds: -110, lastUpdated: now },
        under: { line: 48.5, odds: -110, lastUpdated: now },
      },
      moneyline: {
        away: { odds: 125, lastUpdated: now },
        home: { odds: -145, lastUpdated: now },
      },
    },
  },
  {
    id: "nfl-2",
    leagueId: "nfl",
    homeTeam: {
      id: "eagles",
      name: "Philadelphia Eagles",
      shortName: "PHI",
      logo: "/logos/nfl/philadelphia-eagles.svg",
      record: "10-2",
    },
    awayTeam: {
      id: "49ers",
      name: "San Francisco 49ers",
      shortName: "SF",
      logo: "/logos/nfl/san-francisco-49ers.svg",
      record: "9-3",
    },
    startTime: new Date(now.getTime() + 18000000),
    status: "upcoming",
    odds: {
      spread: {
        away: { line: 3.5, odds: -110, lastUpdated: now },
        home: { line: -3.5, odds: -110, lastUpdated: now },
      },
      total: {
        home: { odds: -110, lastUpdated: now },
        away: { odds: -110, lastUpdated: now },
        over: { line: 45.5, odds: -110, lastUpdated: now },
        under: { line: 45.5, odds: -110, lastUpdated: now },
      },
      moneyline: {
        away: { odds: 155, lastUpdated: now },
        home: { odds: -180, lastUpdated: now },
      },
    },
  },
  {
    id: "nfl-3",
    leagueId: "nfl",
    homeTeam: {
      id: "cowboys",
      name: "Dallas Cowboys",
      shortName: "DAL",
      logo: "/logos/nfl/dallas-cowboys.svg",
      record: "8-4",
    },
    awayTeam: {
      id: "lions",
      name: "Detroit Lions",
      shortName: "DET",
      logo: "/logos/nfl/detroit-lions.svg",
      record: "9-3",
    },
    startTime: new Date(now.getTime() + 21600000),
    status: "upcoming",
    odds: {
      spread: {
        away: { line: -1.5, odds: -110, lastUpdated: now },
        home: { line: 1.5, odds: -110, lastUpdated: now },
      },
      total: {
        home: { odds: -110, lastUpdated: now },
        away: { odds: -110, lastUpdated: now },
        over: { line: 52.5, odds: -110, lastUpdated: now },
        under: { line: 52.5, odds: -110, lastUpdated: now },
      },
      moneyline: {
        away: { odds: -115, lastUpdated: now },
        home: { odds: -105, lastUpdated: now },
      },
    },
  },
  // NHL Games
  {
    id: "nhl-1",
    leagueId: "nhl",
    homeTeam: {
      id: "avalanche",
      name: "Colorado Avalanche",
      shortName: "COL",
      logo: "/logos/nhl/colorado-avalanche.svg",
      record: "18-14-0",
    },
    awayTeam: {
      id: "oilers",
      name: "Edmonton Oilers",
      shortName: "EDM",
      logo: "/logos/nhl/edmonton-oilers.svg",
      record: "20-11-2",
    },
    startTime: new Date(now.getTime() + 7200000),
    status: "live",
    odds: {
      spread: {
        away: { line: -1.5, odds: 180, lastUpdated: now },
        home: { line: 1.5, odds: -220, lastUpdated: now },
      },
      total: {
        home: { odds: -110, lastUpdated: now },
        away: { odds: -110, lastUpdated: now },
        over: { line: 6.5, odds: -110, lastUpdated: now },
        under: { line: 6.5, odds: -110, lastUpdated: now },
      },
      moneyline: {
        away: { odds: -135, lastUpdated: now },
        home: { odds: 115, lastUpdated: now },
      },
    },
  },
  {
    id: "nhl-2",
    leagueId: "nhl",
    homeTeam: {
      id: "rangers",
      name: "New York Rangers",
      shortName: "NYR",
      logo: "/logos/nhl/new-york-rangers.svg",
      record: "16-13-1",
    },
    awayTeam: {
      id: "bruins",
      name: "Boston Bruins",
      shortName: "BOS",
      logo: "/logos/nhl/boston-bruins.svg",
      record: "19-12-3",
    },
    startTime: new Date(now.getTime() + 10800000),
    status: "live",
    odds: {
      spread: {
        away: { line: -1.5, odds: 190, lastUpdated: now },
        home: { line: 1.5, odds: -230, lastUpdated: now },
      },
      total: {
        home: { odds: -110, lastUpdated: now },
        away: { odds: -110, lastUpdated: now },
        over: { line: 5.5, odds: -110, lastUpdated: now },
        under: { line: 5.5, odds: -110, lastUpdated: now },
      },
      moneyline: {
        away: { odds: -145, lastUpdated: now },
        home: { odds: 125, lastUpdated: now },
      },
    },
  },
  {
    id: "nhl-3",
    leagueId: "nhl",
    homeTeam: {
      id: "maple-leafs",
      name: "Toronto Maple Leafs",
      shortName: "TOR",
      logo: "/logos/nhl/toronto-maple-leafs.svg",
      record: "20-11-2",
    },
    awayTeam: {
      id: "lightning",
      name: "Tampa Bay Lightning",
      shortName: "TB",
      logo: "/logos/nhl/tampa-bay-lightning.svg",
      record: "17-12-2",
    },
    startTime: new Date(now.getTime() + 14400000),
    status: "upcoming",
    odds: {
      spread: {
        away: { line: 1.5, odds: -210, lastUpdated: now },
        home: { line: -1.5, odds: 170, lastUpdated: now },
      },
      total: {
        home: { odds: -110, lastUpdated: now },
        away: { odds: -110, lastUpdated: now },
        over: { line: 6.5, odds: -110, lastUpdated: now },
        under: { line: 6.5, odds: -110, lastUpdated: now },
      },
      moneyline: {
        away: { odds: 130, lastUpdated: now },
        home: { odds: -150, lastUpdated: now },
      },
    },
  },
];
