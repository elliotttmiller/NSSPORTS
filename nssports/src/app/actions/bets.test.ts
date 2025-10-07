import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { placeSingleBetAction, placeParlayBetAction } from './bets';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    game: {
      findUnique: jest.fn(),
    },
    bet: {
      create: jest.fn(),
    },
  },
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

describe('placeSingleBetAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully place a single bet', async () => {
    // Mock authenticated user
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue({
      user: { id: 'user123' },
    } as any);

    // Mock game lookup
    (prisma.game.findUnique as jest.Mock).mockResolvedValue({
      id: 'game123',
      status: 'upcoming',
    });

    // Mock bet creation
    (prisma.bet.create as jest.Mock).mockResolvedValue({
      id: 'bet123',
      gameId: 'game123',
      betType: 'spread',
      selection: 'home',
      odds: -110,
      line: -2.5,
      stake: 10,
      potentialPayout: 19.09,
      status: 'pending',
      placedAt: new Date(),
      userId: 'user123',
    });

    const result = await placeSingleBetAction({
      gameId: 'game123',
      betType: 'spread',
      selection: 'home',
      odds: -110,
      line: -2.5,
      stake: 10,
      potentialPayout: 19.09,
    });

    expect(result.success).toBe(true);
    expect(result.betIds).toEqual(['bet123']);
    expect(prisma.bet.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gameId: 'game123',
        betType: 'spread',
        selection: 'home',
        odds: -110,
        line: -2.5,
        stake: 10,
        potentialPayout: 19.09,
        status: 'pending',
        userId: 'user123',
      }),
    });
  });

  it('should fail when user is not authenticated', async () => {
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue(null);

    const result = await placeSingleBetAction({
      gameId: 'game123',
      betType: 'spread',
      selection: 'home',
      odds: -110,
      line: -2.5,
      stake: 10,
      potentialPayout: 19.09,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to place bets');
  });

  it('should fail when validation fails (negative stake)', async () => {
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue({
      user: { id: 'user123' },
    } as any);

    const result = await placeSingleBetAction({
      gameId: 'game123',
      betType: 'spread',
      selection: 'home',
      odds: -110,
      line: -2.5,
      stake: -10, // Invalid: negative stake
      potentialPayout: 19.09,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid bet data');
  });

  it('should fail when validation fails (zero stake)', async () => {
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue({
      user: { id: 'user123' },
    } as any);

    const result = await placeSingleBetAction({
      gameId: 'game123',
      betType: 'spread',
      selection: 'home',
      odds: -110,
      line: -2.5,
      stake: 0, // Invalid: zero stake
      potentialPayout: 19.09,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid bet data');
  });

  it('should fail when game is not found', async () => {
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue({
      user: { id: 'user123' },
    } as any);

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await placeSingleBetAction({
      gameId: 'nonexistent-game',
      betType: 'spread',
      selection: 'home',
      odds: -110,
      line: -2.5,
      stake: 10,
      potentialPayout: 19.09,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Game not found');
  });

  it('should fail when game is finished', async () => {
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue({
      user: { id: 'user123' },
    } as any);

    (prisma.game.findUnique as jest.Mock).mockResolvedValue({
      id: 'game123',
      status: 'finished',
    });

    const result = await placeSingleBetAction({
      gameId: 'game123',
      betType: 'spread',
      selection: 'home',
      odds: -110,
      line: -2.5,
      stake: 10,
      potentialPayout: 19.09,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot place bet on finished game');
  });

  it('should handle float odds by rounding to integer', async () => {
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue({
      user: { id: 'user123' },
    } as any);

    (prisma.game.findUnique as jest.Mock).mockResolvedValue({
      id: 'game123',
      status: 'upcoming',
    });

    (prisma.bet.create as jest.Mock).mockResolvedValue({
      id: 'bet123',
      gameId: 'game123',
      betType: 'spread',
      selection: 'home',
      odds: -110,
      line: -2.5,
      stake: 10,
      potentialPayout: 19.09,
      status: 'pending',
      placedAt: new Date(),
      userId: 'user123',
    });

    const result = await placeSingleBetAction({
      gameId: 'game123',
      betType: 'spread',
      selection: 'home',
      odds: -110.7, // Float odds should be rounded
      line: -2.5,
      stake: 10,
      potentialPayout: 19.09,
    });

    expect(result.success).toBe(true);
    expect(prisma.bet.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        odds: -111, // Should be rounded
      }),
    });
  });
});
