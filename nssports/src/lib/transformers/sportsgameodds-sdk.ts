/**
 * Data Transformation Layer - SportsGameOdds SDK to Internal Format
 * 
 * ODDS-FOCUSED TRANSFORMATION:
 * ✅ Extract betting odds (moneyline, spread, total)
 * ✅ Extract player props odds (points, rebounds, assists, etc.)
 * ✅ Extract game props odds (team totals, quarters, etc.)
 * ✅ Multi-sportsbook odds aggregation
 * ✅ Preserve official league IDs (NBA, NFL, NHL uppercase)
 * ❌ Ignore live scores/stats (we don't need game state)
 * ❌ Ignore activity/period/clock (odds-only focus)
 * 
 * Protocol: Data Sanctity & Transformation
 * - Decouples internal models from SDK schema changes
 * - Provides clean, predictable odds data structure
 * - Handles missing odds gracefully with defaults
 * 
 * Official Documentation:
 * - Odds Structure: https://sportsgameodds.com/docs/data-types/odds-structure
 * - Markets: https://sportsgameodds.com/docs/data-types/markets
 * - Leagues: https://sportsgameodds.com/docs/data-types/leagues
 */

import type { GamePayload } from "../schemas/game";
import { logger } from "../logger";

/**
 * Official League ID Mapping
 * Source: https://sportsgameodds.com/docs/leagues
 * 
 * All league IDs use UPPERCASE format per official specification
 * This mapping ensures consistent ID format across the application
 */
const LEAGUE_ID_MAPPING: Record<string, string> = {
  // Basketball
  'NBA': 'NBA',
  'WNBA': 'WNBA',
  'NCAAB': 'NCAAB',
  'EUROLEAGUE': 'EUROLEAGUE',
  
  // Football
  'NFL': 'NFL',
  'NCAAF': 'NCAAF',
  'CFL': 'CFL',
  
  // Hockey
  'NHL': 'NHL',
  'AHL': 'AHL',
  'IIHF': 'IIHF',
  
  // Baseball
  'MLB': 'MLB',
  'MiLB': 'MiLB',
  'KBO': 'KBO',
  'NPB': 'NPB',
  
  // Soccer
  'EPL': 'EPL',
  'LALIGA': 'LALIGA',
  'BUNDESLIGA': 'BUNDESLIGA',
  'SERIEA': 'SERIEA',
  'LIGUE1': 'LIGUE1',
  'MLS': 'MLS',
  'UEFA': 'UEFA',
  'FIFA': 'FIFA',
  
  // MMA
  'UFC': 'UFC',
  'BELLATOR': 'BELLATOR',
  'PFL': 'PFL',
  
  // Tennis
  'ATP': 'ATP',
  'WTA': 'WTA',
  
  // Golf
  'PGA': 'PGA',
  'LPGA': 'LPGA',
  'LIV': 'LIV',
} as const;

/**
 * Official League to Sport Mapping
 * Source: https://sportsgameodds.com/docs/sports
 * 
 * Maps league IDs to their sport categories
 * Sport IDs use UPPERCASE format per official specification
 */
const LEAGUE_TO_SPORT_MAPPING: Record<string, string> = {
  // BASKETBALL leagues
  'NBA': 'BASKETBALL',
  'WNBA': 'BASKETBALL',
  'NCAAB': 'BASKETBALL',
  'EUROLEAGUE': 'BASKETBALL',
  
  // FOOTBALL leagues
  'NFL': 'FOOTBALL',
  'NCAAF': 'FOOTBALL',
  'CFL': 'FOOTBALL',
  
  // HOCKEY leagues
  'NHL': 'HOCKEY',
  'AHL': 'HOCKEY',
  'IIHF': 'HOCKEY',
  
  // BASEBALL leagues
  'MLB': 'BASEBALL',
  'MiLB': 'BASEBALL',
  'KBO': 'BASEBALL',
  'NPB': 'BASEBALL',
  
  // SOCCER leagues
  'EPL': 'SOCCER',
  'LALIGA': 'SOCCER',
  'BUNDESLIGA': 'SOCCER',
  'SERIEA': 'SOCCER',
  'LIGUE1': 'SOCCER',
  'MLS': 'SOCCER',
  'UEFA': 'SOCCER',
  'FIFA': 'SOCCER',
  
  // MMA leagues
  'UFC': 'MMA',
  'BELLATOR': 'MMA',
  'PFL': 'MMA',
  
  // TENNIS leagues
  'ATP': 'TENNIS',
  'WTA': 'TENNIS',
  
  // GOLF leagues
  'PGA': 'GOLF',
  'LPGA': 'GOLF',
  'LIV': 'GOLF',
} as const;

