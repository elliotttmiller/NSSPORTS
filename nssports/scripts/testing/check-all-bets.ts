import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: 'slime' },
    include: {
      bets: {
        orderBy: { placedAt: 'desc' },
        take: 10,
        include: {
          game: {
            select: {
              homeTeam: true,
              awayTeam: true,
              homeScore: true,
              awayScore: true,
              status: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    console.log('User not found');
    process.exit(1);
  }

  console.log(`\n📊 Recent bets for user: ${user.username}\n`);
  console.log('='.repeat(80));

  for (const bet of user.bets) {
    console.log(`\nBet ID: ${bet.id}`);
    console.log(`Type: ${bet.betType}`);
    console.log(`Status: ${bet.status}`);
    console.log(`Stake: $${bet.stake}`);
    console.log(`Potential Payout: $${bet.potentialPayout.toFixed(2)}`);
    if (bet.status === 'won') {
      console.log(`Actual Payout: $${bet.potentialPayout.toFixed(2)} ✅`);
    } else if (bet.status === 'lost') {
      console.log(`Actual Payout: $0.00 ❌`);
    } else if (bet.status === 'push') {
      console.log(`Actual Payout: $${bet.stake.toFixed(2)} (stake returned) 🔄`);
    }
    console.log(`Odds: ${bet.odds}`);
    if (bet.game) {
      console.log(`Game: ${bet.game.awayTeam} @ ${bet.game.homeTeam}`);
      console.log(`Score: ${bet.game.awayScore ?? '?'} - ${bet.game.homeScore ?? '?'}`);
      console.log(`Game Status: ${bet.game.status}`);
    }
    console.log(`Placed: ${bet.placedAt.toLocaleString()}`);
    if (bet.settledAt) {
      console.log(`Settled: ${bet.settledAt.toLocaleString()}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\nTotal bets: ${user.bets.length}`);
  
  const statusCounts = user.bets.reduce((acc, bet) => {
    acc[bet.status] = (acc[bet.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('Status breakdown:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  await prisma.$disconnect();
}

main();
