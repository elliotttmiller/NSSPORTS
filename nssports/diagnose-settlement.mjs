import 'dotenv/config';
import prisma from './src/lib/prisma';
import { logger } from './src/lib/logger';

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!DATABASE_URL) {
  logger.error('DATABASE_URL (or DIRECT_URL) is required to run this diagnostic script.');
  process.exit(1);
}

async function diagnoseBets() {
  logger.info('=== BET SETTLEMENT DIAGNOSIS ===');

  try {
    // Check for user 'slime'
    const slimeUser = await prisma.user.findUnique({
      where: { username: 'slime' },
      select: { id: true, username: true, userType: true }
    });

    if (!slimeUser) {
      logger.error('❌ User "slime" not found');
      return;
    }

    logger.info('✅ Found user', { slimeUser });

    // Check all bets for slime
    const allBets = await prisma.bet.findMany({
      where: { userId: slimeUser.id },
      include: {
        game: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            status: true,
            homeScore: true,
            awayScore: true,
            startTime: true
          }
        }
      },
      orderBy: { placedAt: 'desc' }
    });

    logger.info(`📊 Total bets for slime: ${allBets.length}`);

    // Group by status
    const byStatus = {
      pending: allBets.filter(b => b.status === 'pending'),
      won: allBets.filter(b => b.status === 'won'),
      lost: allBets.filter(b => b.status === 'lost'),
      push: allBets.filter(b => b.status === 'push')
    };

    logger.info('Bets by status:');
    logger.info(`  Pending: ${byStatus.pending.length}`);
    logger.info(`  Won: ${byStatus.won.length}`);
    logger.info(`  Lost: ${byStatus.lost.length}`);
    logger.info(`  Push: ${byStatus.push.length}`);

    // Check pending bets on finished games
    const pendingOnFinished = byStatus.pending.filter(b => b.game?.status === 'finished');
    
    logger.warn(`⚠️  Pending bets on FINISHED games: ${pendingOnFinished.length}`);
    
    if (pendingOnFinished.length > 0) {
      logger.info('These bets should have been settled:');
      pendingOnFinished.forEach(bet => {
        logger.info('\n  Bet ID: ' + bet.id);
        logger.info('  Type: ' + bet.betType);
        logger.info('  Selection: ' + bet.selection);
        logger.info('  Game: ' + (bet.game?.awayTeam || '') + ' @ ' + (bet.game?.homeTeam || ''));
        logger.info('  Score: ' + (bet.game?.awayScore ?? '') + ' - ' + (bet.game?.homeScore ?? ''));
        logger.info('  Game Status: ' + (bet.game?.status || ''));
        logger.info('  Bet Status: ' + bet.status);
        logger.info('  Placed: ' + bet.placedAt);
      });
    }

    // Check all finished games
    const finishedGames = await prisma.game.findMany({
      where: { status: 'finished' },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true,
        _count: {
          select: { bets: true }
        }
      }
    });

    logger.info(`\n🏁 Total finished games: ${finishedGames.length}`);
    logger.info(`   Games with bets: ${finishedGames.filter(g => g._count.bets > 0).length}`);

    // Check settlement scheduler logs
    logger.info('\n\n=== SETTLEMENT SYSTEM STATUS ===');
    logger.info('Has the settlement scheduler been run?');
    logger.info('  Command: npm run settlement:once');
    logger.info('  Or: npm run settlement:scheduler');
    logger.info('\nIf not, run: npm run settlement:once');

  } catch (error) {
    logger.error('Error during settlement diagnosis', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseBets().catch(err => {
  logger.error('Unhandled error in diagnoseBets', err);
  process.exit(1);
});
