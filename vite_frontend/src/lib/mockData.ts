import type { Game, Team, Sport, League, GameOdds, OddsData } from "@/types";

// Teams database - centralized team data with professional records
export const TEAMS: Record<string, Team> = {
  // NFL Teams
  chiefs: {
    id: "chiefs",
    name: "Kansas City Chiefs",
    shortName: "KC",
    logo: "/assets/images/chiefs.svg",
    record: "11-1",
  },
  bills: {
    id: "bills",
    name: "Buffalo Bills",
    shortName: "BUF",
    logo: "/assets/images/bills.svg",
    record: "10-2",
  },
  dolphins: {
    id: "dolphins",
    name: "Miami Dolphins",
    shortName: "MIA",
    logo: "/assets/images/dolphins.svg",
    record: "8-4",
  },
  ravens: {
    id: "ravens",
    name: "Baltimore Ravens",
    shortName: "BAL",
    logo: "/assets/images/ravens.svg",
    record: "9-3",
  },
  bengals: {
    id: "bengals",
    name: "Cincinnati Bengals",
    shortName: "CIN",
    logo: "/assets/images/bengals.svg",
    record: "7-5",
  },
  steelers: {
    id: "steelers",
    name: "Pittsburgh Steelers",
    shortName: "PIT",
    logo: "/assets/images/steelers.svg",
    record: "8-4",
  },

  // NBA Teams
  lakers: {
    id: "lakers",
    name: "Los Angeles Lakers",
    shortName: "LAL",
    logo: "/assets/images/lakers.svg",
    record: "15-10",
  },
  celtics: {
    id: "celtics",
    name: "Boston Celtics",
    shortName: "BOS",
    logo: "/assets/images/celtics.svg",
    record: "18-7",
  },
  warriors: {
    id: "warriors",
    name: "Golden State Warriors",
    shortName: "GSW",
    logo: "/assets/images/warriors.svg",
    record: "12-13",
  },
  nuggets: {
    id: "nuggets",
    name: "Denver Nuggets",
    shortName: "DEN",
    logo: "/assets/images/nuggets.svg",
    record: "14-11",
  },
  heat: {
    id: "heat",
    name: "Miami Heat",
    shortName: "MIA",
    logo: "/assets/images/heat.svg",
    record: "13-12",
  },
  nets: {
    id: "nets",
    name: "Brooklyn Nets",
    shortName: "BKN",
    logo: "/assets/images/nets.svg",
    record: "11-14",
  },

  // NHL Teams
  "anaheim-ducks": {
    id: "anaheim-ducks",
    name: "Anaheim Ducks",
    shortName: "ANA",
  logo: "/logos/nhl/Anaheim Ducks.svg",
  },
  "boston-bruins": {
    id: "boston-bruins",
    name: "Boston Bruins",
    shortName: "BOS",
  logo: "/logos/nhl/Boston Bruins.svg",
  },
  "buffalo-sabres": {
    id: "buffalo-sabres",
    name: "Buffalo Sabres",
    shortName: "BUF",
  logo: "/logos/nhl/Buffalo Sabres.svg",
  },
  "calgary-flames": {
    id: "calgary-flames",
    name: "Calgary Flames",
    shortName: "CGY",
  logo: "/logos/nhl/Calgary Flames.svg",
  },
  "carolina-hurricanes": {
    id: "carolina-hurricanes",
    name: "Carolina Hurricanes",
    shortName: "CAR",
  logo: "/logos/nhl/Carolina Hurricanes.svg",
  },
  "chicago-blackhawks": {
    id: "chicago-blackhawks",
    name: "Chicago Blackhawks",
    shortName: "CHI",
  logo: "/logos/nhl/Chicago Blackhawks.svg",
  },
  "colorado-avalanche": {
    id: "colorado-avalanche",
    name: "Colorado Avalanche",
    shortName: "COL",
  logo: "/logos/nhl/Colorado Avalanche.svg",
  },
  "columbus-blue-jackets": {
    id: "columbus-blue-jackets",
    name: "Columbus Blue Jackets",
    shortName: "CBJ",
  logo: "/logos/nhl/Columbus Blue Jackets.svg",
  },
  "dallas-stars": {
    id: "dallas-stars",
    name: "Dallas Stars",
    shortName: "DAL",
  logo: "/logos/nhl/Dallas Stars.svg",
  },
  "detroit-red-wings": {
    id: "detroit-red-wings",
    name: "Detroit Red Wings",
    shortName: "DET",
  logo: "/logos/nhl/Detroit Red Wings.svg",
  },
  "edmonton-oilers": {
    id: "edmonton-oilers",
    name: "Edmonton Oilers",
    shortName: "EDM",
  logo: "/logos/nhl/Edmonton Oilers.svg",
  },
  "florida-panthers": {
    id: "florida-panthers",
    name: "Florida Panthers",
    shortName: "FLA",
  logo: "/logos/nhl/Florida Panthers.svg",
  },
  "los-angeles-kings": {
    id: "los-angeles-kings",
    name: "Los Angeles Kings",
    shortName: "LAK",
  logo: "/logos/nhl/Los Angeles Kings.svg",
  },
  "minnesota-wild": {
    id: "minnesota-wild",
    name: "Minnesota Wild",
    shortName: "MIN",
  logo: "/logos/nhl/Minnesota Wild.svg",
  },
  "montreal-canadiens": {
    id: "montreal-canadiens",
    name: "Montréal Canadiens",
    shortName: "MTL",
  logo: "/logos/nhl/Montréal Canadiens.svg",
  },
  "nashville-predators": {
    id: "nashville-predators",
    name: "Nashville Predators",
    shortName: "NSH",
  logo: "/logos/nhl/Nashville Predators.svg",
  },
  "new-jersey-devils": {
    id: "new-jersey-devils",
    name: "New Jersey Devils",
    shortName: "NJD",
  logo: "/logos/nhl/New Jersey Devils.svg",
  },
  "new-york-islanders": {
    id: "new-york-islanders",
    name: "New York Islanders",
    shortName: "NYI",
  logo: "/logos/nhl/New York Islanders.svg",
  },
  "new-york-rangers": {
    id: "new-york-rangers",
    name: "New York Rangers",
    shortName: "NYR",
  logo: "/logos/nhl/New York Rangers.svg",
  },
  "ottawa-senators": {
    id: "ottawa-senators",
    name: "Ottawa Senators",
    shortName: "OTT",
  logo: "/logos/nhl/Ottawa Senators.svg",
  },
  "philadelphia-flyers": {
    id: "philadelphia-flyers",
    name: "Philadelphia Flyers",
    shortName: "PHI",
  logo: "/logos/nhl/Philadelphia Flyers.svg",
  },
  "pittsburgh-penguins": {
    id: "pittsburgh-penguins",
    name: "Pittsburgh Penguins",
    shortName: "PIT",
  logo: "/logos/nhl/Pittsburgh Penguins.svg",
  },
  "san-jose-sharks": {
    id: "san-jose-sharks",
    name: "San Jose Sharks",
    shortName: "SJS",
  logo: "/logos/nhl/San Jose Sharks.svg",
  },
  "seattle-kraken": {
    id: "seattle-kraken",
    name: "Seattle Kraken",
    shortName: "SEA",
  logo: "/logos/nhl/Seattle Kraken.svg",
  },
  "st-louis-blues": {
    id: "st-louis-blues",
    name: "St. Louis Blues",
    shortName: "STL",
  logo: "/logos/nhl/St. Louis Blues.svg",
  },
  "tampa-bay-lightning": {
    id: "tampa-bay-lightning",
    name: "Tampa Bay Lightning",
    shortName: "TBL",
  logo: "/logos/nhl/Tampa Bay Lightning.svg",
  },
  "toronto-maple-leafs": {
    id: "toronto-maple-leafs",
    name: "Toronto Maple Leafs",
    shortName: "TOR",
  logo: "/logos/nhl/Toronto Maple Leafs.svg",
  },
  "utah-mammoth": {
    id: "utah-mammoth",
    name: "Utah Mammoth",
    shortName: "UTA",
  logo: "/logos/nhl/Utah Mammoth.svg",
  },
  "vancouver-canucks": {
    id: "vancouver-canucks",
    name: "Vancouver Canucks",
    shortName: "VAN",
  logo: "/logos/nhl/vancouver canucks.svg",
  },
  "vegas-golden-knights": {
    id: "vegas-golden-knights",
    name: "Vegas Golden Knights",
    shortName: "VGK",
  logo: "/logos/nhl/Vegas Golden Knights.svg",
  },
  "washington-capitals": {
    id: "washington-capitals",
    name: "Washington Capitals",
    shortName: "WSH",
  logo: "/logos/nhl/Washington Capitals.svg",
  },
  "winnipeg-jets": {
    id: "winnipeg-jets",
    name: "Winnipeg Jets",
    shortName: "WPG",
  logo: "/logos/nhl/Winnipeg Jets.svg",
  },

  // NCAAF Teams
  alabama: {
    id: "alabama",
    name: "Alabama Crimson Tide",
    shortName: "ALA",
    logo: "/assets/images/alabama.svg",
    record: "10-2",
  },
  georgia: {
    id: "georgia",
    name: "Georgia Bulldogs",
    shortName: "UGA",
    logo: "/assets/images/georgia.svg",
    record: "11-1",
  },

  // NCAAB Teams
  duke: {
    id: "duke",
    name: "Duke Blue Devils",
    shortName: "DUKE",
    logo: "/assets/images/duke.svg",
    record: "12-3",
  },
  unc: {
    id: "unc",
    name: "North Carolina Tar Heels",
    shortName: "UNC",
    logo: "/assets/images/unc.svg",
    record: "10-5",
  },
};

