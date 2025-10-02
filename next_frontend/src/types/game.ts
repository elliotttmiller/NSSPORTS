export interface Odds {
  spread: {
    home: { odds: number; line?: number };
    away: { odds: number; line?: number };
  };
  moneyline: {
    home: { odds: number };
    away: { odds: number };
  };
  total: {
    over?: { odds: number; line?: number };
    under?: { odds: number; line?: number };
  };
  // [key: string]: OddsData | undefined; // Removed 'any' for type safety. Add back with a specific type if needed.
}

export interface Game {
  id: string;
  teams: string[];
  odds: Odds;
  startTime: string;
  leagueId?: string;
  status?: "live" | "upcoming" | "finished";
  homeTeam?: { 
    id?: string;
    name: string; 
    shortName: string; 
    record?: string;
    logo?: string;
  };
  awayTeam?: { 
    id?: string;
    name: string; 
    shortName: string; 
    record?: string;
    logo?: string;
  };
  homeScore?: number;
  awayScore?: number;
  period?: string;
  timeRemaining?: string;
  // Add more fields as needed
}
