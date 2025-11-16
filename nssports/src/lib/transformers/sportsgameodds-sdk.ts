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
 * Extended Status type with live game properties
 * The SDK's Status type doesn't include clock and currentPeriodID in its types,
 * but these properties are present in the actual API responses.
 */
interface ExtendedStatus {
  live?: boolean;
  started?: boolean;
  completed?: boolean;
  finalized?: boolean;
  ended?: boolean;
  cancelled?: boolean;
  clock?: string;
  currentPeriodID?: string;
}

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
  names?: {
    long?: string;
    medium?: string;
    short?: string;
  };
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

  // Fallback: Try to extract from team names
  if (team.names?.long) {
    const normalizedName = team.names.long.replace(/\s+/g, '_').toUpperCase();
    if (officialAbbreviations[normalizedName]) {
      return officialAbbreviations[normalizedName];
    }
  }

  // Last resort: use SDK short name or first 3 letters of last word
  return team.names?.short || team.names?.medium?.split(' ').pop()?.substring(0, 3).toUpperCase() || '';
}

/**
 * Get team logo URL - SDK doesn't provide logos, so we use local assets
 * Uses the actual SDK team ID directly (e.g., SACRAMENTO_KINGS_NBA.svg)
 */
function getTeamLogo(team: SDKTeam, leagueId: string): string {
  if (!team.teamID) return '';

  // Map league IDs to logo paths
  const leagueLogoPaths: Record<string, string> = {
    'NBA': '/logos/nba',
    'NFL': '/logos/nfl',
    'NHL': '/logos/nhl',
  };

  const logoPath = leagueLogoPaths[leagueId];
  if (!logoPath) return '';

  // Normalize team ID to handle accented characters (e.g., MONTRÉAL → MONTREAL)
  let normalizedTeamID = team.teamID
    .normalize('NFD') // Decompose accented characters
    .replace(/[ -6f]/g, ''); // Remove diacritics

  // Special case: LA Clippers logo asset uses LOS_ANGELES_CLIPPERS_NBA.svg
  if (
    leagueId === 'NBA' &&
    (normalizedTeamID === 'LA_CLIPPERS_NBA' || normalizedTeamID === 'LA_CLIPPERS')
  ) {
    normalizedTeamID = 'LOS_ANGELES_CLIPPERS_NBA';
  }

  // Use the normalized SDK team ID (e.g., MONTREAL_CANADIENS_NHL.svg)
  return `${logoPath}/${normalizedTeamID}.svg`;
}

