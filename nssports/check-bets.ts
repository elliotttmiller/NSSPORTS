import prisma from "./src/lib/prisma";

async function checkBets() {
  console.log("Checking settled bets in database...\n");
  
  const settledBets = await prisma.bet.findMany({
    where: {
      status: {
        not: 'pending'
      }
    },
    include: {
      game: {
        include: {
          homeTeam: true,
          awayTeam: true,
        }
      }
    },
    take: 5,
    orderBy: {
      settledAt: 'desc'
    }
  });

  console.log(`Found ${settledBets.length} settled bets:\n`);
  
  settledBets.forEach((bet, i) => {
    console.log(`${i + 1}. Bet ID: ${bet.id}`);
    console.log(`   Type: ${bet.betType}`);
    console.log(`   Status: ${bet.status}`);
    console.log(`   Selection: ${bet.selection}`);
    console.log(`   Line: ${bet.line}`);
    if (bet.game) {
      console.log(`   Game: ${bet.game.awayTeam?.shortName || 'Away'} @ ${bet.game.homeTeam?.shortName || 'Home'}`);
      console.log(`   Score: ${bet.game.awayScore} - ${bet.game.homeScore}`);
      console.log(`   Game Status: ${bet.game.status}`);
    }
    console.log('');
  });

  await prisma.$disconnect();
}

checkBets().catch(console.error);
