/**
 * API Types for NSSPORTSEV
 * Clean types without database dependencies
 */

// Odds data structure for EV+ and arbitrage analysis
export interface OddsMap {
  [betType: string]: {
    [selection: string]: {
      odds: number;
      line?: number | null;
      lastUpdated: Date;
    };
  };
}

// Team information from API
export interface TeamRecord {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  record?: string | null;
}

// Odds record from API
export interface OddsRecord {
  id: string;
  gameId: string;
  betType: string;
  selection: string;
  odds: number;
  line?: number | null;
  lastUpdated: Date;
}

// Game with relations from API
export interface GameWithRelations {
  id: string;
  homeTeam: TeamRecord;
  awayTeam: TeamRecord;
  odds: OddsRecord[];
  startTime: Date;
  status: string;
  leagueId: string;
}
