/**
 * SportsGameOdds SDK Integration - ODDS-FOCUSED with Official oddIDs
 * 
 * Official SDK-based implementation for REAL-TIME ODDS & BETTING LINES ONLY:
 * - ✅ Moneyline, Spread, Total (Over/Under) odds
 * - ✅ Player props odds (points, rebounds, assists, etc.)
 * - ✅ Game props odds (team totals, quarters, etc.)
 * - ❌ NO live scores/stats (we don't display game state)
 * - ❌ NO activity/period/clock data (odds-only focus)
 * 
 * ⭐ REPUTABLE BOOKMAKERS FILTER (APPLIED GLOBALLY)
 * All consensus odds calculations use ONLY top-tier sportsbooks:
 * - 6 Major US Regulated (FanDuel, DraftKings, BetMGM, Caesars, ESPN Bet, Fanatics)
 * - 2 Sharp Books (Pinnacle, Circa)
 * - 1 Major International (bet365)
 * - 1 Regional US (BetRivers)
 * - 2 Major Offshore (Bovada, BetOnline)
 * 
 * Benefits:
 * ✅ Removes outliers from unreliable bookmakers
 * ✅ More accurate fair odds consensus
 * ✅ Faster API responses (less data to process)
 * ✅ Better representation of actual market odds
 * 
 * ⭐ OFFICIAL OPTIMIZATION: oddIDs Parameter (50-90% payload reduction)
 * Per official docs: https://sportsgameodds.com/docs/guides/response-speed
 * 
 * Official oddID Format: {statID}-{statEntityID}-{periodID}-{betTypeID}-{sideID}
 * Examples:
 * - Moneyline: points-home-game-ml-home, points-away-game-ml-away
 * - Spread: points-home-game-sp-home, points-away-game-sp-away
 * - Total: points-all-game-ou-over, points-all-game-ou-under
 * - Player Props: points-PLAYER_ID-game-ou-over (PLAYER_ID wildcard)
 * 
 * Key Official SDK Patterns:
 * 1. oddIDs: Comma-separated list of specific markets to fetch
 * 2. includeOpposingOddIDs: true → Auto-fetch both sides (home/away, over/under)
 * 3. bookmakerID: Filter to specific sportsbooks (defaults to REPUTABLE_BOOKMAKERS)
 * 4. PLAYER_ID wildcard: Fetch props for ALL players at once
 * 5. Response size: Reduces payload by 50-90% vs fetching all markets
 * 
 * Documentation:
 * - SDK: https://sportsgameodds.com/docs/sdk
 * - Odds Filtering: https://sportsgameodds.com/docs/guides/response-speed
 * - Bookmakers: https://sportsgameodds.com/docs/data-types/bookmakers
 * - Consensus Odds: https://sportsgameodds.com/docs/info/consensus-odds
 * - Markets: https://sportsgameodds.com/docs/data-types/markets
 * 
 * Supported Leagues (UPPERCASE per official spec):
 * - NBA, NFL, NHL (primary focus)
 * - MLB, NCAAB, NCAAF (additional)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ⭐ OFFICIAL SDK IMPORTS - Type-safe integration
// Per: https://github.com/sportsgameodds/sports-odds-api-typescript
// Note: SDK types are accessed via SportsGameOdds namespace
import SportsGameOdds from 'sports-odds-api';
import { logger } from "./logger";
import { rateLimiter } from "./rate-limiter";

// Re-export official SDK types for use in other files
// SDK provides types through the main namespace
export type SDKEvent = SportsGameOdds.Event;
export type SDKEventGetParams = SportsGameOdds.EventGetParams;

// ========================================
// OFFICIAL oddID CONSTANTS
// Per: https://sportsgameodds.com/docs/data-types/markets
// Format: {statID}-{statEntityID}-{periodID}-{betTypeID}-{sideID}
// ========================================

/**
 * Reputable bookmakers for consensus odds calculation
 * 
 * Carefully curated list of top-tier sportsbooks to ensure accurate fair odds
 * without noise from less reputable operators or outliers.
 * 
 * Selection Criteria:
 * - Market leaders with highest volume (FanDuel, DraftKings, BetMGM, etc.)
 * - Sharp books accepted by professionals (Pinnacle, Circa)
 * - Established brands with proven track record
 * - Regulated operators (US state-licensed or major international)
 * 
 * Benefits:
 * ✅ Removes outliers from low-volume/unreliable books
 * ✅ More accurate consensus calculations
 * ✅ Faster API responses (less data to process)
 * ✅ Better representation of actual market odds
 * 
 * Coverage:
 * - 6 Major US Regulated: ~90% US market share
 * - 2 Sharp Books: Professional-grade fair odds
 * - 1 Major International: Global market validation
 * - 1 Regional US: Additional coverage
 * - 2 Major Offshore: Alternative market validation
 */
export const REPUTABLE_BOOKMAKERS = [
  // US Market Leaders (90% market share)
  'fanduel',      // #1 US operator (~40% market share)
  'draftkings',   // #2 US operator (~30% market share)
  'betmgm',       // #3 US operator, MGM backing
  'caesars',      // Major casino brand, nationwide
  'espnbet',      // ESPN/Penn Entertainment
  'fanatics',     // New major player, growing fast
  
  // Sharp/Professional Books
  'pinnacle',     // Industry standard for sharp odds
  'circa',        // Vegas-based, high limits
  
  // International/Regional
  'bet365',       // Largest global operator
  'betrivers',    // Rush Street Gaming, multi-state
  
  // Major Offshore (US-friendly)
  'bovada',       // Longest-running US offshore
  'betonline',    // Major offshore operator
].join(',');

