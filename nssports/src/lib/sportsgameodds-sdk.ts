/**
 * SportsGameOdds SDK Integration - ODDS-FOCUSED
 * 
 * Official SDK-based implementation for REAL-TIME ODDS & BETTING LINES ONLY:
 * - ✅ Moneyline, Spread, Total (Over/Under) odds
 * - ✅ Player props odds (points, rebounds, assists, etc.)
 * - ✅ Game props odds (team totals, quarters, etc.)
 * - ✅ Real-time WebSocket streaming for odds updates
 * - ❌ NO live scores/stats (we don't need game state tracking)
 * - ❌ NO activity/period/clock data (odds-only focus)
 * 
 * Key Official SDK Patterns:
 * 1. Odds Filtering: oddID parameter for 50-90% payload reduction
 *    - Main lines: "game-ml,game-ats,game-ou" (moneyline, spread, total)
 *    - Player props: "points-PLAYER_ID-game-ou" (wildcard for all players)
 * 2. Streaming: client.stream.events({ feed: 'events:live' }) for real-time odds
 * 3. Markets: Fetch specific bet types (moneyline, spread, total, props)
 * 4. Bookmakers: Multi-sportsbook odds aggregation
 * 5. includeOpposingOdds: Get both sides of markets (home/away, over/under)
 * 
 * Documentation:
 * - SDK: https://sportsgameodds.com/docs/sdk
 * - Odds Filtering: https://sportsgameodds.com/docs/guides/response-speed
 * - Streaming: https://sportsgameodds.com/docs/guides/realtime-streaming-api
 * - Markets: https://sportsgameodds.com/docs/data-types/markets
 * 
 * Supported Leagues (UPPERCASE per official spec):
 * - NBA, NFL, NHL (primary focus)
 * - MLB, NCAAB, NCAAF (additional)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import SportsGameOdds from 'sports-odds-api';
import { logger } from "./logger";
import { rateLimiter } from "./rate-limiter";

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
    oddID?: string;
    bookmakerID?: string;
    includeOpposingOdds?: boolean;
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
 * - oddID: Filter specific bet types (reduces payload 50-90%)
 * - bookmakerID: Filter specific sportsbooks
 * - includeOpposingOdds: Get both sides of a market
 * 
 * @param options Query parameters for odds-focused event fetching
 */
export async function getEvents(options: {
  leagueID?: string; // NBA, NFL, NHL (uppercase)
  eventIDs?: string | string[];
  oddsAvailable?: boolean; // TRUE = only events with active odds
  oddID?: string; // Filter specific markets (e.g., "game-ml,game-ats,game-ou" for main lines)
  bookmakerID?: string; // Filter specific sportsbooks
  includeOpposingOdds?: boolean; // Get both sides of markets (recommended: true)
  live?: boolean; // Live games with changing odds
  finalized?: boolean; // FALSE = upcoming/live games only
  limit?: number;
  startsAfter?: string;
  startsBefore?: string;
} = {}) {
  const client = getSportsGameOddsClient();
  
  try {
    // Generate unique request ID for deduplication
    const requestId = `events:${JSON.stringify(options)}`;
    
    // Execute with rate limiting
    const result = await rateLimiter.execute(
      requestId,
      async () => {
        logger.info('Fetching events with odds from SportsGameOdds SDK', options);
        
        // Convert eventIDs array to comma-separated string if needed
        const params = { ...options } as any;
        if (params.eventIDs && Array.isArray(params.eventIDs)) {
          params.eventIDs = params.eventIDs.join(',');
        }
        
        const page = await client.events.get(params);
        logger.info(`Fetched ${page.data.length} events from SDK`);
        
        // Debug: Log first event's odds structure to understand what we're getting
        if (page.data.length > 0 && page.data[0].odds) {
          logger.debug('Sample event odds structure:', {
            eventID: page.data[0].eventID,
            oddsKeys: Object.keys(page.data[0].odds || {}),
            sampleOdds: JSON.stringify(page.data[0].odds).substring(0, 500)
          });
        } else {
          logger.warn('No odds data in SDK response', {
            eventCount: page.data.length,
            firstEventKeys: page.data[0] ? Object.keys(page.data[0]) : []
          });
        }
        
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
 * @param feed - Stream feed type ('events:live', 'events:upcoming', 'events:byid')
 * @param params - Additional parameters (e.g., leagueID for upcoming, eventID for byid)
 */
export async function getStreamConnection(
  feed: 'events:live' | 'events:upcoming' | 'events:byid',
  params: {
    leagueID?: string;
    eventID?: string;
  } = {}
) {
  const client = getSportsGameOddsClient();
  
  try {
    logger.info(`Getting stream connection for feed: ${feed}`);
    
    const streamParams: any = { feed };
    if (params.leagueID) streamParams.leagueID = params.leagueID;
    if (params.eventID) streamParams.eventID = params.eventID;
    
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
    
    // Skip if this doesn't look like a player prop stat
    const playerPropStats = ['points', 'assists', 'rebounds', 'threes', 'steals', 'blocks', 
                             'points+assists', 'points+rebounds', 'points+rebounds+assists',
                             'blocks+steals', 'doubles', 'triples'];
    if (!playerPropStats.includes(statType)) return;
    
    // Skip if not main game (we want -game-, not -1q-, -1h-, etc.)
    if (!oddID.includes('-game-')) return;
    
    // Skip if not over/under market
    if (!oddID.includes('-ou-')) return;
    
    const isOver = oddID.includes('-over');
    const isUnder = oddID.includes('-under');
    if (!isOver && !isUnder) return;
    
    // Extract odds values
    const oddsValue = parseFloat(String(oddData.fairOdds || oddData.bookOdds)) || 0;
    // For over/under markets, the line is in fairOverUnder or bookOverUnder
    const lineValue = parseFloat(String(oddData.fairOverUnder || oddData.bookOverUnder || oddData.fairLine || oddData.bookLine)) || undefined;
    
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
 * Handles all non-player-specific markets
 */
export function extractGameProps(event: any): any[] {
  const props: any[] = [];
  
  if (!event.odds) return props;
  
  // Game props are markets that aren't player-specific or main markets
  Object.entries(event.odds).forEach(([marketType, bookmakerOdds]: [string, any]) => {
    // Skip player props and main markets
    if (marketType.startsWith('player_')) return;
    if (['moneyline', 'spread', 'total'].includes(marketType)) return;
    
    if (!Array.isArray(bookmakerOdds)) return;
    
    bookmakerOdds.forEach((bookmaker: any) => {
      if (!bookmaker.outcomes) return;
      
      props.push({
        marketID: `${event.eventID}_${marketType}_${bookmaker.bookmakerID}`,
        eventID: event.eventID,
        marketType,
        bookmakerID: bookmaker.bookmakerID,
        bookmakerName: bookmaker.bookmakerName,
        outcomes: bookmaker.outcomes.map((outcome: any) => ({
          name: outcome.name,
          price: outcome.price,
          point: outcome.point,
          type: outcome.type,
        })),
        lastUpdated: bookmaker.lastUpdated || new Date().toISOString(),
      });
    });
  });
  
  return props;
}

/**
 * Fetch player props for a specific event using SDK
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
    
    const { data: events } = await getEvents({
      eventIDs: eventID,
      oddsAvailable: true,
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
 */
export async function getGameProps(
  eventID: string,
  options: {
    propType?: string;
  } = {}
) {
  try {
    logger.info(`Fetching game props for event ${eventID}`);
    
    const { data: events } = await getEvents({
      eventIDs: eventID,
      oddsAvailable: true,
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
