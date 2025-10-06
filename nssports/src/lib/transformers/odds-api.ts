/**
 * Data Transformation Layer for The Odds API
 * 
 * Protocol II: Data Sanctity & Transformation
 * - Decouples our internal models from external API schema
 * - Provides clean, predictable data structure
 * - Makes system resilient to upstream changes
 */

import type { OddsApiEvent } from "../the-odds-api";
import type { GamePayload } from "../schemas/game";
import { logger } from "../logger";

/**
 * Map sport keys from The Odds API to our internal league IDs
 */
const SPORT_KEY_TO_LEAGUE_ID: Record<string, string> = {
  basketball_nba: "nba",
  americanfootball_nfl: "nfl",
  icehockey_nhl: "nhl",
};

/**
 * Generate team ID from team name
 */
function generateTeamId(teamName: string, leagueId: string): string {
  const normalized = teamName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${leagueId}-${normalized}`;
}

/**
 * Generate team short name from full name
 */
function generateShortName(teamName: string): string {
  // Get last word as short name (e.g., "Los Angeles Lakers" -> "Lakers")
  const parts = teamName.split(" ");
  return parts[parts.length - 1];
}

/**
 * Get logo URL for a team
 */
function getTeamLogo(teamId: string): string {
  // Extract league and team from teamId (format: "leagueId-team-name")
  const [leagueId, ...teamParts] = teamId.split('-');
  const teamName = teamParts.join('-');
  return `/logos/${leagueId}/${teamName}.svg`;
}

/**
 * Extract odds data from bookmakers
 * Uses the first available bookmaker's odds
 */
function extractOdds(event: OddsApiEvent) {
  const now = new Date();
  
  // Default odds structure
  const defaultOdds = {
    odds: 0,
    line: undefined,
    lastUpdated: now,
  };

  // Get first bookmaker (prefer popular ones like DraftKings, FanDuel)
  const bookmaker = event.bookmakers?.[0];
  
  if (!bookmaker) {
    logger.warn(`No bookmakers found for event ${event.id}`);
    return {
      spread: { home: defaultOdds, away: defaultOdds },
      moneyline: { home: defaultOdds, away: defaultOdds },
      total: { 
        home: defaultOdds, 
        away: defaultOdds,
        over: defaultOdds,
        under: defaultOdds,
      },
    };
  }

  const lastUpdate = new Date(bookmaker.last_update);

  // Extract h2h (moneyline)
  const h2hMarket = bookmaker.markets.find((m) => m.key === "h2h");
  const homeH2h = h2hMarket?.outcomes.find((o) => o.name === event.home_team);
  const awayH2h = h2hMarket?.outcomes.find((o) => o.name === event.away_team);

  // Extract spreads
  const spreadsMarket = bookmaker.markets.find((m) => m.key === "spreads");
  const homeSpread = spreadsMarket?.outcomes.find((o) => o.name === event.home_team);
  const awaySpread = spreadsMarket?.outcomes.find((o) => o.name === event.away_team);

  // Extract totals
  const totalsMarket = bookmaker.markets.find((m) => m.key === "totals");
  const overTotal = totalsMarket?.outcomes.find((o) => o.name === "Over");
  const underTotal = totalsMarket?.outcomes.find((o) => o.name === "Under");

  return {
    spread: {
      home: {
        odds: homeSpread?.price ?? 0,
        line: homeSpread?.point,
        lastUpdated: lastUpdate,
      },
      away: {
        odds: awaySpread?.price ?? 0,
        line: awaySpread?.point,
        lastUpdated: lastUpdate,
      },
    },
    moneyline: {
      home: {
        odds: homeH2h?.price ?? 0,
        line: undefined,
        lastUpdated: lastUpdate,
      },
      away: {
        odds: awayH2h?.price ?? 0,
        line: undefined,
        lastUpdated: lastUpdate,
      },
    },
    total: {
      home: {
        odds: overTotal?.price ?? 0,
        line: overTotal?.point,
        lastUpdated: lastUpdate,
      },
      away: {
        odds: underTotal?.price ?? 0,
        line: underTotal?.point,
        lastUpdated: lastUpdate,
      },
      over: {
        odds: overTotal?.price ?? 0,
        line: overTotal?.point,
        lastUpdated: lastUpdate,
      },
      under: {
        odds: underTotal?.price ?? 0,
        line: underTotal?.point,
        lastUpdated: lastUpdate,
      },
    },
  };
}

/**
 * Transform The Odds API event to our internal GamePayload format
 */
export function transformOddsApiEvent(event: OddsApiEvent): GamePayload | null {
  try {
    // Map sport key to our league ID
    const leagueId = SPORT_KEY_TO_LEAGUE_ID[event.sport_key];
    
    if (!leagueId) {
      logger.warn(`Unknown sport key: ${event.sport_key}`);
      return null;
    }

    // Generate team data
    const homeTeamId = generateTeamId(event.home_team, leagueId);
    const awayTeamId = generateTeamId(event.away_team, leagueId);

    // Extract odds
    const odds = extractOdds(event);

    // Determine game status based on commence time
    const commenceTime = new Date(event.commence_time);
    const now = new Date();
    const status = commenceTime > now ? "upcoming" : "live";

    return {
      id: event.id,
      leagueId,
      homeTeam: {
        id: homeTeamId,
        name: event.home_team,
        shortName: generateShortName(event.home_team),
        logo: getTeamLogo(homeTeamId),
        record: undefined,
      },
      awayTeam: {
        id: awayTeamId,
        name: event.away_team,
        shortName: generateShortName(event.away_team),
        logo: getTeamLogo(awayTeamId),
        record: undefined,
      },
      startTime: commenceTime,
      status,
      odds,
      venue: undefined,
      homeScore: undefined,
      awayScore: undefined,
      period: undefined,
      timeRemaining: undefined,
    };
  } catch (error) {
    logger.error("Error transforming odds API event", error, { eventId: event.id });
    return null;
  }
}

/**
 * Transform multiple events, filtering out any that fail transformation
 */
export function transformOddsApiEvents(events: OddsApiEvent[]): GamePayload[] {
  return events
    .map(transformOddsApiEvent)
    .filter((game): game is GamePayload => game !== null);
}