/**
 * Main betting lines (game-level)
 * Used for: Homepage, game lists, main betting interface
 * 
 * Official Format Examples:
 * - points-home-game-ml-home → Home team moneyline
 * - points-away-game-sp-away → Away team spread
 * - points-all-game-ou-over → Total points over
 * 
 * With includeOpposingOddIDs: true, only need to specify ONE side:
 * - Requesting "home" side automatically includes "away" side
 * - Requesting "over" side automatically includes "under" side
 */
export const MAIN_LINE_ODDIDS = [
  // Moneyline (ML) - Winner of the game
  'points-home-game-ml-home',     // Home team to win (auto-includes away)
  
  // Spread (SP/ATS) - Point spread betting
  'points-home-game-sp-home',     // Home team spread (auto-includes away)
  
  // Total (OU) - Over/Under total points
  'points-all-game-ou-over',      // Total points over (auto-includes under)
].join(',');

/**
 * Player props (individual player performance)
 * Used for: Player props page, detailed betting
 * 
 * Official PLAYER_ID Wildcard:
 * - "points-PLAYER_ID-game-ou-over" fetches props for ALL players
 * - SDK automatically expands wildcard to all available players
 * - Significantly more efficient than individual player requests
 * 
 * Common prop types:
 * - points: Player points scored
 * - rebounds: Player rebounds
 * - assists: Player assists
 * - threes: Three-pointers made
 * - pts-rebs-asts: Combo props
 */
export const PLAYER_PROP_ODDIDS = [
  'points-PLAYER_ID-game-ou-over',           // Points (auto-includes under)
  'rebounds-PLAYER_ID-game-ou-over',         // Rebounds
  'assists-PLAYER_ID-game-ou-over',          // Assists
  'threes-PLAYER_ID-game-ou-over',           // Three-pointers
  'pts-rebs-asts-PLAYER_ID-game-ou-over',   // Combo prop
].join(',');

/**
 * Game props (team/quarter-specific betting)
 * Used for: Advanced betting, quarter/half markets
 * 
 * Examples:
 * - Team totals: Individual team point totals
 * - Quarter/Half: Specific period betting
 * - First half spread, second half total, etc.
 */
export const GAME_PROP_ODDIDS = [
  // Team totals
  'points-home-game-ou-over',      // Home team total points
  'points-away-game-ou-over',      // Away team total points
  
  // First half betting
  'points-home-1h-ml-home',        // First half moneyline
  'points-home-1h-sp-home',        // First half spread
  'points-all-1h-ou-over',         // First half total
  
  // First quarter betting (NBA/NHL specific)
  'points-home-1q-ml-home',        // Q1 moneyline
  'points-all-1q-ou-over',         // Q1 total
].join(',');

/**
 * Soccer-specific betting lines (3-way moneyline with draw)
 * Used for: Soccer matches where draws are possible
 * 
 * Per https://sportsgameodds.com/docs/data-types/markets/soccer
 * 
 * Soccer uses 3-way moneyline (ml3way) with draw option:
 * - points-home-game-ml3way-home → Home win
 * - points-home-game-ml3way-draw → Draw
 * - points-home-game-ml3way-away → Away win
 * 
 * Also includes standard spread and totals
 */
export const SOCCER_MAIN_LINE_ODDIDS = [
  // 3-Way Moneyline (ML3WAY) - Home/Draw/Away
  'points-home-game-ml3way-home',     // Home team to win (includes draw and away with includeOpposingOddIDs)
  
  // Spread (SP) - Goal spread betting (Asian Handicap)
  'points-home-game-sp-home',         // Home team spread (auto-includes away)
  
  // Total Goals (OU) - Over/Under total goals
  'points-all-game-ou-over',          // Total goals over (auto-includes under)
  
  // Both Teams to Score (BTTS)
  'bothTeamsToScore-all-game-yn-yes', // Both teams to score yes/no
].join(',');

/**
 * MMA/Boxing-specific betting lines
 * Used for: Fight sports with method of victory and round betting
 * 
 * Per https://sportsgameodds.com/docs/data-types/markets/mma
 * 
 * MMA/Boxing specific markets:
 * - Moneyline (fighter to win)
 * - Method of victory (KO/TKO, submission, decision)
 * - Total rounds over/under
 * - Fight goes the distance (yes/no)
 */
export const COMBAT_SPORTS_MAIN_LINE_ODDIDS = [
  // Moneyline (ML) - Fighter to win
  'points-home-game-ml-home',          // Fighter 1 to win (auto-includes fighter 2)
  
  // Method of Victory
  'methodOfVictory-home-game-prop-ko', // KO/TKO
  'methodOfVictory-home-game-prop-sub', // Submission (MMA only)
  'methodOfVictory-home-game-prop-dec', // Decision
  
  // Total Rounds
  'totalRounds-all-game-ou-over',      // Total rounds over (auto-includes under)
  
  // Fight Goes Distance
  'fightGoesDistance-all-game-yn-yes', // Yes/No prop
].join(',');

