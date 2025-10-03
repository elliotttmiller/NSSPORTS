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
  NFL: "nfl",
  NHL: "nhl",
  MLB: "mlb",
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
