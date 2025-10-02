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
];