/**
 * Golf-specific betting lines
 * Used for: Tournament winner, top finishes, matchups
 * 
 * Per https://sportsgameodds.com/docs/data-types/leagues
 * 
 * Golf markets are primarily outright/futures:
 * - Tournament winner
 * - Top 5/10/20 finish
 * - Make the cut
 * - Head-to-head matchups
 * - 3-ball matchups
 */
export const GOLF_MAIN_LINE_ODDIDS = [
  // Tournament Winner (outright)
  'tournamentWinner-PLAYER_ID-game-prop-side1', // Player to win tournament
  
  // Top Finish Props
  'top5-PLAYER_ID-game-yn-yes',        // Top 5 finish yes/no
  'top10-PLAYER_ID-game-yn-yes',       // Top 10 finish yes/no
  'top20-PLAYER_ID-game-yn-yes',       // Top 20 finish yes/no
  'makeCut-PLAYER_ID-game-yn-yes',     // Make the cut yes/no
  
  // Matchups
  'headToHead-PLAYER_ID-game-prop-side1', // Head-to-head matchup
  'threeBall-PLAYER_ID-game-prop-side1',  // 3-ball matchup
].join(',');

/**
 * Horse Racing-specific betting lines
 * Used for: Win/Place/Show and exotic bets
 * 
 * Horse racing markets include:
 * - Win (1st place)
 * - Place (1st or 2nd)
 * - Show (1st, 2nd, or 3rd)
 * - Exacta (1st and 2nd in order)
 * - Trifecta (1st, 2nd, and 3rd in order)
 * - Superfecta (1st, 2nd, 3rd, and 4th in order)
 */
export const HORSE_RACING_MAIN_LINE_ODDIDS = [
  // Win/Place/Show
  'win-HORSE_ID-game-prop-side1',      // Horse to win
  'place-HORSE_ID-game-prop-side1',    // Horse to place (1st or 2nd)
  'show-HORSE_ID-game-prop-side1',     // Horse to show (1st, 2nd, or 3rd)
  
  // Exotic bets (typically combined selections)
  'exacta-all-game-prop-side1',        // Exacta betting
  'trifecta-all-game-prop-side1',      // Trifecta betting
  'superfecta-all-game-prop-side1',    // Superfecta betting
].join(',');

/**
 * Get configured SDK client instance
 * Server-side only - API key is never exposed to client
 * 
 * Official SDK Configuration:
 * https://sportsgameodds.com/docs/sdk
 */
export function getSportsGameOddsClient() {
  const apiKey = process.env.SPORTSGAMEODDS_API_KEY;
  
  if (!apiKey) {
    throw new Error('SPORTSGAMEODDS_API_KEY is not configured');
  }

  return new SportsGameOdds({
    apiKeyHeader: apiKey,
    timeout: 20 * 1000, // 20 seconds
    maxRetries: 3,
  });
}

/**
 * Fetch leagues with automatic pagination
 */
export async function getLeagues(options: {
  sport?: string;
  active?: boolean;
} = {}) {
  const client = getSportsGameOddsClient();
  
  try {
    logger.info('Fetching leagues from SportsGameOdds SDK');
    
    const page: any = await client.leagues.get(options as any);
    const leagues = page.data || [];
    
    logger.info(`Fetched ${leagues.length} leagues`);
    return leagues;
  } catch (error) {
    logger.error('Error fetching leagues', error);
    throw error;
  }
}

// ========================================
// RESPONSE SIZE OPTIMIZATION
// ========================================
/**
 * ⭐ OFFICIAL METHOD: Use oddIDs parameter to reduce response size
 * 
 * Per official docs (https://sportsgameodds.com/docs/guides/response-speed):
 * "The most common cause of high response times is fetching a large number of 
 * odds at once. To reduce this, use the oddIDs parameter to fetch only the 
 * odds you need. This can reduce response payload by 50-90%."
 * 
 * HOW IT WORKS:
 * - oddIDs parameter filters which BETTING MARKETS are included
 * - Significantly reduces the size of the odds object
 * - Event metadata (teams, status, startTime) is always included
 * - Scores/stats are part of the Event structure (cannot be filtered)
 * 
 * PROPER USAGE:
 * ```typescript
 * await client.events.get({
 *   leagueID: 'NBA',
 *   oddIDs: MAIN_LINE_ODDIDS,              // Use constants defined above
 *   includeOpposingOddIDs: true,           // Get both sides automatically
 * });
 * ```
 * 
 * WHAT WE DON'T USE:
 * - ❌ Manual data stripping (not official, prone to errors)
 * - ❌ Post-processing to remove fields (wastes bandwidth already spent)
 * - ✅ ONLY official oddIDs parameter for optimization
 * 
 * NOTE: Event objects include scores/status fields by design (for game identification).
 * We simply don't display these fields in our UI - they're used only for filtering.
 */

/**
 * Fetch ALL events across multiple pages (use with caution for large datasets)
 * Automatically fetches all pages using cursor-based pagination
 * 
 * @param options Query parameters
 * @param maxPages Maximum number of pages to fetch (safety limit, default: 10)
 * @returns All events across all pages
 */