// ⭐ Extend Official SDK Event Type with Additional Properties
// The official SDK Event type doesn't include all properties we use, so we extend it
// This maintains type safety while supporting additional fields from the API response
// Note: We omit 'results' to provide a more accurate type definition for our use case
export interface ExtendedSDKEvent extends Omit<SDKEvent, 'results'> {
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
  // ⭐ Results from finished games (player stats, period scores)
  // SDK Structure: results[periodID or 'game'][entityID] = { statID: value, ... }
  // 
  // Period scores: results['1q'] = { home: { points: 31 }, away: { points: 28 } }
  // Player stats: results['game']['PLAYER_ID'] = { points: 28, rebounds: 8, ... }
  // Team stats: results['game']['home'] = { points: 117, rebounds: 42, ... }
  //
  // This is a complex nested structure - using flexible typing
  results?: {
    [periodOrGame: string]: {
      [entityID: string]: {
        [statID: string]: number;
      };
    };
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
  // Uses bookOdds (real market consensus) for all games
  // fairOdds = symmetric "no-vig" true probability odds (-563/+563)
  // bookOdds = asymmetric real market consensus odds (-900/+525)
  // https://sportsgameodds.com/docs/info/consensus-odds
  function extractConsensusOdds(oddData: unknown) {
    if (!oddData || typeof oddData !== 'object') return null;
    
    const data = oddData as Record<string, unknown>;
    
    // PROFESSIONAL-GRADE SOLUTION: STRICT bookOdds enforcement
    // Real sportsbooks ALWAYS have asymmetric odds - this is fundamental to how betting works
    // If bookOdds is missing, it means:
    // 1. API didn't include consensus calculations (includeConsensus: true not set)
    // 2. Not enough reputable bookmakers have odds for this market yet
    // 3. Market is temporarily unavailable
    //
    // We NEVER use fairOdds as it's mathematically derived, not real market data
    // Better to show "Odds Unavailable" than incorrect symmetric odds
    
    // Extract bookOdds ONLY (real market consensus - asymmetric)
    const oddsValue = data.bookOdds;
    const spreadValue = data.bookSpread;
    const totalValue = data.bookOverUnder;
    const lineValue = spreadValue ?? totalValue;
    
    // If no bookOdds, return null (market unavailable)
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
    // INDUSTRY STANDARD: Apply juice to BOOK ODDS (real market consensus), not fair odds
    // Apply juice to spread odds
    if (odds.spread.home.odds !== 0 && odds.spread.away.odds !== 0) {
      const [homeResult, awayResult] = await Promise.all([
        oddsJuiceService.applyJuice({
          bookOdds: odds.spread.home.odds, // Use bookOdds (real market)
          marketType: 'spread',
          league,
          isLive,
        }),
        oddsJuiceService.applyJuice({
          bookOdds: odds.spread.away.odds, // Use bookOdds (real market)
          marketType: 'spread',
          league,
          isLive,
        }),
      ]);
      
      // Keep market odds for reference
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (odds.spread.home as any).marketOdds = odds.spread.home.odds;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (odds.spread.away as any).marketOdds = odds.spread.away.odds;
      
      // Apply adjusted odds
      odds.spread.home.odds = homeResult.adjustedOdds;
      odds.spread.away.odds = awayResult.adjustedOdds;
    }

    // Apply juice to moneyline odds
    if (odds.moneyline.home.odds !== 0 && odds.moneyline.away.odds !== 0) {
      const [homeResult, awayResult] = await Promise.all([
        oddsJuiceService.applyJuice({
          bookOdds: odds.moneyline.home.odds, // Use bookOdds (real market)
          marketType: 'moneyline',
          league,
          isLive,
        }),
        oddsJuiceService.applyJuice({
          bookOdds: odds.moneyline.away.odds, // Use bookOdds (real market)
          marketType: 'moneyline',
          league,
          isLive,
        }),
      ]);
      
      // Keep market odds for reference
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (odds.moneyline.home as any).marketOdds = odds.moneyline.home.odds;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (odds.moneyline.away as any).marketOdds = odds.moneyline.away.odds;
      
      // Apply adjusted odds
      odds.moneyline.home.odds = homeResult.adjustedOdds;
      odds.moneyline.away.odds = awayResult.adjustedOdds;
    }

    // Apply juice to total odds (over/under)
    if (odds.total.over.odds !== 0 && odds.total.under.odds !== 0) {
      const [overResult, underResult] = await Promise.all([
        oddsJuiceService.applyJuice({
          bookOdds: odds.total.over.odds, // Use bookOdds (real market)
          marketType: 'total',
          league,
          isLive,
        }),
        oddsJuiceService.applyJuice({
          bookOdds: odds.total.under.odds, // Use bookOdds (real market)
          marketType: 'total',
          league,
          isLive,
        }),
      ]);
      
      // Keep market odds for reference
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (odds.total.over as any).marketOdds = odds.total.over.odds;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (odds.total.under as any).marketOdds = odds.total.under.odds;
      
      // Apply adjusted odds
      odds.total.over.odds = overResult.adjustedOdds;
      odds.total.under.odds = underResult.adjustedOdds;
      
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
  sdkStatus: { 
    live?: boolean; 
    started?: boolean; 
    completed?: boolean;
    finalized?: boolean;
    ended?: boolean;
    cancelled?: boolean;
    clock?: string;
    currentPeriodID?: string;
  } | undefined,
  startTime: Date
): "upcoming" | "live" | "finished" {
  const now = new Date();
  const gameTime = new Date(startTime);
  
  // If SDK status exists, use it - it's the source of truth
  if (sdkStatus) {
    // ⭐ PRIORITY 1: SDK says game is live - TRUST IT
    // The SDK's live flag is authoritative and updated in real-time
    if (sdkStatus.live === true) {
      return "live";
    }
    
    // ⭐ PRIORITY 2: SDK says game is completed/cancelled
    if (sdkStatus.completed === true || sdkStatus.finalized === true || sdkStatus.ended === true || sdkStatus.cancelled === true) {
      return "finished";
    }
    
    // ⭐ PRIORITY 3: SDK says game started but not live and not completed
    // This is an edge case - game has started but may be in intermission/delay
    if (sdkStatus.started === true) {
      // Check if game is very old (>12 hours) - likely a data issue
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      if (gameTime < twelveHoursAgo) {
        return "finished"; // Assume finished if very old
      }
      return "live"; // Treat as live (might be in delay/intermission)
    }
  }
  
  // ⭐ FALLBACK: No SDK status available - use time-based logic
  // Only used when SDK data is completely missing
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  if (gameTime > now) {
    return "upcoming";
  } else if (gameTime > fourHoursAgo) {
    return "live";
  } else {
    return "finished";
  }
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
        homeTeam: homeTeam.names?.long || homeTeam.names?.medium || 'Unknown',
        awayTeam: awayTeam.names?.long || awayTeam.names?.medium || 'Unknown',
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

  // Helper: tolerant fallback to parse human-readable status/display strings
    function parseClockAndPeriodFromStatus(statusObj?: unknown) {
      if (!statusObj) return { period: undefined as string | undefined, clock: undefined as string | undefined };
      const s = statusObj as Record<string, unknown>;
      const display = (s.display as string) || (s.displayLong as string) || (s.displayShort as string) || (s.status as string) || (s.label as string);

      // 1) Try the canonical clock field first
      const clockField = (s.clock as string | undefined);
      if (clockField) return { period: (s.currentPeriodID as string | undefined) || undefined, clock: clockField };

      // 2) If no clock field, try to parse from a display string like "Q3 12:34", "4th 05:12", "12:34 4th"
      if (typeof display === 'string') {
        // Extract time pattern mm:ss or m:ss
        const timeMatch = display.match(/(\d{1,2}:\d{2})/);
        const parsedClock = timeMatch ? timeMatch[1] : undefined;

        // Extract period tokens: 1st, 2nd, 3rd, 4th, OT, Q1/Q2/Q3/Q4, 1Q etc.
        const periodMatch = display.match(/\b(1st|2nd|3rd|4th|OT|OT1|Q[1-4]|[1-4]Q|1H|2H)\b/i);
        let parsedPeriod: string | undefined = undefined;
        if (periodMatch) {
          const tok = String(periodMatch[1]).toUpperCase();
          if (/^Q[1-4]$/.test(tok) || /^[1-4]Q$/.test(tok)) {
            parsedPeriod = tok.replace(/[^0-9]/g, '');
          } else if (/^[1-4](ST|ND|RD|TH)$/.test(tok)) {
            parsedPeriod = tok.replace(/[^0-9]/g, '');
          } else if (tok === 'OT' || tok.startsWith('OT')) {
            parsedPeriod = 'OT';
          } else if (tok === '1H') {
            parsedPeriod = '1H';
          } else if (tok === '2H') {
            parsedPeriod = '2H';
          }
        }

        if (parsedClock || parsedPeriod) {
          logger.debug('[transformSDKEvent] Parsed fallback clock/period from display', { eventId: event.eventID, display, parsedClock, parsedPeriod });
          return { period: parsedPeriod, clock: parsedClock };
        }
      }

      return { period: (s.currentPeriodID as string | undefined) || undefined, clock: undefined };
    }

    const fallback = parseClockAndPeriodFromStatus(event.status);

    // Normalize period token into a human-friendly label
    function normalizePeriodToken(raw?: string | null, displayFromStatus?: string | null, _league?: string) {
      if (displayFromStatus && typeof displayFromStatus === 'string' && displayFromStatus.trim().length > 0) {
        return displayFromStatus;
      }
      if (!raw) return undefined;
      const token = String(raw).toLowerCase();

      // Quarter tokens: q or q1..q4 or 1q
      const qMatch = token.match(/(?:q)?([1-4])q?|q([1-4])|([1-4])q/);
      if (/^q?[1-4]$/.test(token) || qMatch) {
        const num = (qMatch && (qMatch[1] || qMatch[2] || qMatch[3])) || token.replace(/[^0-9]/g, '');
        return `${num}th Quarter`.replace('1th', '1st').replace('2th', '2nd').replace('3th', '3rd');
      }

      // Half tokens: 1h,2h
      if (/^[12]h$/.test(token)) {
        return token.startsWith('1') ? '1st Half' : '2nd Half';
      }

      // Period tokens (hockey): 1p,2p,3p
      if (/^[1-4]p$/.test(token)) {
        const n = token.replace(/[^0-9]/g, '');
        return `${n}th Period`.replace('1th', '1st').replace('2th', '2nd').replace('3th', '3rd');
      }

      // Inning tokens like 1i,2i
      if (/^[0-9]+i$/.test(token)) {
        const n = token.replace(/[^0-9]/g, '');
        return `${n}th Inning`.replace('1th', '1st');
      }

      // Overtime
      if (/^ot/i.test(token) || token === 'ot') return 'Overtime';

      // Generic mappings
      if (token === 'game' || token === 'reg') return 'Game';
      return displayFromStatus || raw;
    }

  const statusRecord = event.status as Record<string, unknown> | undefined;
  const displayFromStatus = statusRecord ? (String(statusRecord.displayLong ?? statusRecord.display ?? '') || undefined) : undefined;
  const periodToken = (event.status as ExtendedStatus)?.currentPeriodID ?? event.period ?? undefined;
  const periodDisplay = normalizePeriodToken(periodToken, displayFromStatus, officialLeagueId);

    return {
      id: eventID,
      leagueId: officialLeagueId, // Official uppercase format
      homeTeam: {
        id: homeTeam.teamID || `${officialLeagueId}-${homeTeam.names?.long || 'unknown'}`.toLowerCase().replace(/\s+/g, '-'),
        name: homeTeam.names?.long || homeTeam.names?.medium || 'Unknown',
        shortName: getTeamShortName(homeTeam),
        logo: getTeamLogo(homeTeam, officialLeagueId),
        record: homeTeam.standings?.record || undefined,
      },
      awayTeam: {
        id: awayTeam.teamID || `${officialLeagueId}-${awayTeam.names?.long || 'unknown'}`.toLowerCase().replace(/\s+/g, '-'),
        name: awayTeam.names?.long || awayTeam.names?.medium || 'Unknown',
        shortName: getTeamShortName(awayTeam),
        logo: getTeamLogo(awayTeam, officialLeagueId),
        record: awayTeam.standings?.record || undefined,
      },
      startTime: startDateTime,
      status,
      odds,
      venue: event.venue || undefined,
      homeScore: event.results?.game?.home?.points ?? undefined,
      awayScore: event.results?.game?.away?.points ?? undefined,
      period: (event.status as ExtendedStatus)?.currentPeriodID || fallback.period || undefined,
      timeRemaining: (event.status as ExtendedStatus)?.clock || fallback.clock || undefined,
      periodDisplay: periodDisplay ?? undefined,
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
