#!/usr/bin/env node
/**
 * Diagnostic helper for unsettled bets / settlement pipeline
 *
 * Usage (from nssports/ workspace):
 *   npx tsx src/scripts/diagnose-settlement.ts --username slimes --home TOR --away IND
 *
 * The script will:
 * - Lookup the user by username
 * - List recent bets for that user (status and gameId)
 * - For each referenced gameId, print the game status and scores
 * - Optionally try to find a game between two teams (home/away shortName)
 *
 * This is safe read-only diagnostics and requires DATABASE_URL to be set in env.
 */

import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

type Args = {
  username?: string;
  home?: string;
  away?: string;
  lookbackHours?: string;
};

function parseArgs(): Args {
  const args: Args = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (a === '--username' && raw[i + 1]) {
      args.username = raw[i + 1];
      i++;
    } else if (a === '--home' && raw[i + 1]) {
      args.home = raw[i + 1];
      i++;
    } else if (a === '--away' && raw[i + 1]) {
      args.away = raw[i + 1];
      i++;
    } else if (a === '--lookback' && raw[i + 1]) {
      args.lookbackHours = raw[i + 1];
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();

  if (!args.username && !(args.home && args.away)) {
    logger.error('Please pass at least --username or both --home and --away');
    process.exit(2);
  }

  logger.info('Starting settlement diagnostic...');

  try {
    if (args.username) {
      const user = await prisma.user.findUnique({ where: { username: args.username } });
      if (!user) {
        logger.info(`User not found: ${args.username}`);
      } else {
        logger.info(`Found user: ${user.id} (${user.username})`);

        const bets: { id: string; betType: string; gameId: string | null; status: string; stake: number; potentialPayout: number; placedAt: Date; settledAt: Date | null }[] = await prisma.bet.findMany({
          where: { userId: user.id },
          orderBy: { placedAt: 'desc' },
          take: 50,
          select: {
            id: true,
            betType: true,
            gameId: true,
            status: true,
            stake: true,
            potentialPayout: true,
            placedAt: true,
            settledAt: true,
          }
        });

        logger.info(`Recent bets for ${args.username}: (${bets.length})`);
        for (const b of bets) {
          logger.debug(`Bet: ${b.id} | type=${b.betType} | game=${b.gameId || 'N/A'} | status=${b.status} | stake=${b.stake} | placedAt=${b.placedAt} | settledAt=${b.settledAt || 'N/A'}`);
        }

        // Gather referenced gameIds
        const gameIds = Array.from(new Set(bets.map(b => b.gameId).filter(Boolean) as string[]));
        if (gameIds.length > 0) {
          logger.info('Looking up referenced games...');
          const games = await prisma.game.findMany({
            where: { id: { in: gameIds } },
            select: { id: true, status: true, homeScore: true, awayScore: true, homeTeamId: true, awayTeamId: true, startTime: true }
          });

          for (const g of games) {
            logger.debug(`Game: ${g.id} | status=${g.status} | scores=${g.homeScore ?? 'null'}-${g.awayScore ?? 'null'} | start=${g.startTime.toISOString()}`);
            const home = await prisma.team.findUnique({ where: { id: g.homeTeamId }, select: { shortName: true, name: true } });
            const away = await prisma.team.findUnique({ where: { id: g.awayTeamId }, select: { shortName: true, name: true } });
            logger.debug(`  teams: ${home?.shortName || home?.name || 'home?'} vs ${away?.shortName || away?.name || 'away?'}`);
          }
        }
      }
    }

    if (args.home && args.away) {
      const lookback = Number(args.lookbackHours ?? '24');
      const since = new Date(Date.now() - lookback * 60 * 60 * 1000);
  logger.info(`Searching for games between ${args.home} and ${args.away} since ${since.toISOString()}...`);

      // Find teams
      const homeTeam = await prisma.team.findFirst({ where: { OR: [{ shortName: args.home }, { name: { contains: args.home, mode: 'insensitive' } }] } });
      const awayTeam = await prisma.team.findFirst({ where: { OR: [{ shortName: args.away }, { name: { contains: args.away, mode: 'insensitive' } }] } });

      if (!homeTeam || !awayTeam) {
        logger.info('Could not find matching team records for the provided short names.', { homeTeam: !!homeTeam, awayTeam: !!awayTeam });
      } else {
        logger.info(`Found teams: home=${homeTeam.id} (${homeTeam.shortName}) away=${awayTeam.id} (${awayTeam.shortName})`);

        const games = await prisma.game.findMany({
          where: {
            AND: [
              { homeTeamId: homeTeam.id },
              { awayTeamId: awayTeam.id },
              { startTime: { gte: since } }
            ]
          },
          orderBy: { startTime: 'desc' },
          take: 10,
        });

        logger.info(`Found ${games.length} recent games between these teams:`);
        for (const g of games) {
          logger.debug(`Game: ${g.id} | status=${g.status} | scores=${g.homeScore ?? 'null'}-${g.awayScore ?? 'null'} | start=${g.startTime.toISOString()}`);
          const pendingCount = await prisma.bet.count({ where: { gameId: g.id, status: 'pending' } });
          logger.debug(`  pending bets: ${pendingCount}`);
        }
      }
    }
    logger.info('Diagnostic complete.');
  } catch (error) {
    logger.error('Diagnostic failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