export async function getAllEvents(
  options: {
    leagueID?: string;
    eventIDs?: string | string[];
    oddsAvailable?: boolean;
    oddIDs?: string;
    bookmakerID?: string;
    includeOpposingOddIDs?: boolean;
    live?: boolean;
    finalized?: boolean;
    limit?: number;
    startsAfter?: string;
    startsBefore?: string;
  } = {},
  maxPages: number = 10
) {
  const client = getSportsGameOddsClient();
  
  try {
    logger.info('Fetching all events with pagination', { options, maxPages });
    
    // Convert eventIDs array to comma-separated string if needed
    const params = { ...options } as any;
    if (params.eventIDs && Array.isArray(params.eventIDs)) {
      params.eventIDs = params.eventIDs.join(',');
    }
    
    let allEvents: any[] = [];
    let page = await client.events.get(params);
    let pageCount = 1;
    
    allEvents = allEvents.concat(page.data);
    logger.debug(`Page ${pageCount}: fetched ${page.data.length} events`);
    
    // Fetch remaining pages
    while (page.hasNextPage() && pageCount < maxPages) {
      page = await page.getNextPage();
      pageCount++;
      allEvents = allEvents.concat(page.data);
      logger.debug(`Page ${pageCount}: fetched ${page.data.length} events (total: ${allEvents.length})`);
    }
    
    if (page.hasNextPage()) {
      logger.warn(`Reached max pages limit (${maxPages}), there may be more data available`);
    }
    
    logger.info(`Fetched ${allEvents.length} total events across ${pageCount} pages`);
    
    return {
      data: allEvents,
      meta: {
        hasMore: page.hasNextPage(),
        pageCount,
      },
    };
  } catch (error) {
    logger.error('Error fetching all events', error);
    throw error;
  }
}

/**
 * Fetch events with ODDS-FOCUSED filters
 * 
 * Official SDK Pattern for Odds:
 * - oddsAvailable=true: Only events with active betting markets
 * - oddIDs: Filter specific bet types (reduces payload 50-90%)
 * - bookmakerID: Filter specific sportsbooks
 * - includeOpposingOddIDs: Get both sides of a market
 * 
 * @param options Query parameters for odds-focused event fetching
 */
export async function getEvents(options: {
  leagueID?: string; // NBA, NFL, NHL (uppercase)
  eventIDs?: string | string[];
  oddsAvailable?: boolean; // TRUE = only events with active odds
  oddIDs?: string; // Filter specific markets (e.g., "game-ml,game-ats,game-ou" for main lines)
  bookmakerID?: string; // Filter specific sportsbooks (defaults to REPUTABLE_BOOKMAKERS)
  includeOpposingOddIDs?: boolean; // Get both sides of markets (recommended: true)
  includeConsensus?: boolean; // TRUE = include bookOdds/fairOdds consensus calculations (REQUIRED for real market odds)
  live?: boolean; // Live games with changing odds
  finalized?: boolean; // FALSE = upcoming/live games only
  limit?: number;
  startsAfter?: string;
  startsBefore?: string;
} = {}) {
  const client = getSportsGameOddsClient();
  
  try {
    // ✅ CRITICAL: ALWAYS request consensus odds calculations
    // This is what gives us bookOdds (real market consensus)
    // Without this, SDK only returns individual sportsbook odds, no bookOdds
    const consensusEnabled = options.includeConsensus !== false; // Default to true
    
    // ✅ APPLY REPUTABLE BOOKMAKERS FILTER GLOBALLY
    // If no bookmakerID specified, use our curated list of top-tier sportsbooks
    // This ensures all consensus odds calculations use only reputable sources
    const params = {
      ...options,
      bookmakerID: options.bookmakerID || REPUTABLE_BOOKMAKERS,
      includeConsensus: consensusEnabled, // CRITICAL: Request bookOdds calculations
    };
    
    // Log to verify includeConsensus is being set
    logger.info('SDK getEvents params:', {
      includeConsensus: params.includeConsensus,
      hasBookmakerID: !!params.bookmakerID,
      bookmakerCount: params.bookmakerID?.split(',').length || 0,
      leagueID: params.leagueID,
      eventIDsCount: Array.isArray(params.eventIDs) ? params.eventIDs.length : (params.eventIDs ? 1 : 0),
    });
    
    // Generate unique request ID for deduplication
    const requestId = `events:${JSON.stringify(params)}`;
    
    // Execute with rate limiting
    const result = await rateLimiter.execute(
      requestId,
      async () => {
        logger.info('Fetching events with odds from SportsGameOdds SDK', {
          ...params,
          bookmakerCount: (params.bookmakerID?.split(',').length || 0),
        });
        
        // Convert eventIDs array to comma-separated string if needed
        const finalParams = { ...params } as any;
        if (finalParams.eventIDs && Array.isArray(finalParams.eventIDs)) {
          finalParams.eventIDs = finalParams.eventIDs.join(',');
        }
        
        const page = await client.events.get(finalParams);
        logger.info(`Fetched ${page.data.length} events from SDK using ${params.bookmakerID?.split(',').length || 0} reputable bookmakers`);
        
        // Debug: Log first event's odds structure to understand what we're getting
        if (page.data.length > 0 && page.data[0].odds) {
          const firstOdd = Object.values(page.data[0].odds || {})[0] as any;
          logger.info('ODDS DEBUG - Sample odds structure:', {
            eventID: page.data[0].eventID,
            totalOddsMarkets: Object.keys(page.data[0].odds || {}).length,
            firstOddID: Object.keys(page.data[0].odds || {})[0],
            hasBookOdds: firstOdd?.bookOdds !== undefined,
            hasFairOdds: firstOdd?.fairOdds !== undefined,
            bookOddsValue: firstOdd?.bookOdds,
            fairOddsValue: firstOdd?.fairOdds,
            bookOddsAvailable: firstOdd?.bookOddsAvailable,
            sampleOddKeys: firstOdd ? Object.keys(firstOdd) : []
          });
        } else {
          logger.warn('No odds data in SDK response', {
            eventCount: page.data.length,
            firstEventKeys: page.data[0] ? Object.keys(page.data[0]) : []
          });
        }
        
        // ✅ Response size already optimized via oddIDs parameter (official method)
        // No manual data stripping needed - oddIDs filters markets at source
        
        return {
          data: page.data,
          meta: {
            hasMore: page.hasNextPage(),
          },
        };
      },
      1 // High priority
    );
    
    return result;
  } catch (error) {
    // Handle rate limiting errors gracefully
    if (error instanceof Error && error.message === 'DUPLICATE_REQUEST') {
      logger.debug('Skipped duplicate request', { options });
      return { data: [], meta: { hasMore: false } };
    }
    
    if (error instanceof Error && error.message === 'HOURLY_LIMIT_EXCEEDED') {
      logger.warn('SDK hourly limit exceeded', { options });
      return { data: [], meta: { hasMore: false } };
    }
    
    // Handle 404 "No Events found" gracefully - this is a valid response
    if (error instanceof Error && error.message.includes('404') && error.message.includes('No Events found')) {
      logger.info('No events found for query', { options });
      return { data: [], meta: { hasMore: false } };
    }
    
    logger.error('Error fetching events', error);
    throw error;
  }
}

