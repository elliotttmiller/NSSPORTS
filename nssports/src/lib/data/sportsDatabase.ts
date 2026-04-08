/**
 * Static Development Sports Database
 *
 * Provides a hardcoded list of sports categories, leagues, and their logos
 * so the sidebar always renders without requiring a live API key.
 *
 * Local SVG logos live in public/logos/{sport}/{team}.svg.
 * League-level logos reference the root logo for each league (e.g. NBA.svg).
 * Team-level logos are resolved by the transformer at game-render time and
 * are not duplicated here.
 *
 * ESPN CDN pattern (used for leagues without local assets):
 *   https://a.espncdn.com/i/teamlogos/leagues/500/<id>.png
 */

import type { Sport, League } from "@/types";

// ---------------------------------------------------------------------------
// League logo helpers
// ---------------------------------------------------------------------------

/** Local SVG league logos (under public/logos/) */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const LOCAL: Record<string, string> = {
  NBA: `${BASE_PATH}/logos/nba/NBA.svg`,
  NFL: `${BASE_PATH}/logos/nfl/NFL.svg`,
  NHL: `${BASE_PATH}/logos/nhl/NHL.svg`,
  NCAAB: `${BASE_PATH}/logos/ncaa/NCAA_logo.svg`,
  NCAAF: `${BASE_PATH}/logos/ncaa/NCAA_logo.svg`,
  ATP: `${BASE_PATH}/logos/atp/atp.svg`,
  WTA: `${BASE_PATH}/logos/wta/wta.svg`,
  ITF: `${BASE_PATH}/logos/itf/itf.svg`,
};

/** ESPN CDN logos for leagues without local assets */
const ESPN: Record<string, string> = {
  MLB: "https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png",
  WNBA: "https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png",
  CFL: "https://a.espncdn.com/i/teamlogos/leagues/500/cfl.png",
  EPL: "https://a.espncdn.com/i/teamlogos/soccer/500/23.png",
  LA_LIGA: "https://a.espncdn.com/i/teamlogos/soccer/500/20.png",
  BUNDESLIGA: "https://a.espncdn.com/i/teamlogos/soccer/500/10.png",
  IT_SERIE_A: "https://a.espncdn.com/i/teamlogos/soccer/500/12.png",
  FR_LIGUE_1: "https://a.espncdn.com/i/teamlogos/soccer/500/9.png",
  MLS: "https://a.espncdn.com/i/teamlogos/soccer/500/19.png",
  LIGA_MX: "https://a.espncdn.com/i/teamlogos/soccer/500/118.png",
  UEFA_CHAMPIONS_LEAGUE: "https://a.espncdn.com/i/teamlogos/soccer/500/3.png",
  UEFA_EUROPA_LEAGUE: "https://a.espncdn.com/i/teamlogos/soccer/500/2310.png",
  UFC: "https://a.espncdn.com/i/teamlogos/mma/500/ufc.png",
  PGA_MEN: "https://a.espncdn.com/i/teamlogos/golf/500/pga.png",
  PGA_WOMEN: "https://a.espncdn.com/i/teamlogos/golf/500/lpga.png",
};

function leagueLogo(leagueId: string): string {
  return LOCAL[leagueId] ?? ESPN[leagueId] ?? "";
}

// ---------------------------------------------------------------------------
// League factory
// ---------------------------------------------------------------------------

function mkLeague(id: string, name: string, sportId: string): League {
  return { id, name, sportId, logo: leagueLogo(id), games: [] };
}

// ---------------------------------------------------------------------------
// Static sports database
// ---------------------------------------------------------------------------

export const STATIC_SPORTS: Sport[] = [
  {
    id: "BASKETBALL",
    name: "Basketball",
    icon: "",
    leagues: [
      mkLeague("NBA", "NBA", "BASKETBALL"),
      mkLeague("WNBA", "WNBA", "BASKETBALL"),
      mkLeague("NCAAB", "NCAA Men's Basketball", "BASKETBALL"),
    ],
  },
  {
    id: "FOOTBALL",
    name: "Football",
    icon: "",
    leagues: [
      mkLeague("NFL", "NFL", "FOOTBALL"),
      mkLeague("NCAAF", "NCAA Football", "FOOTBALL"),
      mkLeague("CFL", "CFL", "FOOTBALL"),
    ],
  },
  {
    id: "HOCKEY",
    name: "Hockey",
    icon: "",
    leagues: [
      mkLeague("NHL", "NHL", "HOCKEY"),
      mkLeague("AHL", "AHL", "HOCKEY"),
    ],
  },
  {
    id: "BASEBALL",
    name: "Baseball",
    icon: "",
    leagues: [
      mkLeague("MLB", "MLB", "BASEBALL"),
      mkLeague("KBO", "KBO", "BASEBALL"),
      mkLeague("NPB", "NPB", "BASEBALL"),
    ],
  },
  {
    id: "SOCCER",
    name: "Soccer",
    icon: "",
    leagues: [
      mkLeague("EPL", "Premier League", "SOCCER"),
      mkLeague("LA_LIGA", "La Liga", "SOCCER"),
      mkLeague("BUNDESLIGA", "Bundesliga", "SOCCER"),
      mkLeague("IT_SERIE_A", "Serie A", "SOCCER"),
      mkLeague("FR_LIGUE_1", "Ligue 1", "SOCCER"),
      mkLeague("MLS", "MLS", "SOCCER"),
      mkLeague("LIGA_MX", "Liga MX", "SOCCER"),
      mkLeague("UEFA_CHAMPIONS_LEAGUE", "UEFA Champions League", "SOCCER"),
      mkLeague("UEFA_EUROPA_LEAGUE", "UEFA Europa League", "SOCCER"),
    ],
  },
  {
    id: "TENNIS",
    name: "Tennis",
    icon: "",
    leagues: [
      mkLeague("ATP", "ATP", "TENNIS"),
      mkLeague("WTA", "WTA", "TENNIS"),
      mkLeague("ITF", "ITF", "TENNIS"),
    ],
  },
  {
    id: "GOLF",
    name: "Golf",
    icon: "",
    leagues: [
      mkLeague("PGA_MEN", "PGA Tour", "GOLF"),
      mkLeague("PGA_WOMEN", "LPGA Tour", "GOLF"),
      mkLeague("LIV_TOUR", "LIV Golf", "GOLF"),
    ],
  },
  {
    id: "MMA",
    name: "MMA",
    icon: "",
    leagues: [
      mkLeague("UFC", "UFC", "MMA"),
    ],
  },
  {
    id: "BOXING",
    name: "Boxing",
    icon: "",
    leagues: [
      mkLeague("BOXING", "Boxing", "BOXING"),
    ],
  },
];

/**
 * Return a single sport by ID from the static database.
 */
export function getStaticSport(sportId: string): Sport | undefined {
  return STATIC_SPORTS.find((s) => s.id === sportId);
}

/**
 * Return a single league by ID from the static database.
 */
export function getStaticLeague(leagueId: string): League | undefined {
  for (const sport of STATIC_SPORTS) {
    const found = sport.leagues.find((l) => l.id === leagueId);
    if (found) return found;
  }
  return undefined;
}