// League configuration for proper odds generation
const LEAGUES = {
  NFL: {
    teams: ["chiefs", "bills", "dolphins", "ravens", "bengals", "steelers"],
    hasQuarterWinners: true,
    hasHalfWinners: true,
    hasPeriodWinners: false,
  },
  NBA: {
    teams: ["lakers", "celtics", "warriors", "nuggets", "heat", "nets"],
    hasQuarterWinners: true,
    hasHalfWinners: true,
    hasPeriodWinners: false,
  },
  NHL: {
    teams: [
      "anaheim-ducks",
      "boston-bruins",
      "buffalo-sabres",
      "calgary-flames",
      "carolina-hurricanes",
      "chicago-blackhawks",
      "colorado-avalanche",
      "columbus-blue-jackets",
      "dallas-stars",
      "detroit-red-wings",
      "edmonton-oilers",
      "florida-panthers",
      "los-angeles-kings",
      "minnesota-wild",
      "montreal-canadiens",
      "nashville-predators",
      "new-jersey-devils",
      "new-york-islanders",
      "new-york-rangers",
      "ottawa-senators",
      "philadelphia-flyers",
      "pittsburgh-penguins",
      "san-jose-sharks",
      "seattle-kraken",
      "st-louis-blues",
      "tampa-bay-lightning",
      "toronto-maple-leafs",
      "utah-mammoth",
      "vancouver-canucks",
      "vegas-golden-knights",
      "washington-capitals",
      "winnipeg-jets"
    ],
    hasQuarterWinners: false,
    hasHalfWinners: false,
    hasPeriodWinners: true,
  },
  NCAAF: {
    teams: ["alabama", "georgia"],
    hasQuarterWinners: true,
    hasHalfWinners: true,
    hasPeriodWinners: false,
  },
  NCAAB: {
    teams: ["duke", "unc"],
    hasQuarterWinners: false,
    hasHalfWinners: true,
    hasPeriodWinners: false,
  },
};

