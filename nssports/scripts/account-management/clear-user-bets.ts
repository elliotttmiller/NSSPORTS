import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearUserBets() {
  try {
    // Find user 'slime'
    const user = await prisma.user.findUnique({
      where: { username: 'slime' },
      select: { id: true, username: true }
    });

    if (!user) {
      console.log('❌ User "slime" not found');
      process.exit(1);
    }

    console.log(`Found user: ${user.username} (${user.id})\n`);

    // Count existing bets
    const existingBets = await prisma.bet.count({
      where: { userId: user.id }
    });

    console.log(`📊 Current bet count: ${existingBets}`);

    if (existingBets === 0) {
      console.log('✅ No bets to delete - user already has clean slate');
      process.exit(0);
    }

    // Get bet breakdown
    const betsByStatus = await prisma.bet.groupBy({
      by: ['status'],
      where: { userId: user.id },
      _count: true,
    });

    console.log('\n📋 Bets by status:');
    betsByStatus.forEach(group => {
      console.log(`  ${group.status}: ${group._count}`);
    });

    // Delete all bets for this user
    console.log('\n🗑️  Deleting all bets...');
    
    const result = await prisma.bet.deleteMany({
      where: { userId: user.id }
    });

    console.log(`✅ Successfully deleted ${result.count} bets for user "${user.username}"`);
    console.log('\n🎉 User now has a clean slate for testing new settlement workflow!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearUserBets();
