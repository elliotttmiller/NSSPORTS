/**
 * Data Transformation Layer for SportsGameOdds SDK
 * 
 * Protocol II: Data Sanctity & Transformation
 * - Decouples our internal models from SDK schema
 * - Provides clean, predictable data structure
 * - Makes system resilient to upstream changes
 * - Handles SDK Event type properly
 * 
 * Official Documentation:
 * - Sports: https://sportsgameodds.com/docs/data-types/sports
 * - Leagues: https://sportsgameodds.com/docs/data-types/leagues
 */

import type { GamePayload } from "../schemas/game";
import { logger } from "../logger";

/**
 * Official League ID mapping from SportsGameOdds API
 * Source: https://sportsgameodds.com/docs/data-types/leagues
 * 
 * Maps SDK leagueID (uppercase) to internal format (lowercase)
 * We normalize to lowercase for consistency in our UI/database
 */
const LEAGUE_ID_MAPPING: Record<string, string> = {
  // Basketball
  "NBA": "NBA",
  "NBA_G_LEAGUE": "NBA_G_LEAGUE",
  "WNBA": "WNBA",
  "NCAAB": "NCAAB",
  
  // Football
  "NFL": "NFL",
  "NCAAF": "NCAAF",
  "CFL": "CFL",
  "XFL": "XFL",
  "USFL": "USFL",
  
  // Hockey
  "NHL": "NHL",
  "AHL": "AHL",
  "KHL": "KHL",
  "SHL": "SHL",
  
  // Baseball
  "MLB": "MLB",
  "MLB_MINORS": "MLB_MINORS",
  "NPB": "NPB",
  "KBO": "KBO",
  
  // Soccer
  "EPL": "EPL",
  "LA_LIGA": "LA_LIGA",
  "BUNDESLIGA": "BUNDESLIGA",
  "IT_SERIE_A": "IT_SERIE_A",
  "FR_LIGUE_1": "FR_LIGUE_1",
  "MLS": "MLS",
  "LIGA_MX": "LIGA_MX",
  "UEFA_CHAMPIONS_LEAGUE": "UEFA_CHAMPIONS_LEAGUE",
  "UEFA_EUROPA_LEAGUE": "UEFA_EUROPA_LEAGUE",
  
  // Other sports
  "UFC": "UFC",
  "ATP": "ATP",
  "WTA": "WTA",
  "PGA_MEN": "PGA_MEN",
};

/**
 * Sport ID mapping from League ID
 * Source: https://sportsgameodds.com/docs/data-types/sports
 */
const LEAGUE_TO_SPORT_MAPPING: Record<string, string> = {
  // Basketball
  "NBA": "BASKETBALL",
  "NBA_G_LEAGUE": "BASKETBALL",
  "WNBA": "BASKETBALL",
  "NCAAB": "BASKETBALL",
  
  // Football
  "NFL": "FOOTBALL",
  "NCAAF": "FOOTBALL",
  "CFL": "FOOTBALL",
  "XFL": "FOOTBALL",
  "USFL": "FOOTBALL",
  
  // Hockey
  "NHL": "HOCKEY",
  "AHL": "HOCKEY",
  "KHL": "HOCKEY",
  "SHL": "HOCKEY",
  
  // Baseball
  "MLB": "BASEBALL",
  "MLB_MINORS": "BASEBALL",
  "NPB": "BASEBALL",
  "KBO": "BASEBALL",
  
  // Soccer
  "EPL": "SOCCER",
  "LA_LIGA": "SOCCER",
  "BUNDESLIGA": "SOCCER",
  "IT_SERIE_A": "SOCCER",
  "FR_LIGUE_1": "SOCCER",
  "MLS": "SOCCER",
  "LIGA_MX": "SOCCER",
  "UEFA_CHAMPIONS_LEAGUE": "SOCCER",
  "UEFA_EUROPA_LEAGUE": "SOCCER",
  
  // MMA
  "UFC": "MMA",
  
  // Tennis
  "ATP": "TENNIS",
  "WTA": "TENNIS",
  
  // Golf
  "PGA_MEN": "GOLF",
};

/**
 * Generate team short name/abbreviation from team object
 */
function getTeamShortName(team: any): string {
  return team.abbreviation || team.shortName || team.name?.split(" ").pop() || team.name || "TBD";
}

/**
 * Get logo URL for a team
 * Uses the team's logo from the SDK if available, otherwise falls back to local logos
 */
