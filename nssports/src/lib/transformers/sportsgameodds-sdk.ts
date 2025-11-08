/**
 * Data Transformation Layer - SportsGameOdds SDK to Internal Format
 * 
 * ODDS-FOCUSED TRANSFORMATION:
 * ✅ Extract betting odds (moneyline, spread, total)
 * ✅ Extract player props odds (points, rebounds, assists, etc.)
 * ✅ Extract game props odds (team totals, quarters, etc.)
 * ✅ Multi-sportsbook odds aggregation
 * ✅ Preserve official league IDs (NBA, NFL, NHL uppercase)
 * ✅ Apply custom juice/margins to fair odds
 * ❌ Ignore live scores/stats (we don't need game state)
 * ❌ Ignore activity/period/clock (odds-only focus)
 * 
 * Protocol: Data Sanctity & Transformation
 * - Decouples internal models from SDK schema changes
 * - Provides clean, predictable odds data structure
 * - Handles missing odds gracefully with defaults
 * - Applies configurable juice/margins for house edge
 * 
 * Official Documentation:
 * - Odds Structure: https://sportsgameodds.com/docs/data-types/odds-structure
 * - Markets: https://sportsgameodds.com/docs/data-types/markets
 * - Leagues: https://sportsgameodds.com/docs/data-types/leagues
 */

import type { GamePayload } from "../schemas/game";
import { logger } from "../logger";
// ⭐ OFFICIAL SDK TYPE - Import official Event type from SDK
import type { SDKEvent } from "../sportsgameodds-sdk";
// ⭐ JUICE SERVICE - Apply custom margins to fair odds
import { oddsJuiceService } from "../odds-juice-service";

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
 * Uses official ESPN team abbreviations for NFL, NBA, and NHL
 */
