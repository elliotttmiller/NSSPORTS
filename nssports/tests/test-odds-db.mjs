import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get one game with all its odds
  const game = await prisma.games.findFirst({
    include: {
      odds: true,
      homeTeam: true,
      awayTeam: true
    }
  });

  console.log('\n=== GAME FROM DATABASE ===');
  console.log('Game ID:', game.id);
  console.log('Teams:', game.awayTeam.name, '@', game.homeTeam.name);
  console.log('Start Time:', game.startTime);
  console.log('\n=== ODDS RECORDS ===');
  console.log('Total odds records:', game.odds.length);
  
  if (game.odds.length > 0) {
    console.log('\nSample odds:');
    game.odds.slice(0, 10).forEach(odd => {
      console.log({
        betType: odd.betType,
        selection: odd.selection,
        odds: odd.odds,
        line: odd.line
      });
    });
  } else {
    console.log('NO ODDS STORED IN DATABASE!');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
