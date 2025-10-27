/**
 * SportsGameOdds SDK Integration
 * 
 * Official SDK-based implementation following industry best practices:
 * - Uses official sports-odds-api SDK
 * - Real-time WebSocket streaming support
 * - Consensus odds aggregation
 * - Proper pagination and data batching
 * - Type-safe with full TypeScript support
 * 
 * Documentation:
 * - SDK: https://sportsgameodds.com/docs/sdk
 * - API Reference: https://sportsgameodds.com/docs/reference
 * - Streaming: https://sportsgameodds.com/docs/guides/realtime-streaming-api
 */

import SportsGameOdds from 'sports-odds-api';
import { logger } from "./logger";

/**
 * Get configured SDK client instance
 * Server-side only - API key is never exposed to client
 */
export function getSportsGameOddsClient() {
  const apiKey = process.env.SPORTSGAMEODDS_API_KEY;
  
  if (!apiKey) {
    throw new Error('SPORTSGAMEODDS_API_KEY is not configured');
  }

  return new SportsGameOdds({
    apiKeyParam: apiKey,
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
 * Fetch events with optional filters
 * Uses SDK's built-in pagination
 */
export async function getEvents(options: {
  leagueID?: string;
  eventIDs?: string | string[];
  oddsAvailable?: boolean;
  live?: boolean;
  finalized?: boolean;
  limit?: number;
  startsAfter?: string;
  startsBefore?: string;
} = {}) {
  const client = getSportsGameOddsClient();
  
  try {
    logger.info('Fetching events from SportsGameOdds SDK', options);
    
    // Convert eventIDs array to comma-separated string if needed
    const params = { ...options } as any;
    if (params.eventIDs && Array.isArray(params.eventIDs)) {
      params.eventIDs = params.eventIDs.join(',');
    }
    
    const page = await client.events.get(params);
    logger.info(`Fetched ${page.data.length} events`);
    
    return {
      data: page.data,
      meta: {
        hasMore: page.hasNextPage(),
      },
    };
  } catch (error) {
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
