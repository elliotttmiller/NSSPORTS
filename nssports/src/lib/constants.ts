export const BREAKPOINTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
  ultrawide: 1920,
} as const;

export const BETTING_LIMITS = {
  minStake: 1,
  maxStake: 10000,
  defaultStake: 10,
} as const;

export const ROUTES = {
  home: "/",
  games: "/games",
  live: "/live",
  myBets: "/my-bets",
  account: "/account",
} as const;

export const SPORTS = {
  NBA: "nba",
  NCAAB: "ncaab",
  NFL: "nfl",
  NCAAF: "ncaaf",
  NHL: "nhl",
  MLB: "mlb",
  ATP: "atp",
  WTA: "wta",
  ITF: "itf",
} as const;

export const BET_TYPES = {
  spread: "spread",
  total: "total",
  moneyline: "moneyline",
} as const;

export const BET_MODES = {
  single: "single",
  parlay: "parlay",
} as const;

/**
 * Soccer league IDs
 * Used for league-specific filtering and logic across the application
 */
export const SOCCER_LEAGUES = [
  'MLS',
  'EPL', 
  'LA_LIGA',
  'BUNDESLIGA',
  'IT_SERIE_A',
  'FR_LIGUE_1'
] as const;

/**
 * Quarter period IDs used by NBA, NFL, NCAAF
 */
export const QUARTER_PERIODS = ['1q', '2q', '3q', '4q'] as const;

/**
 * Half period IDs used by most sports
 */
export const HALF_PERIODS = ['1h', '2h'] as const;

/**
 * NHL period IDs
 */
export const NHL_PERIODS = ['1p', '2p', '3p', 'reg', 'ot', 'so'] as const;