/**
 * Fetch teams
 */
export async function getTeams(options: {
  leagueID?: string;
  teamID?: string;
} = {}) {
  const client = getSportsGameOddsClient();
  
  try {
    logger.info('Fetching teams from SportsGameOdds SDK');
    
    const page = await client.teams.get(options as any);
    const teams = page.data;
    
    logger.info(`Fetched ${teams.length} teams`);
    return teams;
  } catch (error) {
    logger.error('Error fetching teams', error);
    throw error;
  }
}

/**
 * Fetch players by playerID or teamID
 * Returns player data including teamID, position, name, etc.
 * 
 * @param options - Query parameters (playerID, teamID, or eventID)
 * @returns Array of player objects with teamID field
 */
export async function getPlayers(options: {
  playerID?: string;
  teamID?: string;
  eventID?: string;
} = {}) {
  const client = getSportsGameOddsClient();
  
  try {
    logger.info('Fetching players from SportsGameOdds SDK', { options });
    
    const page = await client.players.get(options as any);
    const players = page.data || [];
    
    logger.info(`Fetched ${players.length} players`);
    return players;
  } catch (error) {
    logger.error('Error fetching players', error);
    throw error;
  }
}

/**
 * Batch fetch player data for multiple playerIDs
 * More efficient than individual calls for large prop lists
 * 
 * @param playerIDs - Array of playerIDs to fetch
 * @returns Map of playerID to player data
 */
export async function getPlayersBatch(playerIDs: string[]): Promise<Map<string, any>> {
  const playerMap = new Map<string, any>();
  
  if (playerIDs.length === 0) return playerMap;
  
  try {
    // SDK supports comma-separated playerIDs
    const playerIDsParam = playerIDs.join(',');
    
    logger.info(`Batch fetching ${playerIDs.length} players`);
    const players = await getPlayers({ playerID: playerIDsParam });
    
    // Map by playerID for quick lookup
    players.forEach((player: any) => {
      if (player.playerID) {
        playerMap.set(player.playerID, player);
      }
    });
    
    logger.info(`Mapped ${playerMap.size} players from batch fetch`);
    return playerMap;
  } catch (error) {
    logger.error('Error in batch player fetch', error);
    // Return empty map on error - player props will work but without team info
    return playerMap;
  }
}

/**
 * Get real-time streaming connection details
 * Requires AllStar or custom plan subscription
 * 
 * Official Documentation: https://sportsgameodds.com/docs/guides/realtime-streaming-api
 * 
 * @param feed - Stream feed type ('events:live', 'events:upcoming', 'events:byid')
 * @param params - Additional parameters (e.g., leagueID for upcoming, eventID for byid)
 * @param params.oddID - Filter specific markets (e.g., "game-ml,game-ats,game-ou" for main lines)
 * @param params.includeOpposingOdds - Get both sides of markets (recommended: true)
 */
export async function getStreamConnection(
  feed: 'events:live' | 'events:upcoming' | 'events:byid',
  params: {
    leagueID?: string;
    eventID?: string;
    oddID?: string;
    includeOpposingOdds?: boolean;
  } = {}
) {
  const client = getSportsGameOddsClient();
  
  try {
    logger.info(`Getting stream connection for feed: ${feed}`, params);
    
    const streamParams: any = { feed };
    if (params.leagueID) streamParams.leagueID = params.leagueID;
    if (params.eventID) streamParams.eventID = params.eventID;
    if (params.oddID) streamParams.oddID = params.oddID;
    if (params.includeOpposingOdds !== undefined) {
      streamParams.includeOpposingOdds = params.includeOpposingOdds;
    }
    
    const response = await client.stream.events(streamParams);
    
    logger.info('Stream connection details retrieved');
    return {
      pusherKey: response.pusherKey,
      pusherOptions: response.pusherOptions,
      channel: response.channel,
      initialData: response.data,
    };
  } catch (error) {
    logger.error('Error getting stream connection', error);
    throw error;
  }
}

