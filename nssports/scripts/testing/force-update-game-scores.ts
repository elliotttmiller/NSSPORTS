import prisma from '../../src/lib/prisma';

async function forceUpdateGameScores() {
  try {
    const gameId = '2sAHQQpr4eWCyuWv3J5Y';
    
    console.log('\n🔧 Forcing game scores update for testing...\n');
    
    // Update the game with final scores
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'finished',
        homeScore: 118,  // Cleveland
        awayScore: 105,  // Memphis
        finishedAt: new Date()
      },
      include: {
        homeTeam: { select: { shortName: true } },
        awayTeam: { select: { shortName: true } }
      }
    });
    
    console.log('✅ Game updated:');
    console.log(`   ${updatedGame.awayTeam?.shortName} ${updatedGame.awayScore} @ ${updatedGame.homeTeam?.shortName} ${updatedGame.homeScore}`);
    console.log(`   Status: ${updatedGame.status}`);
    console.log(`   Finished: ${updatedGame.finishedAt}`);
    
    console.log('\n✅ Now refresh your bet history page - actualResult should display!');
    console.log('   Expected results:');
    console.log('   - Spread: "CLE won by 13"');
    console.log('   - Total: "Total: 223 (Under)"');
    console.log('   - Moneyline: "CLE won 118-105"');
    console.log('   - Player Prop: Will need player stats from SDK or mock\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceUpdateGameScores();