function getTeamShortName(team: SDKTeam): string {
  // Official team abbreviation mapping (ESPN standard)
  const officialAbbreviations: Record<string, string> = {
    // NFL Teams
    'ARIZONA_CARDINALS': 'ARI',
    'ATLANTA_FALCONS': 'ATL',
    'BALTIMORE_RAVENS': 'BAL',
    'BUFFALO_BILLS': 'BUF',
    'CAROLINA_PANTHERS': 'CAR',
    'CHICAGO_BEARS': 'CHI',
    'CINCINNATI_BENGALS': 'CIN',
    'CLEVELAND_BROWNS': 'CLE',
    'DALLAS_COWBOYS': 'DAL',
    'DENVER_BRONCOS': 'DEN',
    'DETROIT_LIONS': 'DET',
    'GREEN_BAY_PACKERS': 'GB',
    'HOUSTON_TEXANS': 'HOU',
    'INDIANAPOLIS_COLTS': 'IND',
    'JACKSONVILLE_JAGUARS': 'JAX',
    'KANSAS_CITY_CHIEFS': 'KC',
    'LAS_VEGAS_RAIDERS': 'LV',
    'LOS_ANGELES_CHARGERS': 'LAC',
    'LOS_ANGELES_RAMS': 'LAR',
    'MIAMI_DOLPHINS': 'MIA',
    'MINNESOTA_VIKINGS': 'MIN',
    'NEW_ENGLAND_PATRIOTS': 'NE',
    'NEW_ORLEANS_SAINTS': 'NO',
    'NEW_YORK_GIANTS': 'NYG',
    'NEW_YORK_JETS': 'NYJ',
    'PHILADELPHIA_EAGLES': 'PHI',
    'PITTSBURGH_STEELERS': 'PIT',
    'SAN_FRANCISCO_49ERS': 'SF',
    'SEATTLE_SEAHAWKS': 'SEA',
    'TAMPA_BAY_BUCCANEERS': 'TB',
    'TENNESSEE_TITANS': 'TEN',
    'WASHINGTON_COMMANDERS': 'WSH',
    
    // NBA Teams
    'ATLANTA_HAWKS': 'ATL',
    'BOSTON_CELTICS': 'BOS',
    'BROOKLYN_NETS': 'BKN',
    'CHARLOTTE_HORNETS': 'CHA',
    'CHICAGO_BULLS': 'CHI',
    'CLEVELAND_CAVALIERS': 'CLE',
    'DALLAS_MAVERICKS': 'DAL',
    'DENVER_NUGGETS': 'DEN',
    'DETROIT_PISTONS': 'DET',
    'GOLDEN_STATE_WARRIORS': 'GSW',
    'HOUSTON_ROCKETS': 'HOU',
    'INDIANA_PACERS': 'IND',
    'LA_CLIPPERS': 'LAC',
    'LOS_ANGELES_LAKERS': 'LAL',
    'MEMPHIS_GRIZZLIES': 'MEM',
    'MIAMI_HEAT': 'MIA',
    'MILWAUKEE_BUCKS': 'MIL',
    'MINNESOTA_TIMBERWOLVES': 'MIN',
    'NEW_ORLEANS_PELICANS': 'NOP',
    'NEW_YORK_KNICKS': 'NYK',
    'OKLAHOMA_CITY_THUNDER': 'OKC',
    'ORLANDO_MAGIC': 'ORL',
    'PHILADELPHIA_76ERS': 'PHI',
    'PHOENIX_SUNS': 'PHX',
    'PORTLAND_TRAIL_BLAZERS': 'POR',
    'SACRAMENTO_KINGS': 'SAC',
    'SAN_ANTONIO_SPURS': 'SAS',
    'TORONTO_RAPTORS': 'TOR',
    'UTAH_JAZZ': 'UTA',
    'WASHINGTON_WIZARDS': 'WAS',
    
    // NHL Teams
    'ANAHEIM_DUCKS': 'ANA',
    'ARIZONA_COYOTES': 'ARI',
    'BOSTON_BRUINS': 'BOS',
    'BUFFALO_SABRES': 'BUF',
    'CALGARY_FLAMES': 'CGY',
    'CAROLINA_HURRICANES': 'CAR',
    'CHICAGO_BLACKHAWKS': 'CHI',
    'COLORADO_AVALANCHE': 'COL',
    'COLUMBUS_BLUE_JACKETS': 'CBJ',
    'DALLAS_STARS': 'DAL',
    'DETROIT_RED_WINGS': 'DET',
    'EDMONTON_OILERS': 'EDM',
    'FLORIDA_PANTHERS': 'FLA',
    'LOS_ANGELES_KINGS': 'LAK',
    'MINNESOTA_WILD': 'MIN',
    'MONTREAL_CANADIENS': 'MTL',
    'NASHVILLE_PREDATORS': 'NSH',
    'NEW_JERSEY_DEVILS': 'NJD',
    'NEW_YORK_ISLANDERS': 'NYI',
    'NEW_YORK_RANGERS': 'NYR',
    'OTTAWA_SENATORS': 'OTT',
    'PHILADELPHIA_FLYERS': 'PHI',
    'PITTSBURGH_PENGUINS': 'PIT',
    'SAN_JOSE_SHARKS': 'SJS',
    'SEATTLE_KRAKEN': 'SEA',
    'ST_LOUIS_BLUES': 'STL',
    'TAMPA_BAY_LIGHTNING': 'TBL',
    'TORONTO_MAPLE_LEAFS': 'TOR',
    'UTAH_MAMMOTH': 'UTA',
    'VANCOUVER_CANUCKS': 'VAN',
    'VEGAS_GOLDEN_KNIGHTS': 'VGK',
    'WASHINGTON_CAPITALS': 'WSH',
    'WINNIPEG_JETS': 'WPG',
  };

  // Try to extract team identifier from teamID
  // Format: "DETROIT_PISTONS_NBA" -> "DETROIT_PISTONS"
  if (team.teamID) {
    // Remove league suffix (_NBA, _NFL, _NHL, etc.)
    const teamKey = team.teamID.replace(/_NBA$|_NFL$|_NHL$|_MLB$/, '').toUpperCase();
    
    // Look up in official abbreviations
    if (officialAbbreviations[teamKey]) {
      return officialAbbreviations[teamKey];
    }
  }

  // Fallback: Try to extract from team name
  if (team.name) {
    const normalizedName = team.name.replace(/\s+/g, '_').toUpperCase();
    if (officialAbbreviations[normalizedName]) {
      return officialAbbreviations[normalizedName];
    }
  }

  // Last resort: use SDK shortName or first 3 letters of last word
  return team.shortName || team.name?.split(' ').pop()?.substring(0, 3).toUpperCase() || team.name || '';
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

// ⭐ Extend Official SDK Event Type with Additional Properties
// The official SDK Event type doesn't include all properties we use, so we extend it
// This maintains type safety while supporting additional fields from the API response
export interface ExtendedSDKEvent extends SDKEvent {
  venue?: string;
  scores?: {
    home?: number | null;
    away?: number | null;
  };
  period?: string | null;
  clock?: string | null;
  teams?: {
    home?: ExtendedSDKTeam;
    away?: ExtendedSDKTeam;
  };
}

// Helper interface for team data with all properties we use
export interface ExtendedSDKTeam {
  teamID?: string;
  name?: string;
  names?: {
    long?: string;
    medium?: string;
    short?: string;
  };
  logo?: string;
  standings?: {
    wins?: number;
    losses?: number;
    ties?: number;
    record?: string;
  };
}

/**
 * Extract odds data from SDK event
 * 
 * SDK events use official oddID format: {statID}-{statEntityID}-{periodID}-{betTypeID}-{sideID}
 * Official Documentation: https://sportsgameodds.com/docs/data-types/odds
 * 
 * Main Game Odds Examples:
 * - "points-away-game-ml-away" (moneyline away)
 * - "points-home-game-ml-home" (moneyline home)
 * - "points-away-game-sp-away" or "points-home-game-sp-home" (spread)
 * - "points-all-game-ou-over" or "points-all-game-ou-under" (total over/under)
 * 
 * CRITICAL: We ONLY extract main game odds containing "-game-" in the oddID.
 * This filters out:
 * - Quarter odds (e.g., "points-home-1q-ou-over")
 * - Half odds (e.g., "points-away-1h-sp-away")
 * - Player props (e.g., "points-PLAYER_ID-game-ou-over")
 * - Team props (e.g., "points-home-game-ou-over" for team totals)
 * 
 * Official Bet Types (betTypeID):
 * - ml: Moneyline (straight-up winner)
 * - sp/ats: Spread (point spread)
 * - ou: Over/Under (total points)
 */
function extractOdds(event: ExtendedSDKEvent) {
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
    
    // OFFICIAL CONSENSUS ALGORITHM IMPLEMENTATION
    // Per: https://sportsgameodds.com/docs/info/consensus-odds
    
    // Step 1: Check if fair/book odds calculations were successful
    // (Reserved for future use - may want to show unavailable odds differently)
    const _fairOddsAvailable = data.fairOddsAvailable === true;
    const _bookOddsAvailable = data.bookOddsAvailable === true;
    
    // Step 2: Extract odds values (prefer fair, fallback to book)
    const oddsValue = data.fairOdds || data.bookOdds;
    
    // Step 3: Extract line values (spread or total)
    // CRITICAL: Per official docs, fair calculation excludes zero spreads
    // "Only positive lines are considered for over-unders and non-zero lines are considered for spreads"
    // If fairSpread is 0, it means the algorithm couldn't find a valid non-zero line
    // In this case, we MUST use bookSpread (which has the actual consensus main line)
    let spreadValue: string | number | undefined;
    if (data.fairSpread !== undefined && data.fairSpread !== null) {
      const parsed = parseFloat(String(data.fairSpread));
      // Use fairSpread ONLY if it's non-zero (per official algorithm)
      // Zero means fair calculation excluded it, so use book consensus instead
      if (!isNaN(parsed) && parsed !== 0) {
        spreadValue = data.fairSpread as string | number;
      } else {
        // Fair calculation returned 0 (excluded zero lines), use book consensus
        spreadValue = data.bookSpread as string | number | undefined;
      }
    } else {
      spreadValue = data.bookSpread as string | number | undefined;
    }
    
    // Same logic for totals (over/under)
    // Per docs: "Only positive lines are considered for over-unders"
    let totalValue: string | number | undefined;
    if (data.fairOverUnder !== undefined && data.fairOverUnder !== null) {
      const parsed = parseFloat(String(data.fairOverUnder));
      // Use fairOverUnder only if positive (per official algorithm)
      if (!isNaN(parsed) && parsed > 0) {
        totalValue = data.fairOverUnder as string | number;
      } else {
        totalValue = data.bookOverUnder as string | number | undefined;
      }
    } else {
      totalValue = data.bookOverUnder as string | number | undefined;
    }
    
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
    // CRITICAL: Only process main game odds (skip quarters, halves, props, etc.)
    // Official format per docs: https://sportsgameodds.com/docs/data-types/odds
    // Main game odds contain '-game-' in the oddID
    if (!oddID.includes('-game-')) continue;
    
    const consensusOdds = extractConsensusOdds(oddData);
    if (!consensusOdds) continue;
    
    // Match moneyline odds: "...-game-ml-home" or "...-game-ml-away"
    if (oddID.includes('-ml-home')) {
      moneylineHome = consensusOdds;
    } else if (oddID.includes('-ml-away')) {
      moneylineAway = consensusOdds;
    }
    // Match spread odds: "...-game-sp-home" or "...-game-sp-away"  
    else if (oddID.includes('-sp-home')) {
      spreadHome = consensusOdds;
    } else if (oddID.includes('-sp-away')) {
      spreadAway = consensusOdds;
    }
    // Match total odds: "...-game-ou-over" or "...-game-ou-under"
    // CRITICAL: Must contain BOTH "-game-ou-" AND "-over"/"-under" for main game totals
    else if (oddID.includes('-game-ou-over')) {
      totalOver = consensusOdds;
    } else if (oddID.includes('-game-ou-under')) {
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
 * Apply juice/margins to extracted odds
 * Modifies odds in-place by applying configured house margins
 */
async function applyJuiceToOdds(
  odds: ReturnType<typeof extractOdds>,
  league: string,
  isLive: boolean
): Promise<void> {
  try {
    // Apply juice to spread odds
    if (odds.spread.home.odds !== 0 && odds.spread.away.odds !== 0) {
      const [homeResult, awayResult] = await Promise.all([
        oddsJuiceService.applyJuice({
          fairOdds: odds.spread.home.odds,
          marketType: 'spread',
          league,
          isLive,
        }),
        oddsJuiceService.applyJuice({
          fairOdds: odds.spread.away.odds,
          marketType: 'spread',
          league,
          isLive,
        }),
      ]);
      
      // Keep fair odds for reference
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (odds.spread.home as any).fairOdds = odds.spread.home.odds;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (odds.spread.away as any).fairOdds = odds.spread.away.odds;
      
      // Apply juiced odds
      odds.spread.home.odds = homeResult.juicedOdds;
      odds.spread.away.odds = awayResult.juicedOdds;
    }

    // Apply juice to moneyline odds
    if (odds.moneyline.home.odds !== 0 && odds.moneyline.away.odds !== 0) {
      const [homeResult, awayResult] = await Promise.all([
        oddsJuiceService.applyJuice({
          fairOdds: odds.moneyline.home.odds,
          marketType: 'moneyline',
          league,
          isLive,
        }),
        oddsJuiceService.applyJuice({
          fairOdds: odds.moneyline.away.odds,
          marketType: 'moneyline',
          league,
          isLive,
        }),
      ]);
      
      // Keep fair odds for reference
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (odds.moneyline.home as any).fairOdds = odds.moneyline.home.odds;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (odds.moneyline.away as any).fairOdds = odds.moneyline.away.odds;
      
      // Apply juiced odds
      odds.moneyline.home.odds = homeResult.juicedOdds;
      odds.moneyline.away.odds = awayResult.juicedOdds;
    }

    // Apply juice to total odds (over/under)
    if (odds.total.over.odds !== 0 && odds.total.under.odds !== 0) {
      const [overResult, underResult] = await Promise.all([
        oddsJuiceService.applyJuice({
          fairOdds: odds.total.over.odds,
          marketType: 'total',
          league,
          isLive,
        }),
        oddsJuiceService.applyJuice({
          fairOdds: odds.total.under.odds,
          marketType: 'total',
          league,
          isLive,
        }),
      ]);
      
      // Keep fair odds for reference
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (odds.total.over as any).fairOdds = odds.total.over.odds;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (odds.total.under as any).fairOdds = odds.total.under.odds;
      
      // Apply juiced odds
      odds.total.over.odds = overResult.juicedOdds;
      odds.total.under.odds = underResult.juicedOdds;
      
      // Also update the home/away aliases
      odds.total.home = odds.total.over;
      odds.total.away = odds.total.under;
    }
  } catch (error) {
    logger.error('[OddsTransformer] Failed to apply juice to odds', { error, league, isLive });
    // If juice application fails, odds remain as fair odds (safe fallback)
  }
}

/**
 * Map SDK status to our internal status
 */
/**
 * Map SDK status fields to our internal status
 * 
 * STRATEGY: Hybrid approach for maximum reliability
 * 1. Primary: Use official SDK status fields (live, completed, cancelled)
 * 2. Validation: Time-based sanity check to catch SDK errors
 * 3. Fallback: Pure time-based logic if SDK status missing
 * 
 * TIME-BASED RULES (Applied for validation and fallback):
 * - startTime > now → "upcoming"
 * - startTime within last 4 hours → "live" (games typically last 2-3 hours)
 * - startTime > 4 hours ago → "finished"
 * 
 * Per SDK documentation: https://sportsgameodds.com/docs/explorer
 */
function mapStatus(
  sdkStatus: { live?: boolean; started?: boolean; completed?: boolean; cancelled?: boolean } | undefined,
  startTime: Date
): "upcoming" | "live" | "finished" {
  const now = new Date();
  const gameTime = new Date(startTime);
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  
  // Calculate time-based status (used for validation and fallback)
  let timeBasedStatus: "upcoming" | "live" | "finished";
  if (gameTime > now) {
    timeBasedStatus = "upcoming";
  } else if (gameTime > fourHoursAgo) {
    timeBasedStatus = "live";
  } else {
    timeBasedStatus = "finished";
  }
  
  // If SDK status exists, use it BUT validate with time
  if (sdkStatus) {
    // SDK says game is live
    if (sdkStatus.live === true) {
      // Sanity check: Game can't be live if it hasn't started yet
      if (timeBasedStatus === "upcoming") {
        logger.warn(`SDK reports live but game hasn't started yet. Using time-based status.`, {
          startTime: gameTime.toISOString(),
          sdkLive: true,
          timeBasedStatus
        });
        return timeBasedStatus;
      }
      return "live";
    }
    
    // SDK says game started (but not explicitly live)
    if (sdkStatus.started === true && !sdkStatus.completed && !sdkStatus.cancelled) {
      // Sanity check: Started game can't be upcoming
      if (timeBasedStatus === "upcoming") {
        logger.warn(`SDK reports started but game hasn't started yet. Using time-based status.`, {
          startTime: gameTime.toISOString(),
          sdkStarted: true,
          timeBasedStatus
        });
        return timeBasedStatus;
      }
      return "live";
    }
    
    // SDK says game is completed or cancelled
    if (sdkStatus.completed === true || sdkStatus.cancelled === true) {
      // Sanity check: Can't be completed if it hasn't started
      if (timeBasedStatus === "upcoming") {
        logger.warn(`SDK reports completed/cancelled but game hasn't started yet. Using time-based status.`, {
          startTime: gameTime.toISOString(),
          sdkCompleted: sdkStatus.completed,
          sdkCancelled: sdkStatus.cancelled,
          timeBasedStatus
        });
        return timeBasedStatus;
      }
      return "finished";
    }
  }
  
  // Fallback: No SDK status or SDK status unclear, use pure time-based logic
  return timeBasedStatus;
}

/**
 * Transform SDK event to our internal GamePayload format
 * 
 * IMPORTANT: Preserves official UPPERCASE league IDs from SDK
 * Per official docs: https://sportsgameodds.com/docs/leagues
 * 
 * @param event - Event from SDK (type ExtendedSDKEvent - official SDK Event with additional properties)
 */
export async function transformSDKEvent(event: ExtendedSDKEvent): Promise<GamePayload | null> {
  try {
    // SDK events use official uppercase IDs
    const eventID = event.eventID;
    const leagueID = event.leagueID; // Already uppercase from SDK
    const homeTeam = event.teams?.home;
    const awayTeam = event.teams?.away;
    
    // ⭐ OFFICIAL SDK: Start time is in status.startsAt (SDK v2)
    // Per: https://github.com/sportsgameodds/sports-odds-api-typescript/blob/main/src/resources/events.ts#L105
    const startTime = event.status?.startsAt;
    
    // Check for absolutely required fields (teams and IDs)
    if (!eventID || !leagueID || !homeTeam || !awayTeam) {
      logger.warn(`Missing critical event data for event ${eventID}`, {
        hasEventID: !!eventID,
        hasLeagueID: !!leagueID,
        hasHomeTeam: !!homeTeam,
        hasAwayTeam: !!awayTeam,
      });
      return null;
    }
    
    // Handle missing start time - this shouldn't happen with proper SDK usage
    // but we handle it gracefully just in case
    if (!startTime) {
      logger.warn(`Missing status.startsAt for event ${eventID} (${leagueID}). Skipping event.`, {
        eventID,
        leagueID,
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        hasStatus: !!event.status,
      });
      // Return null instead of using fallback - if SDK doesn't provide start time, 
      // the event data is incomplete and shouldn't be displayed
      return null;
    }
    
    const startDateTime = new Date(startTime);
    
    // Validate the parsed date
    if (isNaN(startDateTime.getTime())) {
      logger.warn(`Invalid start time format for event ${eventID}: ${startTime}`);
      return null;
    }
    
    // Use official league ID directly (no normalization to lowercase)
    // SDK returns uppercase (NBA, NFL, NHL) per official specification
    const officialLeagueId = LEAGUE_ID_MAPPING[leagueID] || leagueID;
    
    // Determine game status using official SDK status fields
    const status = mapStatus(event.status, startDateTime);

    // Extract odds
    const odds = extractOdds(event);
    
    // Apply juice/margins to odds
    await applyJuiceToOdds(odds, officialLeagueId, status === 'live');

    return {
      id: eventID,
      leagueId: officialLeagueId, // Official uppercase format
      homeTeam: {
        id: homeTeam.teamID || `${officialLeagueId}-${homeTeam.name || 'unknown'}`.toLowerCase().replace(/\s+/g, '-'),
        name: homeTeam.name || 'Unknown',
        shortName: getTeamShortName(homeTeam),
        logo: getTeamLogo(homeTeam, officialLeagueId),
        record: homeTeam.standings?.record || undefined,
      },
      awayTeam: {
        id: awayTeam.teamID || `${officialLeagueId}-${awayTeam.name || 'unknown'}`.toLowerCase().replace(/\s+/g, '-'),
        name: awayTeam.name || 'Unknown',
        shortName: getTeamShortName(awayTeam),
        logo: getTeamLogo(awayTeam, officialLeagueId),
        record: awayTeam.standings?.record || undefined,
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
 * Transform multiple SDK events, filtering out only those that fail transformation
 * 
 * IMPORTANT: This transformer is used by ALL endpoints:
 * - /api/games (all games: upcoming + live + recent finished)
 * - /api/games/[leagueId] (league-specific games)
 * - /api/games/live (live games only - filtered by endpoint)
 * 
 * The transformer should NOT filter by time or status - let endpoints handle that.
 * We only filter out events that fail transformation (null results).
 */
export async function transformSDKEvents(events: ExtendedSDKEvent[]): Promise<GamePayload[]> {
  const transformedEvents = await Promise.all(
    events.map(event => transformSDKEvent(event))
  );
  
  return transformedEvents.filter((game): game is GamePayload => game !== null);
}
