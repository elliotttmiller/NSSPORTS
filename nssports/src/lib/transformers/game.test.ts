import { describe, it, expect } from 'vitest';
import { transformGame } from './game';
import { GameSchema } from '@/lib/schemas/game';

describe('transformGame', () => {
  it('produces a payload matching GameSchema', () => {
    const now = new Date();
    const game: any = {
      id: 'g1',
      leagueId: 'nba',
      startTime: now,
      status: 'upcoming',
      venue: null,
      homeScore: null,
      awayScore: null,
      period: null,
      timeRemaining: null,
      homeTeam: { id: 'h', name: 'Home', shortName: 'H', logo: '/h.svg', record: null },
      awayTeam: { id: 'a', name: 'Away', shortName: 'A', logo: '/a.svg', record: null },
      odds: [
        { betType: 'spread', selection: 'home', odds: -110, line: -2.5, lastUpdated: now },
        { betType: 'spread', selection: 'away', odds: -110, line: 2.5, lastUpdated: now },
        { betType: 'moneyline', selection: 'home', odds: -140, line: null, lastUpdated: now },
        { betType: 'moneyline', selection: 'away', odds: 120, line: null, lastUpdated: now },
        { betType: 'total', selection: 'over', odds: -110, line: 220.5, lastUpdated: now },
        { betType: 'total', selection: 'under', odds: -110, line: 220.5, lastUpdated: now },
      ],
    };

    const payload = transformGame(game);
    const parsed = GameSchema.parse(payload);
    expect(parsed.id).toBe('g1');
    expect(parsed.odds.spread.home.odds).toBeTypeOf('number');
  });
});
