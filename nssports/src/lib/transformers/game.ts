import type { GameWithRelations, OddsMap } from "@/lib/apiTypes";
import type { GamePayload } from "@/lib/schemas/game";

// Type for odds entry
type OddsEntry = {
  odds: number;
  line?: number | null;
  lastUpdated: Date;
};

// Build helper that ensures odds objects always exist with sane defaults
const build = (
  group: Record<string, OddsEntry> | undefined,
  key: string
): OddsEntry => (group && group[key]) ? group[key] : { odds: 0, line: undefined, lastUpdated: new Date(0) };

/**
 * Transform a Prisma Game with relations into the API/GameSchema shape
 * Pure and unit-testable.
 */
export function transformGame(game: GameWithRelations): GamePayload {
  const oddsMap: OddsMap = game.odds.reduce((acc: OddsMap, odd) => {
    if (!acc[odd.betType]) acc[odd.betType] = {} as Record<string, OddsEntry>;
    (acc[odd.betType] as Record<string, OddsEntry>)[odd.selection || odd.betType] = {
      odds: odd.odds,
      line: odd.line,
      lastUpdated: odd.lastUpdated,
    };
    return acc;
  }, {} as OddsMap);

  const spreadGroup = oddsMap.spread as Record<string, OddsEntry> | undefined;
  const moneylineGroup = oddsMap.moneyline as Record<string, OddsEntry> | undefined;
  const totalGroup = oddsMap.total as Record<string, OddsEntry> | undefined;

  return {
    id: game.id,
    leagueId: game.leagueId,
    homeTeam: {
      id: game.homeTeam.id,
      name: game.homeTeam.name,
      shortName: game.homeTeam.shortName,
      logo: game.homeTeam.logo,
      record: game.homeTeam.record ?? null,
    },
    awayTeam: {
      id: game.awayTeam.id,
      name: game.awayTeam.name,
      shortName: game.awayTeam.shortName,
      logo: game.awayTeam.logo,
      record: game.awayTeam.record ?? null,
    },
    startTime: game.startTime,
    status: game.status as GamePayload["status"],
    venue: game.venue ?? null,
    homeScore: game.homeScore ?? null,
    awayScore: game.awayScore ?? null,
    period: game.period ?? null,
    timeRemaining: game.timeRemaining ?? null,
    odds: {
      spread: {
        home: build(spreadGroup, 'home'),
        away: build(spreadGroup, 'away'),
      },
      moneyline: {
        home: build(moneylineGroup, 'home'),
        away: build(moneylineGroup, 'away'),
      },
      total: {
        home: build(totalGroup, 'over'),
        away: build(totalGroup, 'under'),
        over: build(totalGroup, 'over'),
        under: build(totalGroup, 'under'),
      },
    },
  };
}

export default transformGame;
