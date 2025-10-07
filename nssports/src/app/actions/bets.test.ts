import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { placeSingleBetAction } from './bets';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Mock dependencies with explicit types to satisfy TS
jest.mock('@/lib/auth', () => {
  const auth = jest.fn();
  return { auth };
});

type GameLite = { id: string; status: 'upcoming' | 'live' | 'finished' };
jest.mock('@/lib/prisma', () => {
  const game = { findUnique: jest.fn() };
  const bet = { create: jest.fn() };
  return { __esModule: true, default: { game, bet } };
});

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

type AuthResult = Awaited<ReturnType<typeof auth>>;
const authMock = auth as unknown as jest.MockedFunction<() => Promise<AuthResult>>;
const prismaMock = prisma as unknown as {
  game: { findUnique: jest.MockedFunction<(args: unknown) => Promise<GameLite | null>> };
  bet: { create: jest.MockedFunction<(args: unknown) => Promise<{
    id: string;
    gameId: string | null;
    betType: string;
    selection: string;
    odds: number;
    line: number | null;
    stake: number;
    potentialPayout: number;
    status: string;
    placedAt: Date;
    userId: string;
  }>> };
};

describe('placeSingleBetAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully place a single bet', async () => {
  authMock.mockResolvedValue({ user: { id: 'user123' } } as unknown as AuthResult);
  prismaMock.game.findUnique.mockResolvedValue({ id: 'game123', status: 'upcoming' });
  prismaMock.bet.create.mockResolvedValue({
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
    expect(prismaMock.bet.create).toHaveBeenCalled();
  });

  it('should fail when user is not authenticated', async () => {
  authMock.mockResolvedValue(null as unknown as AuthResult);

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
  authMock.mockResolvedValue({ user: { id: 'user123' } } as unknown as AuthResult);

    const result = await placeSingleBetAction({
      gameId: 'game123',
      betType: 'spread',
      selection: 'home',
      odds: -110,
      line: -2.5,
      stake: -10,
      potentialPayout: 19.09,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid bet data');
  });

  it('should fail when validation fails (zero stake)', async () => {
  authMock.mockResolvedValue({ user: { id: 'user123' } } as unknown as AuthResult);

    const result = await placeSingleBetAction({
      gameId: 'game123',
      betType: 'spread',
      selection: 'home',
      odds: -110,
      line: -2.5,
      stake: 0,
      potentialPayout: 19.09,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid bet data');
  });

  it('should fail when game is not found', async () => {
  authMock.mockResolvedValue({ user: { id: 'user123' } } as unknown as AuthResult);
  prismaMock.game.findUnique.mockResolvedValue(null);

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
  authMock.mockResolvedValue({ user: { id: 'user123' } } as unknown as AuthResult);
  prismaMock.game.findUnique.mockResolvedValue({ id: 'game123', status: 'finished' });

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
  authMock.mockResolvedValue({ user: { id: 'user123' } } as unknown as AuthResult);
  prismaMock.game.findUnique.mockResolvedValue({ id: 'game123', status: 'upcoming' });
  prismaMock.bet.create.mockResolvedValue({
      id: 'bet123',
      gameId: 'game123',
      betType: 'spread',
      selection: 'home',
      odds: -111,
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
      odds: -110.7,
      line: -2.5,
      stake: 10,
      potentialPayout: 19.09,
    });

    expect(result.success).toBe(true);
    expect(prismaMock.bet.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ odds: -111 }),
    });
  });
});