// Generate professional odds data
const generateOddsData = (odds: number, line?: number): OddsData => ({
  odds,
  line,
  lastUpdated: new Date(),
});

// Generate comprehensive game odds matching professional GameCard expectations
const generateGameOdds = (
  leagueConfig: (typeof LEAGUES)[keyof typeof LEAGUES],
): GameOdds => {
  const spreadLine =
    Math.random() > 0.5
      ? Math.floor(Math.random() * 14) + 1
      : -(Math.floor(Math.random() * 14) + 1);

  const totalLine = 45.5 + Math.floor(Math.random() * 20);

  const gameOdds: GameOdds = {
    spread: {
      home: generateOddsData(-110, -spreadLine),
      away: generateOddsData(-110, spreadLine),
    },
    moneyline: {
      home: generateOddsData(
        spreadLine < 0
          ? -150 - Math.floor(Math.random() * 100)
          : 120 + Math.floor(Math.random() * 80),
      ),
      away: generateOddsData(
        spreadLine > 0
          ? -150 - Math.floor(Math.random() * 100)
          : 120 + Math.floor(Math.random() * 80),
      ),
    },
    total: {
      home: generateOddsData(-110),
      away: generateOddsData(-110),
      over: generateOddsData(-110, totalLine),
      under: generateOddsData(-110, totalLine),
    },
  };

  // Add period winners for NHL
  if (leagueConfig.hasPeriodWinners) {
    gameOdds.periodWinners = {
      "1st": generateOddsData(-110),
      "2nd": generateOddsData(-110),
      "3rd": generateOddsData(-110),
    };
  }

  // Add quarter winners for NFL, NBA, NCAAF
  if (leagueConfig.hasQuarterWinners) {
    gameOdds.quarterWinners = {
      "1st": generateOddsData(-110),
      "2nd": generateOddsData(-110),
      "3rd": generateOddsData(-110),
      "4th": generateOddsData(-110),
    };
  }

  // Add half winners
  if (leagueConfig.hasHalfWinners) {
    gameOdds.halfWinners = {
      "1st": generateOddsData(-110),
      "2nd": generateOddsData(-110),
    };
  }

  return gameOdds;
};

