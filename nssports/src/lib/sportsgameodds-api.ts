/**
 * SportsGameOdds API Service Layer
 * 
 * Official Integration Protocol:
 * - Secure abstraction layer for all communication with SportsGameOdds.com API
 * - Server-side only - API key never exposed to client
 * - Typed responses with Zod validation
 * - Comprehensive error handling
 * 
 * API Documentation: https://sportsgameodds.com/docs/
 * API Reference: https://sportsgameodds.apidocumentation.com/reference
 */

import { z } from "zod";
import { logger } from "./logger";

const SPORTSGAMEODDS_API_BASE_URL = "https://api.sportsgameodds.com/v2";

/**
 * Zod schemas for SportsGameOdds API responses
 */

// League schema
export const SportsGameOddsLeagueSchema = z.object({
  leagueID: z.string(),
  name: z.string(),
  sport: z.string(),
  country: z.string().optional(),
  active: z.boolean().optional(),
});

export type SportsGameOddsLeague = z.infer<typeof SportsGameOddsLeagueSchema>;

// Team schema
export const SportsGameOddsTeamSchema = z.object({
  teamID: z.string(),
  name: z.string(),
  shortName: z.string().optional(),
  abbreviation: z.string().optional(),
  city: z.string().optional(),
  logo: z.string().optional(),
});

export type SportsGameOddsTeam = z.infer<typeof SportsGameOddsTeamSchema>;

// Outcome schema (for odds)
export const SportsGameOddsOutcomeSchema = z.object({
  name: z.string(),
  price: z.number(), // American odds format
  point: z.number().optional(), // For spreads/totals
  probability: z.number().optional(),
});

export type SportsGameOddsOutcome = z.infer<typeof SportsGameOddsOutcomeSchema>;

// Market schema
export const SportsGameOddsMarketSchema = z.object({
  marketID: z.string(),
  marketType: z.string(), // 'moneyline', 'spread', 'total', 'player_prop', etc.
  bookmakerID: z.string(),
  bookmakerName: z.string(),
  outcomes: z.array(SportsGameOddsOutcomeSchema),
  lastUpdated: z.string(),
});

export type SportsGameOddsMarket = z.infer<typeof SportsGameOddsMarketSchema>;

// Event/Game schema
export const SportsGameOddsEventSchema = z.object({
  eventID: z.string(),
  leagueID: z.string(),
  sport: z.string(),
  startTime: z.string(), // ISO 8601 datetime
  homeTeam: SportsGameOddsTeamSchema,
  awayTeam: SportsGameOddsTeamSchema,
  status: z.enum(["scheduled", "live", "finished", "postponed", "cancelled"]).optional(),
  homeScore: z.number().optional().nullable(),
  awayScore: z.number().optional().nullable(),
  period: z.string().optional().nullable(),
  timeRemaining: z.string().optional().nullable(),
  venue: z.string().optional().nullable(),
  odds: z.record(z.string(), z.any()).optional(), // Flexible odds structure
});

export type SportsGameOddsEvent = z.infer<typeof SportsGameOddsEventSchema>;

// Player schema
export const SportsGameOddsPlayerSchema = z.object({
  playerID: z.string(),
  name: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  teamID: z.string().optional(),
  position: z.string().optional(),
  jersey: z.string().optional(),
});

export type SportsGameOddsPlayer = z.infer<typeof SportsGameOddsPlayerSchema>;

// Player prop schema
export const SportsGameOddsPlayerPropSchema = z.object({
  propID: z.string(),
  eventID: z.string(),
  player: SportsGameOddsPlayerSchema,
  propType: z.string(), // 'points', 'rebounds', 'assists', etc.
  line: z.number(),
  overOdds: z.number(),
  underOdds: z.number(),
  bookmakerID: z.string(),
  bookmakerName: z.string(),
  lastUpdated: z.string(),
});

export type SportsGameOddsPlayerProp = z.infer<typeof SportsGameOddsPlayerPropSchema>;

// Pagination metadata schema
export const PaginationMetaSchema = z.object({
  total: z.number().optional(),
  limit: z.number(),
  cursor: z.string().optional().nullable(),
  nextCursor: z.string().optional().nullable(),
  hasMore: z.boolean().optional(),
});

// API Response wrapper
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    status: z.enum(["success", "error"]).optional(),
    data: z.array(dataSchema),
    meta: PaginationMetaSchema.optional(),
    errors: z.array(z.any()).optional(),
  });

/**
 * Error class for SportsGameOdds API errors
 */
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

/**
 * Get API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.SPORTSGAMEODDS_API_KEY;
  if (!apiKey) {
    throw new SportsGameOddsApiError("SPORTSGAMEODDS_API_KEY is not configured", 500);
  }
  return apiKey;
}

/**
 * Make a request to SportsGameOdds API with error handling
 */
