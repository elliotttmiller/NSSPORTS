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

// Core data types for sports odds tracking
export interface Sport {
  id: string;
  name: string;
  icon: string;
  leagues: League[];
}

export interface League {
  id: string;
  name: string;
  sportId: string;
  logo: string;
  games: Game[];
}

export interface Game {
  id: string;
  leagueId: string;
  homeTeam: Team;
  awayTeam: Team;
  startTime: Date;
  status: "upcoming" | "live" | "finished";
  odds: GameOdds;
  venue?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  period?: string | null;
  timeRemaining?: string | null;
  periodDisplay?: string | null;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  record?: string | null;
}

export interface GameOdds {
  spread: SpreadBetOption;
  moneyline: MoneylineBetOption;
  total: TotalBetOption;
  periodWinners?: {
    [period: string]: OddsData;
  };
  quarterWinners?: {
    [quarter: string]: OddsData;
  };
  halfWinners?: {
    [half: string]: OddsData;
  };
}

export interface SpreadBetOption {
  home: OddsData;
  away: OddsData;
}

export interface MoneylineBetOption {
  home: OddsData;
  away: OddsData;
}

export interface TotalBetOption {
  home: OddsData;
  away: OddsData;
  over?: OddsData;
  under?: OddsData;
}

export interface BetOption {
  home: OddsData;
  away: OddsData;
  over?: OddsData;
  under?: OddsData;
}

export interface OddsData {
  odds: number; // American odds format
  line?: number | null; // spread or total line
  lastUpdated: Date;
}

export interface PlayerProp {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  team: "home" | "away";
  statType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  category:
    | "passing"
    | "rushing"
    | "receiving"
    | "scoring"
    | "defense"
    | "kicking";
}

export interface PropCategory {
  key: string;
  name: string;
  props: PlayerProp[];
}