/**
 * Calculate consensus odds from event data
 * Aggregates odds from multiple bookmakers using median prices
 */
export function calculateConsensusOdds(event: any) {
  if (!event.odds || Object.keys(event.odds).length === 0) {
    return null;
  }
  
  const consensus: any = {};
  
  // Aggregate odds by market type
  Object.entries(event.odds).forEach(([marketType, bookmakerOdds]: [string, any]) => {
    if (!Array.isArray(bookmakerOdds)) return;
    
    // Group outcomes by name across all bookmakers
    const outcomeGroups: Record<string, number[]> = {};
    
    bookmakerOdds.forEach((bookmaker: any) => {
      if (!bookmaker.outcomes) return;
      
      bookmaker.outcomes.forEach((outcome: any) => {
        if (!outcomeGroups[outcome.name]) {
          outcomeGroups[outcome.name] = [];
        }
        outcomeGroups[outcome.name].push(outcome.price);
      });
    });
    
    // Calculate median price for each outcome
    consensus[marketType] = Object.entries(outcomeGroups).map(([name, prices]) => {
      const sortedPrices = prices.sort((a, b) => a - b);
      const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
      
      return {
        name,
        price: median,
        priceCount: prices.length, // How many bookmakers
      };
    });
  });
  
  return consensus;
}

/**
 * Extract player props from SDK event
 * Handles all market types and properly structures prop data
 * 
 * @param event - SDK event with odds data
 * @param playerDataMap - Optional map of playerID to player data (includes teamID, position, etc.)
 * @returns Array of player prop objects
 */
export function extractPlayerProps(event: any, playerDataMap?: Map<string, any>): any[] {
  const props: any[] = [];
  
  if (!event.odds) return props;
  
  // New SDK format uses oddIDs like:
  // "points-LEBRON_JAMES_1_NBA-game-ou-over"
  // "assists-CADE_CUNNINGHAM_1_NBA-game-ou-over"
  // "rebounds-EVAN_MOBLEY_1_NBA-game-ou-under"
  
  // Group by player and stat type
  const playerPropGroups: Record<string, {
    player: { playerID: string, name: string, teamID?: string, position?: string },
    statType: string,
    over?: { odds: number, line?: number },
    under?: { odds: number, line?: number },
  }> = {};
  
  Object.entries(event.odds).forEach(([oddID, oddData]: [string, any]) => {
    // Skip if not a player prop (player props have player ID in oddID)
    // Format: "statType-PLAYER_ID-periodID-betTypeID-sideID"
    const parts = oddID.split('-');
    if (parts.length < 5) return; // Not a player prop
    
    const statType = parts[0];
    const playerID = parts[1];
    
    // Skip team/game totals (they use 'all', 'away', 'home' instead of player IDs)
    if (['all', 'away', 'home'].includes(playerID)) return;
    
    // Accept ALL player stat types from the API
    // The SDK provides stat types dynamically based on sport:
    // NBA: points, assists, rebounds, threes, steals, blocks, etc.
    // NFL: passing_yards, rushing_yards, receiving_yards, touchdowns, etc.
    // NHL: goals, assists, shots, saves, etc.
    // We trust the API to only return valid player props
    // No need for a hardcoded whitelist - if it has a player ID, it's a player prop
    
    // Skip if not main game (we want -game-, not -1q-, -1h-, etc.)
    if (!oddID.includes('-game-')) return;
    
    // Skip if not over/under market
    if (!oddID.includes('-ou-')) return;
    
    const isOver = oddID.includes('-over');
    const isUnder = oddID.includes('-under');
    if (!isOver && !isUnder) return;
    
    // PROFESSIONAL-GRADE: STRICT bookOdds enforcement (no fallback allowed)
    // Only use real market consensus data - never mathematical fair odds
    if (!oddData.bookOdds) return; // Skip this prop if real market data unavailable
    
    const oddsValue = parseFloat(String(oddData.bookOdds)) || 0;
    
    // For over/under markets, strictly use bookOverUnder or bookLine
    const lineValue = oddData.bookOverUnder 
      ? parseFloat(String(oddData.bookOverUnder))
      : (oddData.bookLine ? parseFloat(String(oddData.bookLine)) : undefined);
    
    // Skip if we don't have real market data
    if (!oddsValue || !lineValue) return;
    
    // Create group key
    const groupKey = `${playerID}_${statType}`;
    
    if (!playerPropGroups[groupKey]) {
      // Parse player name from playerID (e.g., "LEBRON_JAMES_1_NBA" -> "LeBron James")
      // Remove the last parts which are usually number and league
      const playerIDParts = playerID.split('_');
      
      // Find where the player name ends (before numbers and league code)
      let nameEndIndex = playerIDParts.length;
      
      // Check last part - if it's a league code (NBA, NFL, NHL), remove it
      if (['NBA', 'NFL', 'NHL', 'MLB', 'MLS'].includes(playerIDParts[playerIDParts.length - 1])) {
        nameEndIndex--;
      }
      
      // Check second to last - if it's a number, remove it
      if (nameEndIndex > 0 && /^\d+$/.test(playerIDParts[nameEndIndex - 1])) {
        nameEndIndex--;
      }
      
      // Build player name from remaining parts
      const playerNameParts = playerIDParts.slice(0, nameEndIndex);
      const playerName = playerNameParts.length > 0
        ? playerNameParts.map(part => part.charAt(0) + part.slice(1).toLowerCase()).join(' ')
        : playerID; // Fallback to raw playerID if parsing fails
      
      // Get player data from provided map if available
      const playerData = playerDataMap?.get(playerID);
      
      playerPropGroups[groupKey] = {
        player: {
          playerID,
          name: playerData?.names?.display || playerName,
          teamID: playerData?.teamID,
          position: playerData?.position,
        },
        statType,
      };
    }
    
    if (isOver) {
      playerPropGroups[groupKey].over = { odds: oddsValue, line: lineValue };
    } else if (isUnder) {
      playerPropGroups[groupKey].under = { odds: oddsValue, line: lineValue };
    }
  });
  
  // Convert groups to props array
  Object.entries(playerPropGroups).forEach(([_groupKey, group]) => {
    // Skip if missing over or under
    if (!group.over || !group.under) return;
    
    // Use the line from over (they should be the same)
    const line = group.over.line || group.under.line;
    
    props.push({
      propID: `${event.eventID}_${group.statType}_${group.player.playerID}`,
      eventID: event.eventID,
      propType: group.statType,
      player: group.player,
      line,
      overOdds: group.over.odds,
      underOdds: group.under.odds,
      bookmakerID: 'consensus', // Using consensus odds
      bookmakerName: 'Consensus',
      lastUpdated: new Date().toISOString(),
    });
  });
  
  return props;
}