/**
 * Get sport category for a league
 * 
 * @param leagueId - Official league ID (uppercase)
 * @returns Sport category (uppercase) or 'UNKNOWN'
 */
export function getSportForLeague(leagueId: string): string {
  return LEAGUE_TO_SPORT_MAPPING[leagueId] || 'UNKNOWN';
}

/**
 * Team interface from SDK
 */
interface SDKTeam {
  teamID?: string;
  name?: string;
  shortName?: string;
  logo?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow additional properties from SDK
}

/**
 * Get team short name with fallback
 */
function getTeamShortName(team: SDKTeam): string {
  return team.shortName || team.name?.split(' ').pop() || team.name || '';
}

/**
 * Get team logo URL with fallback
 */
function getTeamLogo(team: SDKTeam, leagueId: string): string {
  if (team.logo) {
    return team.logo;
  }
  
  // Generate logo path from team name (matches our public/logos structure)
  const teamSlug = (team.name || 'unknown').toLowerCase().replace(/\s+/g, '-');
  return `/logos/${leagueId.toLowerCase()}/${teamSlug}.svg`; // Changed from .png to .svg
}

/**
 * SDK Event interface (subset of properties we use)
 * Matches official SDK Event type structure
 */
interface SDKEvent {
  eventID?: string;
  leagueID?: string;
  teams?: {
    home?: SDKTeam;
    away?: SDKTeam;
  };
  commence?: string;
  startTime?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activity?: any; // Can be string or Activity object from SDK
  venue?: string;
  scores?: {
    home?: number | null;
    away?: number | null;
  };
  period?: string | null;
  clock?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  odds?: any; // SDK odds structure is complex, varies by market type
}

/**
 * Extract odds data from SDK event
 * SDK events have odds structured differently than the old API
 */
