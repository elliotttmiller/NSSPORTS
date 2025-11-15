#!/usr/bin/env tsx
/*
 Debug script: fetch bets for a specific user and print key fields
 Usage: npx tsx scripts/debug_fetch_bets.ts <userId>
 If no userId provided, defaults to the 'slime' test user id used in previous tests.
*/
import { PrismaClient } from '@prisma/client';

const DEFAULT_USER = 'cmhqcyxgp0009v8zwpz6ykpfh';

async function main() {
  const userId = process.argv[2] || DEFAULT_USER;
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log(`Fetching bets for user: ${userId}`);
    const bets = await prisma.bet.findMany({
      where: { userId },
      orderBy: { placedAt: 'desc' },
      take: 50,
      include: { game: true },
    });

    if (!bets.length) {
      console.log('No bets found for user.');
      return;
    }

    for (const b of bets) {
      console.log('---');
      console.log('id:', b.id);
      console.log('type:', b.betType, 'status:', b.status, 'selection:', b.selection, 'line:', b.line, 'odds:', b.odds);
  console.log('stake:', b.stake, 'potentialPayout:', b.potentialPayout);
  console.log('actualResult (computed by API, not persisted on Bet):', '(compute via API or check settlement logs)');
      console.log('gameId:', b.gameId);
      if (b.game) {
        console.log(' game.status:', b.game.status, 'homeScore:', b.game.homeScore, 'awayScore:', b.game.awayScore);
      }
  console.log('placedAt:', b.placedAt?.toISOString(), 'settledAt:', b.settledAt?.toISOString());
    }

  } catch (err: unknown) {
    console.error('Error fetching bets:', err);
  } finally {
    try { await prisma.$disconnect(); } catch {};
  }
}

void main();
