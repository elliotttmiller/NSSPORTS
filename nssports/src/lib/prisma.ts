import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: ReturnType<typeof createPrismaClient> };

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Extend Prisma to automatically create PlayerTransaction records when bets are placed
function createPrismaClient() {
  return basePrisma.$extends({
    query: {
      bet: {
        async create({ args, query }) {
          const result = await query(args);
          
          // After bet is created, create transaction record for agent dashboard
          try {
            console.log('\n========== [TRANSACTION AUTO-CREATE] START ==========');
            logger.info('[TRANSACTION AUTO-CREATE] Bet created, finding user info', {
              betId: result.id,
              userId: result.userId,
              stake: result.stake,
              betType: result.betType
            });

            // Get user info with Account balance
            const user = await basePrisma.user.findUnique({
              where: { id: result.userId },
              select: {
                username: true,
                name: true,
                password: true,
                parentAgentId: true,
                account: {
                  select: { balance: true }
                }
              }
            });

            if (!user || !user.parentAgentId) {
              logger.warn('[TRANSACTION AUTO-CREATE] User not found or has no parent agent', {
                userId: result.userId
              });
              console.log('========== [TRANSACTION AUTO-CREATE] END ==========\n');
              return result;
            }

            logger.info('[TRANSACTION AUTO-CREATE] User found, looking for DashboardPlayer', {
              username: user.username,
              parentAgentId: user.parentAgentId
            });

            // Find or create DashboardPlayer
            let dashboardPlayer = await basePrisma.dashboardPlayer.findUnique({
              where: { username: user.username },
              select: { id: true }
            });

            if (!dashboardPlayer) {
              logger.info('[TRANSACTION AUTO-CREATE] Creating DashboardPlayer', {
                username: user.username
              });

              // Find the Agent record by looking up the parent agent's username
              let agentId: string | null = null;
              if (user.parentAgentId) {
                const parentAgent = await basePrisma.user.findUnique({
                  where: { id: user.parentAgentId },
                  select: { username: true }
                });

                if (parentAgent) {
                  const agent = await basePrisma.agent.findUnique({
                    where: { username: parentAgent.username },
                    select: { id: true }
                  });
                  agentId = agent?.id || null;
                  
                  logger.info('[TRANSACTION AUTO-CREATE] Found agent mapping', {
                    parentUserId: user.parentAgentId,
                    parentUsername: parentAgent.username,
                    agentId
                  });
                }
              }

              dashboardPlayer = await basePrisma.dashboardPlayer.create({
                data: {
                  username: user.username,
                  displayName: user.name || user.username,
                  password: user.password,
                  agentId, // Can be null if no matching agent found
                  balance: Number(user.account?.balance || 0),
                },
                select: { id: true }
              });

              logger.info('[TRANSACTION AUTO-CREATE] DashboardPlayer created', {
                dashboardPlayerId: dashboardPlayer.id,
                agentId
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
              }
            });

            logger.info('[TRANSACTION AUTO-CREATE] PlayerTransaction created', {
              transactionId: transaction.id,
              playerId: dashboardPlayer.id,
              amount: -Number(result.stake)
            });
            console.log('========== [TRANSACTION AUTO-CREATE] END ==========\n');

          } catch (error) {
            logger.error('[TRANSACTION AUTO-CREATE] Failed to create transaction', {
              error: error instanceof Error ? error.message : 'Unknown error',
              betId: result.id
            });
            console.log('========== [TRANSACTION AUTO-CREATE] END ==========\n');
          }

          return result;
        }
      }
    }
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