function extractOdds(event: SDKEvent) {
  const now = new Date();
  
  // Default odds structure
  const defaultOdds = {
    odds: 0,
    line: undefined as number | undefined,
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

  // The new SDK returns odds with complex oddID format like:
  // - "points-away-game-ml-away" (moneyline away)
  // - "points-home-game-ml-home" (moneyline home)
  // - "points-away-game-sp-away" (spread away)
  // - "points-home-game-sp-home" (spread home)
  // - "points-all-game-ou-over" (total over)
  // - "points-all-game-ou-under" (total under)
  
  const oddsData = event.odds;
  
  // Helper to extract consensus odds from the SDK data structure
  // Uses fairOdds (consensus across all bookmakers) per API recommendation
  // https://sportsgameodds.com/docs/info/consensus-odds
  function extractConsensusOdds(oddData: unknown) {
    if (!oddData || typeof oddData !== 'object') return null;
    
    const data = oddData as Record<string, unknown>;
    
    // Use fairOdds (consensus) as recommended by API docs, fallback to bookOdds
    const oddsValue = data.fairOdds || data.bookOdds;
    
    // For spreads use fairSpread/bookSpread
    // For totals use fairOverUnder/bookOverUnder
    const spreadValue = data.fairSpread || data.bookSpread;
    const totalValue = data.fairOverUnder || data.bookOverUnder;
    const lineValue = spreadValue || totalValue;
    
    if (!oddsValue) return null;
    
    return {
      odds: parseFloat(String(oddsValue)) || 0,
      line: lineValue ? parseFloat(String(lineValue)) : undefined,
      lastUpdated: now,
    };
  }
  
  // Find main game odds by pattern matching
  let moneylineHome = defaultOdds;
  let moneylineAway = defaultOdds;
  let spreadHome = defaultOdds;
  let spreadAway = defaultOdds;
  let totalOver = defaultOdds;
  let totalUnder = defaultOdds;
  
  for (const [oddID, oddData] of Object.entries(oddsData)) {
    // Skip if not main game odds (ignore quarter, half, player props, etc.)
    if (!oddID.includes('-game-')) continue;
    
    const consensusOdds = extractConsensusOdds(oddData);
    if (!consensusOdds) continue;
    
    // Match moneyline odds
    if (oddID.includes('-ml-home')) {
      moneylineHome = consensusOdds;
    } else if (oddID.includes('-ml-away')) {
      moneylineAway = consensusOdds;
    }
    // Match spread odds  
    else if (oddID.includes('-sp-home')) {
      spreadHome = consensusOdds;
    } else if (oddID.includes('-sp-away')) {
      spreadAway = consensusOdds;
    }
    // Match total odds
    else if (oddID.includes('-ou-over')) {
      totalOver = consensusOdds;
    } else if (oddID.includes('-ou-under')) {
      totalUnder = consensusOdds;
    }
  }

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
 * IMPORTANT: Preserves official UPPERCASE league IDs from SDK
 * Per official docs: https://sportsgameodds.com/docs/leagues
 * 
 * @param event - Event from SDK (type SDKEvent)
 */
export function transformSDKEvent(event: SDKEvent): GamePayload | null {
  try {
    // SDK events use official uppercase IDs
    const eventID = event.eventID;
    const leagueID = event.leagueID; // Already uppercase from SDK
    const homeTeam = event.teams?.home;
    const awayTeam = event.teams?.away;
    const startTime = event.commence || event.startTime;
    
    if (!eventID || !leagueID || !homeTeam || !awayTeam || !startTime) {
      logger.warn(`Incomplete event data for event ${eventID}`);
      return null;
    }
    
    // Use official league ID directly (no normalization to lowercase)
    // SDK returns uppercase (NBA, NFL, NHL) per official specification
    const officialLeagueId = LEAGUE_ID_MAPPING[leagueID] || leagueID;
    
    // Parse start time
    const startDateTime = new Date(startTime);
    
    // Determine game status
    const status = mapStatus(event.activity, startDateTime);

    // Extract odds
    const odds = extractOdds(event);

    return {
      id: eventID,
      leagueId: officialLeagueId, // Official uppercase format
      homeTeam: {
        id: homeTeam.teamID || `${officialLeagueId}-${homeTeam.name || 'unknown'}`.toLowerCase().replace(/\s+/g, '-'),
        name: homeTeam.name || 'Unknown',
        shortName: getTeamShortName(homeTeam),
        logo: getTeamLogo(homeTeam, officialLeagueId),
        record: undefined,
      },
      awayTeam: {
        id: awayTeam.teamID || `${officialLeagueId}-${awayTeam.name || 'unknown'}`.toLowerCase().replace(/\s+/g, '-'),
        name: awayTeam.name || 'Unknown',
        shortName: getTeamShortName(awayTeam),
        logo: getTeamLogo(awayTeam, officialLeagueId),
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
export function transformSDKEvents(events: SDKEvent[]): GamePayload[] {
  // Include both upcoming and live games
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  
  return events
    .filter(e => {
      try {
        const time = e.commence || e.startTime;
        if (!time) return false;
        const startTime = new Date(time);
        // Include games that are upcoming or started within the last 4 hours
        return startTime > fourHoursAgo;
      } catch {
        return true; // Include if we can't parse the time
      }
    })
    .map(transformSDKEvent)
    .filter((game): game is GamePayload => game !== null);
}
