// Core data types for the wagering application
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
  venue?: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  record?: string;
}

export interface GameOdds {
  spread: SpreadBetOption;
  moneyline: MoneylineBetOption;
  total: TotalBetOption;
  // Optional period/quarter/half winner odds
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
  line?: number; // spread or total line
  lastUpdated: Date;
}

export interface Bet {
  id: string;
  gameId: string;
  betType:
    | "spread"
    | "moneyline"
    | "total"
    | "player_prop"
    | "period_winner"
    | "quarter_winner"
    | "half_winner"
    | "parlay";
  selection: "home" | "away" | "over" | "under";
  odds: number;
  line?: number;
  stake: number;
  potentialPayout: number;
  game: Game;
  periodOrQuarterOrHalf?: string; // e.g. '1st', '2nd', etc.
  playerProp?: {
    playerId: string;
    playerName: string;
    statType: string;
    category: string;
  };
  legs?: Bet[];
}

export interface BetSlip {
  bets: Bet[];
  betType: "single" | "parlay";
  totalStake: number;
  totalPayout: number;
  totalOdds: number;
}

export interface NavigationState {
  selectedSport: string | null;
  selectedLeague: string | null;
  mobilePanel: "navigation" | "workspace" | "betslip" | null;
}

export interface AppState {
  navigation: NavigationState;
  betSlip: BetSlip;
  sports: Sport[];
  isLoading: boolean;
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