// Generate professional game matching exact type structure
const generateGame = (
  id: string,
  leagueId: keyof typeof LEAGUES,
  homeTeamId: keyof typeof TEAMS,
  awayTeamId: keyof typeof TEAMS,
  hoursOffset: number = 0,
  status: "upcoming" | "live" | "finished" = "upcoming",
): Game => {
  const config = LEAGUES[leagueId];
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + hoursOffset);

  return {
    id,
    leagueId,
    homeTeam: TEAMS[homeTeamId],
    awayTeam: TEAMS[awayTeamId],
    startTime,
    status,
    odds: generateGameOdds(config),
    venue: `${TEAMS[homeTeamId].name} Stadium`,
  };
};

// Professional trending games that will display beautifully
export const mockTrendingGames: Game[] = [
  generateGame("trending-1", "NBA", "lakers", "warriors", 1, "live"),
  generateGame("trending-2", "NFL", "chiefs", "bills", 2, "upcoming"),
  generateGame("trending-3", "NHL", "new-york-rangers", "boston-bruins", 0.5, "live"),
];

// Generate games for specific leagues
export const generateGamesForLeague = (
  leagueId: keyof typeof LEAGUES,
  count: number = 6,
): Game[] => {
  const config = LEAGUES[leagueId];
  const games: Game[] = [];

  for (let i = 0; i < count; i++) {
    const teams = config.teams;
    const homeTeam = teams[Math.floor(Math.random() * teams.length)];
    let awayTeam = teams[Math.floor(Math.random() * teams.length)];

    // Ensure different teams
    while (awayTeam === homeTeam) {
      awayTeam = teams[Math.floor(Math.random() * teams.length)];
    }

    const hoursOffset = Math.floor(Math.random() * 48) - 24; // Games from 24h ago to 24h from now
    const status =
      hoursOffset < -2 ? "finished" : hoursOffset < 2 ? "live" : "upcoming";

    games.push(
      generateGame(
        `${leagueId.toLowerCase()}-${i + 1}`,
        leagueId,
        homeTeam as keyof typeof TEAMS,
        awayTeam as keyof typeof TEAMS,
        hoursOffset,
        status,
      ),
    );
  }

  return games;
};

// All games across all leagues
export const mockAllGames: Game[] = [
  ...mockTrendingGames,
  ...generateGamesForLeague("NFL", 8),
  ...generateGamesForLeague("NBA", 12),
  ...generateGamesForLeague("NHL", 6),
  ...generateGamesForLeague("NCAAF", 4),
  ...generateGamesForLeague("NCAAB", 6),
];

// Professional sports structure
export const mockSports: Sport[] = [
  {
    id: "football",
    name: "Football",
    icon: "🏈",
    leagues: [
      {
        id: "nfl",
        name: "NFL",
        sportId: "football",
        games: generateGamesForLeague("NFL", 10),
      },
      {
        id: "ncaaf",
        name: "College Football",
        sportId: "football",
        games: generateGamesForLeague("NCAAF", 6),
      },
    ],
  },
  {
    id: "basketball",
    name: "Basketball",
    icon: "🏀",
    leagues: [
      {
        id: "nba",
        name: "NBA",
        sportId: "basketball",
        games: generateGamesForLeague("NBA", 15),
      },
      {
        id: "ncaab",
        name: "College Basketball",
        sportId: "basketball",
        games: generateGamesForLeague("NCAAB", 8),
      },
    ],
  },
  {
    id: "hockey",
    name: "Hockey",
    icon: "🏒",
    leagues: [
      {
        id: "nhl",
        name: "NHL",
        sportId: "hockey",
        games: generateGamesForLeague("NHL", 8),
      },
    ],
  },
];
