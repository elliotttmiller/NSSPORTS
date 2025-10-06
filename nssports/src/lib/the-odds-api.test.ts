/**
 * Integration tests for The Odds API service
 * 
 * Note: These tests mock the fetch API to avoid using real API quota
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getSports, getOdds, OddsApiError } from "./the-odds-api";

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe("The Odds API Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up mock API key
    process.env.THE_ODDS_API_KEY = "test-api-key";
  });

  describe("getSports", () => {
    it("fetches and validates sports data", async () => {
      const mockSports = [
        {
          key: "basketball_nba",
          group: "Basketball",
          title: "NBA",
          description: "US Basketball",
          active: true,
          has_outrights: false,
        },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSports,
      } as Response);

      const result = await getSports();

      expect(result).toEqual(mockSports);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/sports"),
        expect.any(Object)
      );
    });

    it("throws OddsApiError on HTTP error", async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => "Invalid API key",
      } as Response);

      await expect(getSports()).rejects.toThrow(OddsApiError);
    });
  });

  describe("getOdds", () => {
    it("fetches and validates odds data", async () => {
      const mockEvents = [
        {
          id: "test-event-1",
          sport_key: "basketball_nba",
          sport_title: "NBA",
          commence_time: new Date().toISOString(),
          home_team: "Los Angeles Lakers",
          away_team: "Golden State Warriors",
          bookmakers: [],
        },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents,
      } as Response);

      const result = await getOdds("basketball_nba");

      expect(result).toEqual(mockEvents);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/sports/basketball_nba/odds"),
        expect.any(Object)
      );
    });

    it("includes query parameters in request", async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      await getOdds("basketball_nba", {
        regions: "us,uk",
        markets: "h2h,spreads",
        oddsFormat: "decimal",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("regions=us%2Cuk"),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("markets=h2h%2Cspreads"),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("oddsFormat=decimal"),
        expect.any(Object)
      );
    });

    it("throws error when API key is missing", async () => {
      delete process.env.THE_ODDS_API_KEY;

      await expect(getSports()).rejects.toThrow("THE_ODDS_API_KEY is not configured");
    });

    it("throws OddsApiError on validation error", async () => {
      // Return invalid data that doesn't match schema
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ invalid: "data" }],
      } as Response);

      await expect(getOdds("basketball_nba")).rejects.toThrow(OddsApiError);
    });
  });
});
