import 'dotenv/config';
import prisma from '../../src/lib/prisma';
import { logger } from '../../src/lib/logger';

async function clearUserBets() {
  try {
    // Find user 'slime'
    const user = await prisma.user.findUnique({
      where: { username: 'slime' },
      select: { id: true, username: true }
    });

    if (!user) {
      logger.error('❌ User "slime" not found');
      process.exit(1);
    }

    logger.info(`Found user: ${user.username} (${user.id})\n`);

    // Count existing bets
    const existingBets = await prisma.bet.count({
      where: { userId: user.id }
    });

  logger.info(`📊 Current bet count: ${existingBets}`);

    if (existingBets === 0) {
      logger.info('✅ No bets to delete - user already has clean slate');
      process.exit(0);
    }

    // Get bet breakdown
    const betsByStatus = await prisma.bet.groupBy({
      by: ['status'],
      where: { userId: user.id },
      _count: true,
    });

    logger.info('\n📋 Bets by status:');
    betsByStatus.forEach(group => {
      logger.info(`  ${group.status}: ${group._count}`);
    });

    // Delete all bets for this user
  logger.info('\n🗑️  Deleting all bets...');
    
    const result = await prisma.bet.deleteMany({
      where: { userId: user.id }
    });

  logger.info(`✅ Successfully deleted ${result.count} bets for user "${user.username}"`);
  logger.info('\n🎉 User now has a clean slate for testing new settlement workflow!');

  } catch (error) {
    logger.error('❌ Error:', error as Error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearUserBets();
