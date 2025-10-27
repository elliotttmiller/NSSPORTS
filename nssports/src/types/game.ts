/**
 * Official SportsGameOdds API Bet Types
 * Source: https://sportsgameodds.com/docs/data-types/types-and-sides
 */
export type BetTypeID = 'ml' | 'ml3way' | 'sp' | 'ou' | 'eo' | 'yn' | 'prop';

/**
 * Official SportsGameOdds API Side IDs
 * Source: https://sportsgameodds.com/docs/data-types/types-and-sides
 */
export type SideID = 
  // Moneyline & Spread
  | 'home' 
  | 'away'
  // 3-Way Moneyline
  | 'draw'
  | 'away+draw'
  | 'home+draw'
  | 'not_draw'
  // Over/Under
  | 'over'
  | 'under'
  // Even/Odd
  | 'even'
  | 'odd'
  // Yes/No
  | 'yes'
  | 'no'
  // Prop Bet
  | 'side1'
  | 'side2';

/**
 * Official SportsGameOdds API Odd ID Format
 * Format: {statID}-{statEntityID}-{periodID}-{betTypeID}-{sideID}
 * Source: https://sportsgameodds.com/docs/data-types/odds
 */
export type OddID = string;

/**
 * Official Sport IDs from SportsGameOdds API
 * Source: https://sportsgameodds.com/docs/data-types/sports
 */
export type SportID = 
  | 'BASEBALL' 
  | 'BASKETBALL' 
  | 'FOOTBALL' 
  | 'HOCKEY' 
  | 'SOCCER'
  | 'TENNIS'
  | 'GOLF'
  | 'MMA'
  | 'CRICKET'
  | 'RUGBY'
  | 'MOTORSPORTS'
  | 'HANDBALL'
  | 'VOLLEYBALL'
  | 'WATER_POLO'
  | 'BADMINTON'
  | 'TABLE_TENNIS'
  | 'BEACH_VOLLEYBALL'
  | 'AUSSIE_RULES_FOOTBALL'
  | 'BOXING'
  | 'DARTS'
  | 'ESPORTS'
  | 'FLOORBALL'
  | 'FUTSAL'
  | 'HORSE_RACING'
  | 'LACROSSE'
  | 'BANDY'
  | 'SNOOKER'
  | 'NON_SPORTS';

/**
 * Official League IDs from SportsGameOdds API
 * Source: https://sportsgameodds.com/docs/data-types/leagues
 */
export type LeagueID = 
  // Baseball
  | 'MLB' | 'MLB_MINORS' | 'NPB' | 'KBO' | 'CPBL' | 'LBPRC' | 'LIDOM' | 'LMP' | 'LVBP' | 'WBC'
  // Basketball
  | 'NBA' | 'NBA_G_LEAGUE' | 'WNBA' | 'NCAAB'
  // Football
  | 'NFL' | 'NCAAF' | 'CFL' | 'XFL' | 'USFL'
  // Hockey
  | 'NHL' | 'AHL' | 'KHL' | 'SHL'
  // Soccer
  | 'EPL' | 'LA_LIGA' | 'BUNDESLIGA' | 'IT_SERIE_A' | 'FR_LIGUE_1' | 'MLS' | 'LIGA_MX'
  | 'UEFA_CHAMPIONS_LEAGUE' | 'UEFA_EUROPA_LEAGUE' | 'BR_SERIE_A' | 'INTERNATIONAL_SOCCER'
  // Tennis
  | 'ATP' | 'WTA' | 'ITF'
  // Golf
  | 'PGA_MEN' | 'PGA_WOMEN' | 'LIV_TOUR'
  // MMA
  | 'UFC'
  // Handball
  | 'EHF_EURO' | 'EHF_EURO_CUP' | 'ASOBAL' | 'SEHA' | 'IHF_SUPER_GLOBE'
  // Non-Sports
  | 'POLITICS' | 'EVENTS' | 'TV' | 'MOVIES' | 'MUSIC' | 'CELEBRITY' | 'FUN' | 'MARKETS' | 'WEATHER';

/**
 * Official Bookmaker IDs from SportsGameOdds API
 * Source: https://sportsgameodds.com/docs/data-types/bookmakers
 */
export type BookmakerID = 
  | 'draftkings' | 'fanduel' | 'betmgm' | 'caesars' | 'pointsbet' 
  | 'barstool' | 'betrivers' | 'wynnbet' | 'unibet' | 'foxbet'
  | 'bet365' | 'williamhill' | 'pinnacle' | 'bovada' | 'mybookie'
  | 'betonline' | 'sportsbetting_ag' | 'betanysports' | 'betus' | 'gtbets'
  | 'everygame' | 'lowvig' | 'ballybet' | 'espnbet' | 'fanatics'
  | 'hardrock bet' | 'betparx' | 'sugarhouse' | 'betfred' | 'circa'
  | 'superbook' | 'windcreek' | 'betrsportsbook' | 'fliff' | 'fourwinds'
  | 'hotstreak' | 'parlayplay' | 'primesports' | 'prizepicks' | 'prophetexchange'
  | 'sleeper' | 'sporttrade' | 'underdog' | 'unknown'
  | 'si' | 'thescorebet' | 'tipico' | 'nordst arbets' | 'coolbet'
  | '1xbet' | '888sport' | 'betclic' | 'betfairexchange' | 'betfairsportsbook'
  | 'betvictor' | 'betway' | 'bluebet' | 'bodog' | 'bookmakereu'
  | 'boombet' | 'boylesports' | 'casumo' | 'coral' | 'grosvenor'
  | 'ladbrokes' | 'leovegas' | 'livescorebet' | 'marathonbet' | 'matchbook'
  | 'mrgreen' | 'neds' | 'nordicbet' | 'paddypower' | 'playup'
  | 'skybet' | 'sportsbet' | 'stake' | 'suprabets' | 'tab'
  | 'tabtouch' | 'topsport' | 'virginbet' | 'betsafe' | 'betsson';

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
