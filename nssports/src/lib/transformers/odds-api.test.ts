import { describe, it, expect } from "@jest/globals";
import { transformOddsApiEvent, transformOddsApiEvents } from "./odds-api";
import type { OddsApiEvent } from "../the-odds-api";
import { GameSchema } from "../schemas/game";

describe("transformOddsApiEvent", () => {
  it("transforms NBA event to internal GamePayload format", () => {
    const mockEvent: OddsApiEvent = {
      id: "test-event-1",
      sport_key: "basketball_nba",
      sport_title: "NBA",
      commence_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      home_team: "Los Angeles Lakers",
      away_team: "Golden State Warriors",
      bookmakers: [
        {
          key: "draftkings",
          title: "DraftKings",
          last_update: new Date().toISOString(),
          markets: [
            {
              key: "h2h",
              last_update: new Date().toISOString(),
              outcomes: [
                { name: "Los Angeles Lakers", price: -150 },
                { name: "Golden State Warriors", price: 130 },
              ],
            },
            {
              key: "spreads",
              last_update: new Date().toISOString(),
              outcomes: [
                { name: "Los Angeles Lakers", price: -110, point: -2.5 },
                { name: "Golden State Warriors", price: -110, point: 2.5 },
              ],
            },
            {
              key: "totals",
              last_update: new Date().toISOString(),
              outcomes: [
                { name: "Over", price: -110, point: 225.5 },
                { name: "Under", price: -110, point: 225.5 },
              ],
            },
          ],
        },
      ],
    };

    const result = transformOddsApiEvent(mockEvent);

    expect(result).not.toBeNull();
    expect(result?.id).toBe("test-event-1");
    expect(result?.leagueId).toBe("nba");
    expect(result?.homeTeam.name).toBe("Los Angeles Lakers");
    expect(result?.awayTeam.name).toBe("Golden State Warriors");
    expect(result?.status).toBe("upcoming");

    // Validate odds structure
    expect(result?.odds.moneyline.home.odds).toBe(-150);
    expect(result?.odds.moneyline.away.odds).toBe(130);
    expect(result?.odds.spread.home.line).toBe(-2.5);
    expect(result?.odds.spread.away.line).toBe(2.5);
    expect(result?.odds.total.over?.line).toBe(225.5);
    expect(result?.odds.total.under?.line).toBe(225.5);

    // Validate against GameSchema
    if (result) {
      const parsed = GameSchema.parse(result);
      expect(parsed.id).toBe("test-event-1");
    }
  });

  it("returns null for unknown sport key", () => {
    const mockEvent: OddsApiEvent = {
      id: "test-event-2",
      sport_key: "unknown_sport",
      sport_title: "Unknown Sport",
      commence_time: new Date().toISOString(),
      home_team: "Team A",
      away_team: "Team B",
      bookmakers: [],
    };

    const result = transformOddsApiEvent(mockEvent);
    expect(result).toBeNull();
  });

  it("handles events with no bookmakers", () => {
    const mockEvent: OddsApiEvent = {
      id: "test-event-3",
      sport_key: "basketball_nba",
      sport_title: "NBA",
      commence_time: new Date().toISOString(),
      home_team: "Team A",
      away_team: "Team B",
      bookmakers: [],
    };

    const result = transformOddsApiEvent(mockEvent);

    expect(result).not.toBeNull();
    expect(result?.odds.moneyline.home.odds).toBe(0);
    expect(result?.odds.moneyline.away.odds).toBe(0);
  });
});

describe("transformOddsApiEvents", () => {
  it("transforms multiple events and filters out null results", () => {
    const mockEvents: OddsApiEvent[] = [
      {
        id: "event-1",
        sport_key: "basketball_nba",
        sport_title: "NBA",
        commence_time: new Date().toISOString(),
        home_team: "Team A",
        away_team: "Team B",
        bookmakers: [],
      },
      {
        id: "event-2",
        sport_key: "unknown_sport",
        sport_title: "Unknown",
        commence_time: new Date().toISOString(),
        home_team: "Team C",
        away_team: "Team D",
        bookmakers: [],
      },
      {
        id: "event-3",
        sport_key: "americanfootball_nfl",
        sport_title: "NFL",
        commence_time: new Date().toISOString(),
        home_team: "Team E",
        away_team: "Team F",
        bookmakers: [],
      },
    ];

    const result = transformOddsApiEvents(mockEvents);

    // Should have 2 valid events (NBA and NFL), filtered out the unknown sport
    expect(result.length).toBe(2);
    expect(result[0].leagueId).toBe("nba");
    expect(result[1].leagueId).toBe("nfl");
  });

  it("returns empty array for empty input", () => {
    const result = transformOddsApiEvents([]);
    expect(result).toEqual([]);
  });
});
