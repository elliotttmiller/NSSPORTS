#!/usr/bin/env tsx
/*
 Quick DB connectivity check using Prisma Client (TypeScript)
 Usage: npx tsx scripts/check_db.ts
*/
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    console.log('Prisma Client initializing...');
    await prisma.$connect();
    console.log('Prisma connected. Running test query...');

    // Sanity query
    const raw: any = await prisma.$queryRaw`SELECT 1 as ok`;
    console.log('Query result:', raw);

    // Try reading one row from a known table if present
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - schema may vary in CI/dev so guard with try/catch
      const games = await prisma.game.findMany({ take: 1 });
      console.log('Sample game row:', games.length ? games[0] : 'no rows');
    } catch (readErr: any) {
      console.log('Could not read `game` table (maybe different schema):', readErr?.message ?? readErr);
    }

    console.log('DB connectivity check passed.');
  } catch (err: any) {
    console.error('DB connectivity check failed:', err?.message ?? err);
    process.exitCode = 2;
  } finally {
    try {
      await prisma.$disconnect();
    } catch {}
  }
}

void main();