async function fetchSportsGameOdds<T>(
  endpoint: string,
  schema: z.ZodType<T>,
  options: {
    params?: Record<string, string | number | boolean>;
  } = {}
): Promise<T> {
  const apiKey = getApiKey();
  
  // Build URL with query parameters
  const url = new URL(`${SPORTSGAMEODDS_API_BASE_URL}${endpoint}`);
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  try {
    logger.info(`Fetching from SportsGameOdds API: ${endpoint}`);
    
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Accept": "application/json",
      },
      // Don't cache in fetch - we'll handle caching at route level
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("SportsGameOdds API error response", { 
        status: response.status, 
        statusText: response.statusText,
        body: errorText 
      });
      
      throw new SportsGameOddsApiError(
        `SportsGameOdds API returned ${response.status}: ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const data = await response.json();
    
    // Validate response with Zod
    const validated = schema.parse(data);
    
    logger.info(`Successfully fetched from SportsGameOdds API: ${endpoint}`);
    return validated;
  } catch (error) {
    if (error instanceof SportsGameOddsApiError) {
      throw error;
    }
    
    if (error instanceof z.ZodError) {
      logger.error("SportsGameOdds API response validation error", error);
      throw new SportsGameOddsApiError(
        "Invalid response format from SportsGameOdds API",
        500,
        error.errors
      );
    }

    logger.error("Unexpected error fetching from SportsGameOdds API", error);
    throw new SportsGameOddsApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      500
    );
  }
}

/**
 * Get list of available leagues
 */
export async function getLeagues(options: {
  sport?: string;
  active?: boolean;
} = {}): Promise<SportsGameOddsLeague[]> {
  const params: Record<string, string | boolean> = {};
  if (options.sport) params.sport = options.sport;
  if (options.active !== undefined) params.active = options.active;

  const response = await fetchSportsGameOdds(
    "/leagues",
    ApiResponseSchema(SportsGameOddsLeagueSchema),
    { params }
  );
  
  return response.data;
}

/**
 * Get events/games for a specific league
 * 
 * @param leagueID - The league identifier (e.g., 'NBA', 'NFL', 'NHL')
 * @param options - Query options
 */
export async function getEvents(
  leagueID: string,
  options: {
    startsAfter?: string; // ISO datetime
    startsBefore?: string; // ISO datetime
    status?: "scheduled" | "live" | "finished";
    limit?: number;
    cursor?: string;
  } = {}
): Promise<{ data: SportsGameOddsEvent[]; meta?: z.infer<typeof PaginationMetaSchema> }> {
  const params: Record<string, string | number> = {
    leagueID,
  };
  
  if (options.startsAfter) params.startsAfter = options.startsAfter;
  if (options.startsBefore) params.startsBefore = options.startsBefore;
  if (options.status) params.status = options.status;
  if (options.limit) params.limit = options.limit;
  if (options.cursor) params.cursor = options.cursor;

  const response = await fetchSportsGameOdds(
    "/events",
    ApiResponseSchema(SportsGameOddsEventSchema),
    { params }
  );
  
  return {
    data: response.data,
    meta: response.meta,
  };
}

/**
 * Get odds for specific events
 * 
 * @param eventIDs - Array of event IDs or single event ID
 * @param options - Query options
 */
export async function getOdds(
  eventIDs: string | string[],
  options: {
    marketTypes?: string[]; // ['moneyline', 'spread', 'total']
    bookmakers?: string[];
  } = {}
): Promise<SportsGameOddsEvent[]> {
  const eventIDsArray = Array.isArray(eventIDs) ? eventIDs : [eventIDs];
  
  const params: Record<string, string> = {
    eventID: eventIDsArray.join(","),
  };
  
  if (options.marketTypes && options.marketTypes.length > 0) {
    params.marketType = options.marketTypes.join(",");
  }
  
  if (options.bookmakers && options.bookmakers.length > 0) {
    params.bookmaker = options.bookmakers.join(",");
  }

  const response = await fetchSportsGameOdds(
    "/odds",
    ApiResponseSchema(SportsGameOddsEventSchema),
    { params }
  );
  
  return response.data;
}

/**
 * Get available markets for an event
 */
export async function getMarkets(
  eventID: string
): Promise<SportsGameOddsMarket[]> {
  const response = await fetchSportsGameOdds(
    "/markets",
    ApiResponseSchema(SportsGameOddsMarketSchema),
    { params: { eventID } }
  );
  
  return response.data;
}

/**
 * Get teams
 */
export async function getTeams(options: {
  leagueID?: string;
  teamID?: string;
} = {}): Promise<SportsGameOddsTeam[]> {
  const params: Record<string, string> = {};
  if (options.leagueID) params.leagueID = options.leagueID;
  if (options.teamID) params.teamID = options.teamID;

  const response = await fetchSportsGameOdds(
    "/teams",
    ApiResponseSchema(SportsGameOddsTeamSchema),
    { params }
  );
  
  return response.data;
}

/**
 * Get player props for an event
 */
export async function getPlayerProps(
  eventID: string,
  options: {
    playerID?: string;
    propType?: string;
  } = {}
): Promise<SportsGameOddsPlayerProp[]> {
  const params: Record<string, string> = {
    eventID,
  };
  
  if (options.playerID) params.playerID = options.playerID;
  if (options.propType) params.propType = options.propType;

  const response = await fetchSportsGameOdds(
    "/player-props",
    ApiResponseSchema(SportsGameOddsPlayerPropSchema),
    { params }
  );
  
  return response.data;
}

/**
 * Get game props for an event
 */
export async function getGameProps(
  eventID: string
): Promise<SportsGameOddsMarket[]> {
  const response = await fetchSportsGameOdds(
    "/game-props",
    ApiResponseSchema(SportsGameOddsMarketSchema),
    { params: { eventID } }
  );
  
  return response.data;
}
