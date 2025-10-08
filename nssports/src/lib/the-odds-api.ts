/**
 * The Odds API Service Layer
 * 
 * Official Integration Protocol:
 * - Secure abstraction layer for all communication with The Odds API
 * - Server-side only - API key never exposed to client
 * - Typed responses with Zod validation
 * - Comprehensive error handling
 * 
 * API Documentation: https://the-odds-api.com/liveapi/guides/v4/
 */

import { z } from "zod";
import { logger } from "./logger";

const THE_ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";

/**
 * Zod schemas for The Odds API responses
 */

// Sport schema from The Odds API
export const OddsApiSportSchema = z.object({
  key: z.string(),
  group: z.string(),
  title: z.string(),
  description: z.string(),
  active: z.boolean(),
  has_outrights: z.boolean(),
});

export type OddsApiSport = z.infer<typeof OddsApiSportSchema>;

// Bookmaker outcome schema
const BookmakerOutcomeSchema = z.object({
  name: z.string(),
  price: z.number(),
  point: z.number().optional(),
});

// Bookmaker market schema
const BookmakerMarketSchema = z.object({
  key: z.string(), // 'h2h' (moneyline), 'spreads', 'totals'
  last_update: z.string(),
  outcomes: z.array(BookmakerOutcomeSchema),
});

// Bookmaker schema
const BookmakerSchema = z.object({
  key: z.string(),
  title: z.string(),
  last_update: z.string(),
  markets: z.array(BookmakerMarketSchema),
});

// Event/Game schema from The Odds API
export const OddsApiEventSchema = z.object({
  id: z.string(),
  sport_key: z.string(),
  sport_title: z.string(),
  commence_time: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  bookmakers: z.array(BookmakerSchema),
});

export type OddsApiEvent = z.infer<typeof OddsApiEventSchema>;

/**
 * Error class for The Odds API errors
 */
export class OddsApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "OddsApiError";
  }
}

/**
 * Get API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.THE_ODDS_API_KEY;
  if (!apiKey) {
    throw new OddsApiError("THE_ODDS_API_KEY is not configured", 500);
  }
  return apiKey;
}

/**
 * Make a request to The Odds API with error handling
 */
async function fetchOddsApi<T>(
  endpoint: string,
  schema: z.ZodType<T>
): Promise<T> {
  const apiKey = getApiKey();
  const url = `${THE_ODDS_API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${apiKey}`;

  try {
    logger.info(`Fetching from The Odds API: ${endpoint}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      // Don't cache in fetch - we'll handle caching at route level
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("The Odds API error response", { 
        status: response.status, 
        statusText: response.statusText,
        body: errorText 
      });
      
      throw new OddsApiError(
        `The Odds API returned ${response.status}: ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const data = await response.json();
    
    // Check for error messages in the response body (TheOdds API returns 200 with error messages)
    if (data && typeof data === 'object' && 'error_code' in data) {
      const errorData = data as { message?: string; error_code: string; details_url?: string };
      logger.error("The Odds API error in response body", errorData);
      
      if (errorData.error_code === 'OUT_OF_USAGE_CREDITS') {
        throw new OddsApiError(
          "The Odds API usage quota has been exceeded. Please upgrade your plan or wait for the quota to reset.",
          429,
          errorData
        );
      }
      
      throw new OddsApiError(
        errorData.message || `The Odds API returned error: ${errorData.error_code}`,
        400,
        errorData
      );
    }
    
    // Validate response with Zod
    const validated = schema.parse(data);
    
    logger.info(`Successfully fetched from The Odds API: ${endpoint}`);
    return validated;
  } catch (error) {
    if (error instanceof OddsApiError) {
      throw error;
    }
    
    if (error instanceof z.ZodError) {
      logger.error("The Odds API response validation error", error);
      throw new OddsApiError(
        "Invalid response format from The Odds API",
        500,
        error.errors
      );
    }

    logger.error("Unexpected error fetching from The Odds API", error);
    throw new OddsApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      500
    );
  }
}

/**
 * Get list of available sports
 */
export async function getSports(): Promise<OddsApiSport[]> {
  return fetchOddsApi("/sports", z.array(OddsApiSportSchema));
}

/**
 * Get odds for a specific sport
 * 
 * @param sportKey - The sport key (e.g., 'basketball_nba', 'americanfootball_nfl')
 * @param regions - Comma-separated regions (e.g., 'us', 'uk', 'eu')
 * @param markets - Comma-separated markets (e.g., 'h2h,spreads,totals')
 * @param oddsFormat - Odds format ('american', 'decimal', 'fractional')
 */
export async function getOdds(
  sportKey: string,
  options: {
    regions?: string;
    markets?: string;
    oddsFormat?: "american" | "decimal" | "fractional";
    dateFormat?: "iso" | "unix";
  } = {}
): Promise<OddsApiEvent[]> {
  const {
    regions = "us",
    markets = "h2h,spreads,totals",
    oddsFormat = "american",
    dateFormat = "iso",
  } = options;

  const params = new URLSearchParams({
    regions,
    markets,
    oddsFormat,
    dateFormat,
  });

  return fetchOddsApi(
    `/sports/${sportKey}/odds?${params.toString()}`,
    z.array(OddsApiEventSchema)
  );
}

/**
 * Get in-play (live) odds for a specific sport
 */
export async function getLiveOdds(
  sportKey: string,
  options: {
    regions?: string;
    markets?: string;
    oddsFormat?: "american" | "decimal" | "fractional";
  } = {}
): Promise<OddsApiEvent[]> {
  const {
    regions = "us",
    markets = "h2h,spreads,totals",
    oddsFormat = "american",
  } = options;

  const params = new URLSearchParams({
    regions,
    markets,
    oddsFormat,
    dateFormat: "iso",
  });

  return fetchOddsApi(
    `/sports/${sportKey}/odds?${params.toString()}&daysFrom=0`,
    z.array(OddsApiEventSchema)
  );
}
