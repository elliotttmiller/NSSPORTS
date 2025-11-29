/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Load and validate database URL (allow DIRECT_URL as a fallback for migrations)
const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL (or DIRECT_URL) environment variable is required but not set');
}

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Add connection retry logic
basePrisma.$connect().catch((err: unknown) => {
  logger.error('Initial Prisma connection failed', err);
});

// Create Prisma client and add middleware to automatically create PlayerTransaction records when bets are placed
function createPrismaClient() {
  // Middleware intercepts create on Bet model, runs the create, then performs post-processing.
  basePrisma.$use(async (params: any, next: (params: any) => Promise<any>) => {
    if (params.model === 'Bet' && params.action === 'create') {
      // Perform the original create
      const result = await next(params);

      // After bet is created, create transaction record for agent dashboard
      try {
        logger.debug('[TRANSACTION AUTO-CREATE] Bet created, finding user info', {
          betId: result.id,
          userId: result.userId,
          stake: result.stake,
          betType: result.betType,
        });

        // Get user info with Account balance
        const user = await basePrisma.user.findUnique({
          where: { id: result.userId },
          select: {
            username: true,
            name: true,
            password: true,
            parentAgentId: true,
            account: { select: { balance: true } },
          },
        });

        if (!user || !user.parentAgentId) {
          logger.debug('[TRANSACTION AUTO-CREATE] User not found or has no parent agent', {
            userId: result.userId,
          });
          return result;
        }

        logger.info('[TRANSACTION AUTO-CREATE] User found, looking for DashboardPlayer', {
          username: user.username,
          parentAgentId: user.parentAgentId,
        });

        // Find or create DashboardPlayer
        let dashboardPlayer = await basePrisma.dashboardPlayer.findUnique({
          where: { username: user.username },
          select: { id: true },
        });

        if (!dashboardPlayer) {
          logger.info('[TRANSACTION AUTO-CREATE] Creating DashboardPlayer', {
            username: user.username,
          });

          // Find the Agent record by looking up the parent agent's username
          let agentId: string | null = null;
          if (user.parentAgentId) {
            const parentAgent = await basePrisma.user.findUnique({
              where: { id: user.parentAgentId },
              select: { username: true },
            });

            if (parentAgent) {
              const agent = await basePrisma.agent.findUnique({
                where: { username: parentAgent.username },
                select: { id: true },
              });
              agentId = agent?.id || null;

              logger.info('[TRANSACTION AUTO-CREATE] Found agent mapping', {
                parentUserId: user.parentAgentId,
                parentUsername: parentAgent.username,
                agentId,
              });
            }
          }

          dashboardPlayer = await basePrisma.dashboardPlayer.create({
            data: {
              username: user.username,
              displayName: user.name || user.username,
              password: user.password,
              agentId,
              balance: Number(user.account?.balance || 0),
            },
            select: { id: true },
          });

          logger.info('[TRANSACTION AUTO-CREATE] DashboardPlayer created', {
            dashboardPlayerId: dashboardPlayer.id,
            agentId,
          });
        }

        // Create PlayerTransaction
        const transaction = await basePrisma.playerTransaction.create({
          data: {
            playerId: dashboardPlayer.id,
            type: 'bet_placed',
            amount: -Number(result.stake),
            balanceBefore: Number(user.account?.balance || 0) + Number(result.stake),
            balanceAfter: Number(user.account?.balance || 0),
            reason: `Bet placed: ${result.betType === 'parlay' ? 'Parlay' : result.betType}`,
          },
        });

        logger.debug('[TRANSACTION AUTO-CREATE] PlayerTransaction created', {
          transactionId: transaction.id,
          playerId: dashboardPlayer.id,
          amount: -Number(result.stake),
        });
      } catch (error) {
        logger.error('[TRANSACTION AUTO-CREATE] Failed to create transaction', {
          error: error instanceof Error ? error.message : 'Unknown error',
          betId: result.id,
        });
      }

      return result;
    }

    return next(params);
  });

  return basePrisma;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
