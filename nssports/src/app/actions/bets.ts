/**
 * Client-side bet actions (replaced server actions for static export)
 */
import { createBet, getAccount, updateBalance } from "@/lib/localDb";
import { loadSession } from "@/lib/clientAuth";
import type { LeagueID } from '@/types/game';

function getCurrentUserId(): string {
  const session = loadSession();
  return session?.user?.id || 'demo-user-id';
}

export async function placeSingleBetAction(data: {
  gameId: string;
  betType: string;
  selection: string;
  odds: number;
  line?: number | null;
  stake: number;
  potentialPayout: number;
  playerProp?: {
    playerId: string;
    playerName: string;
    statType: string;
    category: string;
  };
  gameProp?: {
    propType: string;
    description: string;
    marketCategory: string;
    periodID?: string;
  };
}) {
  const userId = getCurrentUserId();
  const account = getAccount(userId);
  if (!account || account.balance < data.stake) {
    return { success: false, error: 'Insufficient balance' };
  }
  updateBalance(userId, account.balance - data.stake);
  const bet = createBet({ userId, status: 'pending', ...data });
  return { success: true, data: bet };
}

export async function placeParlayBetAction(data: {
  legs: Array<{
    gameId: string;
    betType: string;
    selection: string;
    odds: number;
    line?: number | null;
    playerProp?: unknown;
    gameProp?: unknown;
  }>;
  stake: number;
  potentialPayout: number;
  odds: number;
}) {
  const userId = getCurrentUserId();
  const account = getAccount(userId);
  if (!account || account.balance < data.stake) {
    return { success: false, error: 'Insufficient balance' };
  }
  updateBalance(userId, account.balance - data.stake);
  const bet = createBet({
    userId,
    betType: 'parlay',
    selection: 'parlay',
    odds: data.odds,
    stake: data.stake,
    potentialPayout: data.potentialPayout,
    status: 'pending',
    legs: data.legs,
  });
  return { success: true, data: bet };
}

export async function placeBetsAction(data: {
  bets: Array<{
    gameId: string;
    betType: string;
    selection: string;
    odds: number;
    line?: number | null;
    stake: number;
    potentialPayout: number;
    playerProp?: unknown;
    gameProp?: unknown;
  }>;
  betType: string;
  totalStake: number;
  totalPayout: number;
  totalOdds: number;
}) {
  const userId = getCurrentUserId();
  const account = getAccount(userId);
  if (!account || account.balance < data.totalStake) {
    return { success: false, error: 'Insufficient balance' };
  }
  updateBalance(userId, account.balance - data.totalStake);
  const results = [];
  for (const betData of data.bets) {
    results.push(createBet({ userId, status: 'pending', ...betData }));
  }
  return { success: true, data: results };
}

export async function placeTeaserBetAction(data: {
  legs: Array<{
    gameId: string;
    betType: string;
    selection: string;
    odds: number;
    line?: number | null;
    playerProp?: unknown;
    gameProp?: unknown;
  }>;
  stake: number;
  potentialPayout: number;
  odds: number;
  teaserType: string;
  teaserMetadata?: {
    adjustedLines?: Record<string, number>;
    originalLines?: Record<string, number>;
    pointAdjustment?: number;
    pushRule?: string;
  };
}) {
  const userId = getCurrentUserId();
  const account = getAccount(userId);
  if (!account || account.balance < data.stake) {
    return { success: false, error: 'Insufficient balance' };
  }
  updateBalance(userId, account.balance - data.stake);
  const bet = createBet({
    userId,
    betType: 'teaser',
    selection: 'teaser',
    odds: data.odds,
    stake: data.stake,
    potentialPayout: data.potentialPayout,
    status: 'pending',
    teaserType: data.teaserType,
    teaserMetadata: data.teaserMetadata,
    legs: data.legs,
  });
  return { success: true, data: bet };
}

export type { LeagueID };
