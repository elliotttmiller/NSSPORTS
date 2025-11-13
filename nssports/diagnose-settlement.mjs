import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseBets() {
  console.log('=== BET SETTLEMENT DIAGNOSIS ===\n');

  // Check for user 'slime'
  const slimeUser = await prisma.user.findUnique({
    where: { username: 'slime' },
    select: { id: true, username: true, userType: true }
  });

  if (!slimeUser) {
    console.log('❌ User "slime" not found');
    return;
  }

  console.log('✅ Found user:', slimeUser);

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

  console.log(`\n📊 Total bets for slime: ${allBets.length}`);

  // Group by status
  const byStatus = {
    pending: allBets.filter(b => b.status === 'pending'),
    won: allBets.filter(b => b.status === 'won'),
    lost: allBets.filter(b => b.status === 'lost'),
    push: allBets.filter(b => b.status === 'push')
  };

  console.log('\nBets by status:');
  console.log(`  Pending: ${byStatus.pending.length}`);
  console.log(`  Won: ${byStatus.won.length}`);
  console.log(`  Lost: ${byStatus.lost.length}`);
  console.log(`  Push: ${byStatus.push.length}`);

  // Check pending bets on finished games
  const pendingOnFinished = byStatus.pending.filter(b => b.game?.status === 'finished');
  
  console.log(`\n⚠️  Pending bets on FINISHED games: ${pendingOnFinished.length}`);
  
  if (pendingOnFinished.length > 0) {
    console.log('\nThese bets should have been settled:');
    pendingOnFinished.forEach(bet => {
      console.log(`\n  Bet ID: ${bet.id}`);
      console.log(`  Type: ${bet.betType}`);
      console.log(`  Selection: ${bet.selection}`);
      console.log(`  Game: ${bet.game?.awayTeam} @ ${bet.game?.homeTeam}`);
      console.log(`  Score: ${bet.game?.awayScore} - ${bet.game?.homeScore}`);
      console.log(`  Game Status: ${bet.game?.status}`);
      console.log(`  Bet Status: ${bet.status}`);
      console.log(`  Placed: ${bet.placedAt}`);
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

  console.log(`\n🏁 Total finished games: ${finishedGames.length}`);
  console.log(`   Games with bets: ${finishedGames.filter(g => g._count.bets > 0).length}`);

  // Check settlement scheduler logs
  console.log('\n\n=== SETTLEMENT SYSTEM STATUS ===');
  console.log('Has the settlement scheduler been run?');
  console.log('  Command: npm run settlement:once');
  console.log('  Or: npm run settlement:scheduler');
  console.log('\nIf not, run: npm run settlement:once');

  await prisma.$disconnect();
}

diagnoseBets().catch(console.error);
