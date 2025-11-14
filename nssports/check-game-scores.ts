import { prisma } from './src/lib/prisma';

async function checkGame() {
  try {
    const game = await prisma.game.findUnique({
      where: { id: 'yns3eOasN7aV5euaRRTk' },
      include: {
        bets: {
          where: { status: 'pending' }
        }
      }
    });
    
    console.log('\n========================================');
    console.log('Game Details:');
    console.log('========================================\n');
    console.log('ID:', game?.id);
    console.log('Status:', game?.status);
    console.log('Home Team ID:', game?.homeTeamId);
    console.log('Away Team ID:', game?.awayTeamId);
    console.log('Home Score:', game?.homeScore);
    console.log('Away Score:', game?.awayScore);
    console.log('Start Time:', game?.startTime);
    console.log('\nPending Bets:', game?.bets.length);
    console.log('\n========================================\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGame();