/**
 * Extract game props from SDK event
 * Handles all non-player-specific markets including team totals, quarters, halves, and more
 * 
 * SDK oddID format: "statType-entity-periodID-betTypeID-sideID"
 * Example: "points-home-1q-sp-home" = Home team 1st quarter spread
 */
export function extractGameProps(event: any): any[] {
  if (!event.odds) return [];
  
  // Map to group related props (e.g., over/under pairs)
  const propsMap = new Map<string, any>();
  
  Object.entries(event.odds).forEach(([oddID, oddData]: [string, any]) => {
    // Parse oddID format: "statType-entity-periodID-betTypeID-sideID"
    const parts = oddID.split('-');
    if (parts.length < 5) return; // Invalid format
    
    const [statType, entity, periodID, betTypeID, sideID] = parts;
    
    // Only include game props (entity = 'home', 'away', 'all')
    // Skip player props (entity would be a player ID like "LEBRON_JAMES_1_NBA")
    if (!['home', 'away', 'all'].includes(entity)) return;
    
    // Skip main game lines (already shown in main odds)
    // We want additional markets only
    if (periodID === 'game' && betTypeID === 'ml') return; // Skip moneyline
    if (periodID === 'game' && betTypeID === 'sp' && entity !== 'all') return; // Skip main spread (keep alt spreads)
    if (periodID === 'game' && betTypeID === 'ou' && entity === 'all') return; // Skip main total (keep team totals)
    
    // PROFESSIONAL-GRADE: STRICT bookOdds enforcement (no fallback allowed)
    // Only use real market consensus data - never mathematical fair odds
    if (!oddData.bookOdds) return; // Skip this prop if real market data unavailable
    
    const oddsValue = parseFloat(String(oddData.bookOdds)) || 0;
    const spreadValue = oddData.bookSpread ? parseFloat(String(oddData.bookSpread)) : undefined;
    const totalValue = oddData.bookOverUnder ? parseFloat(String(oddData.bookOverUnder)) : undefined;
    
    // Skip if we don't have odds
    if (!oddsValue) return;
    
    // Determine market category and description
    let marketCategory = '';
    let description = '';
    let line: number | undefined;
    
    // Categorize by period - OFFICIAL FORMAT per https://sportsgameodds.com/docs/data-types/periods
    // NBA/NFL use quarters (1q, 2q, 3q, 4q) and halves (1h, 2h)
    // NHL uses periods (1p, 2p, 3p), regulation (reg), overtime (ot), shootout (so)
    if (periodID === '1q') marketCategory = '1st Quarter';
    else if (periodID === '2q') marketCategory = '2nd Quarter';
    else if (periodID === '3q') marketCategory = '3rd Quarter';
    else if (periodID === '4q') marketCategory = '4th Quarter';
    else if (periodID === '1h') marketCategory = '1st Half';
    else if (periodID === '2h') marketCategory = '2nd Half';
    else if (periodID === '1p') marketCategory = '1st Period'; // NHL
    else if (periodID === '2p') marketCategory = '2nd Period'; // NHL
    else if (periodID === '3p') marketCategory = '3rd Period'; // NHL
    else if (periodID === 'reg') marketCategory = 'Regulation'; // NHL
    else if (periodID === 'ot') marketCategory = 'Overtime'; // NHL
    else if (periodID === 'so') marketCategory = 'Shootout'; // NHL
    else if (periodID === 'game') marketCategory = 'Team Totals';
    else marketCategory = 'Other Props';
    
    // Build description based on bet type
    const teamLabel = entity === 'home' ? 'Home' : entity === 'away' ? 'Away' : 'Total';
    
    if (betTypeID === 'sp') {
      // Spread
      line = spreadValue;
      const spreadSign = line && line > 0 ? '+' : '';
      description = `${teamLabel} ${spreadSign}${line || 0}`;
    } else if (betTypeID === 'ou') {
      // Over/Under (team totals or period totals)
      line = totalValue;
      const overUnder = sideID === 'over' ? 'Over' : 'Under';
      description = `${teamLabel} ${overUnder} ${line || 0}`;
    } else if (betTypeID === 'ml') {
      // Moneyline
      description = `${teamLabel} Win`;
    } else {
      // Other bet types
      description = `${teamLabel} ${betTypeID}`;
    }
    
    // Create unique key for grouping
    const propKey = `${event.eventID}_${statType}_${entity}_${periodID}_${betTypeID}`;
    
    // Store in map
    if (!propsMap.has(propKey)) {
      propsMap.set(propKey, {
        id: oddID,
        marketID: propKey,
        eventID: event.eventID,
        marketCategory,
        propType: `${periodID}_${betTypeID}`, // e.g., "1q_sp", "game_ou"
        statType,
        entity,
        periodID,
        betTypeID,
        outcomes: [],
      });
    }
    
    // Add outcome
    propsMap.get(propKey).outcomes.push({
      id: oddID,
      description,
      selection: sideID,
      odds: oddsValue,
      line,
      sideID,
    });
  });
  
  // Convert map to array and filter out empty outcomes
  return Array.from(propsMap.values()).filter(prop => prop.outcomes.length > 0);
}

