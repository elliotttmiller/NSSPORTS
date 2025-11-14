import { prisma } from './src/lib/prisma';

async function test() {
  try {
    console.log('Testing database connection...');
    const count = await prisma.game.count();
    console.log(`✅ Database connected! Found ${count} games`);
    
    console.log('\nTesting finished games...');
    const finishedGames = await prisma.game.findMany({
      where: { status: 'finished' },
      take: 5,
      select: { id: true, homeTeam: true, awayTeam: true, status: true }
    });
    console.log(`✅ Found ${finishedGames.length} finished games`);
    console.log(finishedGames);
    
    console.log('\nTesting pending bets...');
    const pendingBets = await prisma.bet.count({
      where: { status: 'pending' }
    });
    console.log(`✅ Found ${pendingBets} pending bets`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

test();
