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
 * 2. Streaming: client.stream.events({ feed: 'events:live' }) for real-time odds
 * 3. Markets: Fetch specific bet types (moneyline, spread, total, props)
 * 4. Bookmakers: Multi-sportsbook odds aggregation
 * 
 * Documentation:
 * - SDK: https://sportsgameodds.com/docs/sdk
 * - Odds Filtering: https://sportsgameodds.com/docs/guides/odds-filtering
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
  oddID?: string; // Filter specific markets (e.g., "ml,sp,ou" for main lines)
  bookmakerID?: string; // Filter specific sportsbooks
  includeOpposingOdds?: boolean; // Get both sides of markets
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
 */
export function extractPlayerProps(event: any): any[] {
  const props: any[] = [];
  
  if (!event.odds) return props;
  
  // Look for player prop markets
  Object.entries(event.odds).forEach(([marketType, bookmakerOdds]: [string, any]) => {
    // Player props typically have market types like 'player_points', 'player_rebounds', etc.
    if (!marketType.startsWith('player_')) return;
    
    if (!Array.isArray(bookmakerOdds)) return;
    
    const propType = marketType.replace('player_', '');
    
    bookmakerOdds.forEach((bookmaker: any) => {
      if (!bookmaker.outcomes) return;
      
      // Group outcomes by player
      const playerGroups: Record<string, any[]> = {};
      
      bookmaker.outcomes.forEach((outcome: any) => {
        const playerName = outcome.player?.name || outcome.name;
        if (!playerGroups[playerName]) {
          playerGroups[playerName] = [];
        }
        playerGroups[playerName].push(outcome);
      });
      
      // Create props for each player
      Object.entries(playerGroups).forEach(([playerName, outcomes]) => {
        // Find over and under outcomes
        const overOutcome = outcomes.find((o: any) => o.type === 'over' || o.name.includes('Over'));
        const underOutcome = outcomes.find((o: any) => o.type === 'under' || o.name.includes('Under'));
        
        // Get line from either outcome
        const line = overOutcome?.point || underOutcome?.point;
        
        props.push({
          propID: `${event.eventID}_${marketType}_${playerName}_${bookmaker.bookmakerID}`,
          eventID: event.eventID,
          marketType,
          propType,
          player: {
            playerID: overOutcome?.player?.playerID || underOutcome?.player?.playerID || playerName,
            name: playerName,
            teamID: overOutcome?.player?.teamID || underOutcome?.player?.teamID,
            position: overOutcome?.player?.position || underOutcome?.player?.position,
          },
          line,
          overOdds: overOutcome?.price,
          underOdds: underOutcome?.price,
          bookmakerID: bookmaker.bookmakerID,
          bookmakerName: bookmaker.bookmakerName,
          lastUpdated: bookmaker.lastUpdated || new Date().toISOString(),
        });
      });
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
    let playerProps = extractPlayerProps(event);
    
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