function getTeamLogo(team: any, leagueId: string): string {
  if (team.logo) {
    return team.logo;
  }
  
  // Fallback to local logos
  const teamSlug = (team.name || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  
  return `/logos/${leagueId}/${teamSlug}.svg`;
}

/**
 * Extract odds data from SDK event
 * SDK events have odds structured differently than the old API
 */
function extractOdds(event: any) {
  const now = new Date();
  
  // Default odds structure
  const defaultOdds = {
    odds: 0,
    line: undefined,
    lastUpdated: now,
  };

  // If no odds data, return defaults
  if (!event.odds || Object.keys(event.odds).length === 0) {
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

  // SDK structures odds by market type, then by bookmaker
  const oddsData = event.odds;
  
  // Helper to get first available odds from any bookmaker
  function getFirstOdds(marketType: string, outcomeName: string) {
    const market = oddsData[marketType];
    if (!market || !Array.isArray(market)) return null;
    
    for (const bookmaker of market) {
      if (!bookmaker.outcomes) continue;
      const outcome = bookmaker.outcomes.find((o: any) => o.name === outcomeName);
      if (outcome) {
        return {
          odds: outcome.price || 0,
          line: outcome.point,
          lastUpdated: new Date(bookmaker.lastUpdated || now),
        };
      }
    }
    
    return null;
  }
  
  // Extract moneyline
  const moneylineHome = getFirstOdds('moneyline', event.teams?.home?.name) || defaultOdds;
  const moneylineAway = getFirstOdds('moneyline', event.teams?.away?.name) || defaultOdds;
  
  // Extract spreads
  const spreadHome = getFirstOdds('spread', event.teams?.home?.name) || defaultOdds;
  const spreadAway = getFirstOdds('spread', event.teams?.away?.name) || defaultOdds;
  
  // Extract totals
  const totalOver = getFirstOdds('total', 'Over') || defaultOdds;
  const totalUnder = getFirstOdds('total', 'Under') || defaultOdds;

  return {
    spread: {
      home: spreadHome,
      away: spreadAway,
    },
    moneyline: {
      home: moneylineHome,
      away: moneylineAway,
    },
    total: {
      home: totalOver,
      away: totalUnder,
      over: totalOver,
      under: totalUnder,
    },
  };
}

/**
 * Map SDK status to our internal status
 */
function mapStatus(
  activity: string | undefined,
  startTime: Date
): "upcoming" | "live" | "finished" {
  // SDK uses "activity" field
  if (activity === "in_progress" || activity === "live") return "live";
  if (activity === "final" || activity === "finished") return "finished";
  if (activity === "scheduled") {
    // Check if game should have started
    const now = new Date();
    return startTime > now ? "upcoming" : "live";
  }
  
  // Default based on time
  const now = new Date();
  if (startTime > now) return "upcoming";
  
  // If game started within last 4 hours, consider it live
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return startTime > fourHoursAgo ? "live" : "finished";
}

/**
 * Transform SDK event to our internal GamePayload format
 * 
 * @param event - Event from SDK (type any to handle SDK's types)
 */
export function transformSDKEvent(event: any): GamePayload | null {
  try {
    // SDK events use different property names
    const eventID = event.eventID;
    const leagueID = event.leagueID;
    const homeTeam = event.teams?.home;
    const awayTeam = event.teams?.away;
    const startTime = event.commence || event.startTime;
    
    if (!eventID || !leagueID || !homeTeam || !awayTeam || !startTime) {
      logger.warn(`Incomplete event data for event ${eventID}`);
      return null;
    }
    
    // Map league ID to our internal format
    const internalLeagueId = LEAGUE_ID_MAPPING[leagueID] || leagueID.toLowerCase();
    
    // Parse start time
    const startDateTime = new Date(startTime);
    
    // Determine game status
    const status = mapStatus(event.activity, startDateTime);

    // Extract odds
    const odds = extractOdds(event);

    return {
      id: eventID,
      leagueId: internalLeagueId,
      homeTeam: {
        id: homeTeam.teamID || `${internalLeagueId}-${homeTeam.name}`.toLowerCase().replace(/\s+/g, '-'),
        name: homeTeam.name,
        shortName: getTeamShortName(homeTeam),
        logo: getTeamLogo(homeTeam, internalLeagueId),
        record: undefined,
      },
      awayTeam: {
        id: awayTeam.teamID || `${internalLeagueId}-${awayTeam.name}`.toLowerCase().replace(/\s+/g, '-'),
        name: awayTeam.name,
        shortName: getTeamShortName(awayTeam),
        logo: getTeamLogo(awayTeam, internalLeagueId),
        record: undefined,
      },
      startTime: startDateTime,
      status,
      odds,
      venue: event.venue || undefined,
      homeScore: event.scores?.home || undefined,
      awayScore: event.scores?.away || undefined,
      period: event.period || undefined,
      timeRemaining: event.clock || undefined,
    };
  } catch (error) {
    logger.error("Error transforming SDK event", error, { eventId: event?.eventID });
    return null;
  }
}

/**
 * Transform multiple SDK events, filtering out any that fail transformation
 */
export function transformSDKEvents(events: any[]): GamePayload[] {
  // Include both upcoming and live games
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  
  return events
    .filter(e => {
      try {
        const startTime = new Date(e.commence || e.startTime);
        // Include games that are upcoming or started within the last 4 hours
        return startTime > fourHoursAgo;
      } catch {
        return true; // Include if we can't parse the time
      }
    })
    .map(transformSDKEvent)
    .filter((game): game is GamePayload => game !== null);
}
