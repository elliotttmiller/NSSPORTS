import { describe, it, expect } from '@jest/globals';
import { transformGame } from './game';
import { GameSchema } from '@/lib/schemas/game';
import type { GameWithRelations } from '@/lib/apiTypes';

describe('transformGame', () => {
  it('produces a payload matching GameSchema', () => {
    const now = new Date();
    const game: GameWithRelations = {
      id: 'g1',
      leagueId: 'NBA', // Official uppercase format per SportsGameOdds SDK
      homeTeamId: 'h',
      awayTeamId: 'a',
      startTime: now,
      status: 'upcoming',
      venue: null,
      homeScore: null,
      awayScore: null,
      period: null,
      timeRemaining: null,
      createdAt: now,
      updatedAt: now,
      homeTeam: { id: 'h', name: 'Home', leagueId: 'NBA', shortName: 'H', logo: '/h.svg', record: null },
      awayTeam: { id: 'a', name: 'Away', leagueId: 'NBA', shortName: 'A', logo: '/a.svg', record: null },
      odds: [
        { id: 'o1', gameId: 'g1', betType: 'spread', selection: 'home', odds: -110, line: -2.5, lastUpdated: now },
        { id: 'o2', gameId: 'g1', betType: 'spread', selection: 'away', odds: -110, line: 2.5, lastUpdated: now },
        { id: 'o3', gameId: 'g1', betType: 'moneyline', selection: 'home', odds: -140, line: null, lastUpdated: now },
        { id: 'o4', gameId: 'g1', betType: 'moneyline', selection: 'away', odds: 120, line: null, lastUpdated: now },
        { id: 'o5', gameId: 'g1', betType: 'total', selection: 'over', odds: -110, line: 220.5, lastUpdated: now },
        { id: 'o6', gameId: 'g1', betType: 'total', selection: 'under', odds: -110, line: 220.5, lastUpdated: now },
      ],
    };

    const payload = transformGame(game);
    const parsed = GameSchema.parse(payload);
    expect(parsed.id).toBe('g1');
    expect(typeof parsed.odds.spread.home.odds).toBe('number');
  });
});