/**
 * Fetch player props for a specific event using SDK
 * 
 * ⭐ OPTIMIZATION: Uses oddIDs parameter to fetch only player props (50-90% payload reduction)
 * Per official docs: https://sportsgameodds.com/docs/guides/response-speed
 */
export async function getPlayerProps(
  eventID: string,
  options: {
    playerID?: string;
    propType?: string;
  } = {}
) {
  try {
    logger.info(`Fetching player props for event ${eventID}`);
    
    // ⭐ CRITICAL OPTIMIZATION: Use PLAYER_PROP_ODDIDS to reduce payload by 50-90%
    // Without oddIDs: Fetches ALL odds including main lines, game props, etc.
    // With oddIDs: Only fetches player props, dramatically faster response
    const { data: events } = await getEvents({
      eventIDs: eventID,
      oddIDs: PLAYER_PROP_ODDIDS,              // ✅ OFFICIAL: Filter to player props only
      oddsAvailable: true,
      includeOpposingOddIDs: true, // CRITICAL: Get both over AND under for each prop
      includeConsensus: true, // CRITICAL: Request bookOdds for real market data
    });
    
    if (events.length === 0) {
      return [];
    }
    
    const event = events[0];
    
    // First pass: extract props to get list of playerIDs
    const preliminaryProps = extractPlayerProps(event);
    
    // Get unique playerIDs from props
    const playerIDs = Array.from(new Set(preliminaryProps.map(p => p.player.playerID)));
    
    // Batch fetch player data to get teamID, position, etc.
    let playerDataMap: Map<string, any> | undefined;
    if (playerIDs.length > 0) {
      logger.info(`Fetching data for ${playerIDs.length} players`);
      playerDataMap = await getPlayersBatch(playerIDs);
      logger.info(`Retrieved data for ${playerDataMap.size} players with teamID`);
    }
    
    // Second pass: extract props with player data
    let playerProps = extractPlayerProps(event, playerDataMap);
    
    // Apply filters
    if (options.playerID) {
      playerProps = playerProps.filter(p => p.player.playerID === options.playerID);
    }
    
    if (options.propType) {
      playerProps = playerProps.filter(p => p.propType === options.propType);
    }
    
    logger.info(`Fetched ${playerProps.length} player props`);
    return playerProps;
  } catch (error) {
    logger.error('Error fetching player props', error);
    throw error;
  }
}

/**
 * Fetch game props for a specific event using SDK
 * 
 * ⭐ OPTIMIZATION: Uses oddIDs parameter to fetch only game props (50-90% payload reduction)
 * Per official docs: https://sportsgameodds.com/docs/guides/response-speed
 */
export async function getGameProps(
  eventID: string,
  options: {
    propType?: string;
  } = {}
) {
  try {
    logger.info(`Fetching game props for event ${eventID}`);
    
    // ⭐ CRITICAL OPTIMIZATION: Use GAME_PROP_ODDIDS to reduce payload by 50-90%
    // Without oddIDs: Fetches ALL odds including main lines, player props, etc.
    // With oddIDs: Only fetches game props (quarters, halves, team totals), dramatically faster
    const { data: events } = await getEvents({
      eventIDs: eventID,
      oddIDs: GAME_PROP_ODDIDS,                // ✅ OFFICIAL: Filter to game props only
      oddsAvailable: true,
      includeOpposingOddIDs: true, // CRITICAL: Get both sides of all markets (over/under, home/away)
      includeConsensus: true, // CRITICAL: Request bookOdds for real market data
    });
    
    if (events.length === 0) {
      return [];
    }
    
    const event = events[0];
    let gameProps = extractGameProps(event);
    
    // Apply filters
    if (options.propType) {
      gameProps = gameProps.filter(p => p.marketType === options.propType);
    }
    
    logger.info(`Fetched ${gameProps.length} game props`);
    return gameProps;
  } catch (error) {
    logger.error('Error fetching game props', error);
    throw error;
  }
}

/**
 * Legacy compatibility exports
 */
export { getSportsGameOddsClient as getClient };

// Error class for backward compatibility
export class SportsGameOddsApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "SportsGameOddsApiError";
  }
}
