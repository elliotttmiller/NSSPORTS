/**
 * Data Transformation Layer for SportsGameOdds API
 * 
 * Protocol II: Data Sanctity & Transformation
 * - Decouples our internal models from external API schema
 * - Provides clean, predictable data structure
 * - Makes system resilient to upstream changes
 */

import type { SportsGameOddsEvent } from "../sportsgameodds-api";
import type { GamePayload } from "../schemas/game";
import { logger } from "../logger";

/**
 * Map league IDs from SportsGameOdds API to our internal league IDs
 */
const LEAGUE_ID_MAPPING: Record<string, string> = {
  "NBA": "nba",
  "NFL": "nfl",
  "NHL": "nhl",
  "NCAAB": "ncaab",
  "NCAAF": "ncaaf",
};

/**
 * Generate team short name/abbreviation from team object
 */
function getTeamShortName(team: { shortName?: string; abbreviation?: string; name: string }): string {
  return team.abbreviation || team.shortName || team.name.split(" ").pop() || team.name;
}

/**
 * Get logo URL for a team
 * Uses the team's logo from the API if available, otherwise falls back to local logos
 */
function getTeamLogo(team: { logo?: string; name: string }, leagueId: string): string {
  if (team.logo) {
    return team.logo;
  }
  
  // Fallback to local logos
  const teamSlug = team.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  
  return `/logos/${leagueId}/${teamSlug}.svg`;
}

/**
 * Extract odds data from SportsGameOdds event
 * Consolidates odds from different bookmakers, preferring popular ones
 */
function extractOdds(event: SportsGameOddsEvent) {
  const now = new Date();
  
  // Default odds structure
  const defaultOdds = {
    odds: 0,
    line: undefined,
    lastUpdated: now,
  };

  // If no odds data, return defaults
  if (!event.odds || Object.keys(event.odds).length === 0) {
    logger.warn(`No odds found for event ${event.eventID}`);
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

  // Extract odds by market type
  // SportsGameOdds typically structures odds by market type
  const oddsData = event.odds as Record<string, any>;
  
  // Extract moneyline odds
  const moneylineHome = oddsData.moneyline?.home || oddsData.h2h?.home || defaultOdds;
  const moneylineAway = oddsData.moneyline?.away || oddsData.h2h?.away || defaultOdds;
  
  // Extract spread odds
  const spreadHome = oddsData.spread?.home || oddsData.spreads?.home || defaultOdds;
  const spreadAway = oddsData.spread?.away || oddsData.spreads?.away || defaultOdds;
  
  // Extract total odds
  const totalOver = oddsData.total?.over || oddsData.totals?.over || defaultOdds;
  const totalUnder = oddsData.total?.under || oddsData.totals?.under || defaultOdds;

  return {
    spread: {
      home: {
        odds: typeof spreadHome === "object" ? spreadHome.odds || spreadHome.price || 0 : 0,
        line: typeof spreadHome === "object" ? spreadHome.line || spreadHome.point : undefined,
        lastUpdated: now,
      },
      away: {
        odds: typeof spreadAway === "object" ? spreadAway.odds || spreadAway.price || 0 : 0,
        line: typeof spreadAway === "object" ? spreadAway.line || spreadAway.point : undefined,
        lastUpdated: now,
      },
    },
    moneyline: {
      home: {
        odds: typeof moneylineHome === "object" ? moneylineHome.odds || moneylineHome.price || 0 : 0,
        line: undefined,
        lastUpdated: now,
      },
      away: {
        odds: typeof moneylineAway === "object" ? moneylineAway.odds || moneylineAway.price || 0 : 0,
        line: undefined,
        lastUpdated: now,
      },
    },
    total: {
      home: {
        odds: typeof totalOver === "object" ? totalOver.odds || totalOver.price || 0 : 0,
        line: typeof totalOver === "object" ? totalOver.line || totalOver.point : undefined,
        lastUpdated: now,
      },
      away: {
        odds: typeof totalUnder === "object" ? totalUnder.odds || totalUnder.price || 0 : 0,
        line: typeof totalUnder === "object" ? totalUnder.line || totalUnder.point : undefined,
        lastUpdated: now,
      },
      over: {
        odds: typeof totalOver === "object" ? totalOver.odds || totalOver.price || 0 : 0,
        line: typeof totalOver === "object" ? totalOver.line || totalOver.point : undefined,
        lastUpdated: now,
      },
      under: {
        odds: typeof totalUnder === "object" ? totalUnder.odds || totalUnder.price || 0 : 0,
        line: typeof totalUnder === "object" ? totalUnder.line || totalUnder.point : undefined,
        lastUpdated: now,
      },
    },
  };
}

/**
 * Map SportsGameOdds status to our internal status
 */
function mapStatus(
  apiStatus: string | undefined,
  startTime: Date
): "upcoming" | "live" | "finished" {
  if (apiStatus === "live") return "live";
  if (apiStatus === "finished") return "finished";
  if (apiStatus === "scheduled") {
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
 * Transform SportsGameOdds event to our internal GamePayload format
 */
export function transformSportsGameOddsEvent(event: SportsGameOddsEvent): GamePayload | null {
  try {
    // Map league ID to our internal format
    const leagueId = LEAGUE_ID_MAPPING[event.leagueID] || event.leagueID.toLowerCase();
    
    // Parse start time
    const startTime = new Date(event.startTime);
    
    // Determine game status
    const status = mapStatus(event.status, startTime);

    // Extract odds
    const odds = extractOdds(event);

    return {
      id: event.eventID,
      leagueId,
      homeTeam: {
        id: event.homeTeam.teamID,
        name: event.homeTeam.name,
        shortName: getTeamShortName(event.homeTeam),
        logo: getTeamLogo(event.homeTeam, leagueId),
        record: undefined,
      },
      awayTeam: {
        id: event.awayTeam.teamID,
        name: event.awayTeam.name,
        shortName: getTeamShortName(event.awayTeam),
        logo: getTeamLogo(event.awayTeam, leagueId),
        record: undefined,
      },
      startTime,
      status,
      odds,
      venue: event.venue || undefined,
      homeScore: event.homeScore || undefined,
      awayScore: event.awayScore || undefined,
      period: event.period || undefined,
      timeRemaining: event.timeRemaining || undefined,
    };
  } catch (error) {
    logger.error("Error transforming SportsGameOdds event", error, { eventId: event.eventID });
    return null;
  }
}

/**
 * Transform multiple events, filtering out any that fail transformation
 */
export function transformSportsGameOddsEvents(events: SportsGameOddsEvent[]): GamePayload[] {
  // Include both upcoming and live games
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  
  return events
    .filter(e => {
      try {
        const startTime = new Date(e.startTime);
        // Include games that are upcoming or started within the last 4 hours
        return startTime > fourHoursAgo;
      } catch {
        return true; // Include if we can't parse the time
      }
    })
    .map(transformSportsGameOddsEvent)
    .filter((game): game is GamePayload => game !== null);
}
