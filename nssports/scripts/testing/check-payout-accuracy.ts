import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPayouts() {
  const bets = await prisma.bet.findMany({
    where: {
      status: { in: ['won', 'lost', 'push'] }
    },
    orderBy: {
      settledAt: 'desc'
    },
    take: 10
  });

  console.log('\n📊 Checking Payout Calculations\n');
  console.log('='.repeat(80));

  for (const bet of bets) {
    console.log(`\nBet ID: ${bet.id}`);
    console.log(`Type: ${bet.betType} (${bet.selection})`);
    console.log(`Status: ${bet.status}`);
    console.log(`Odds: ${bet.odds}`);
    console.log(`Stake: $${bet.stake}`);
    console.log(`Potential Payout: $${bet.potentialPayout.toFixed(2)}`);
    
    // Validate payout calculation
    let expectedPayout: number;
    if (bet.odds < 0) {
      // Negative odds: bet.stake * (1 + (100 / |odds|))
      expectedPayout = bet.stake * (1 + (100 / Math.abs(bet.odds)));
    } else {
      // Positive odds: bet.stake * (1 + (odds / 100))
      expectedPayout = bet.stake * (1 + (bet.odds / 100));
    }
    
    console.log(`Expected Payout: $${expectedPayout.toFixed(2)}`);
    
    const difference = Math.abs(bet.potentialPayout - expectedPayout);
    if (difference > 0.01) {
      console.log(`⚠️  MISMATCH! Difference: $${difference.toFixed(2)}`);
    } else {
      console.log(`✅ Calculation correct`);
    }
    
    // Check if payout is negative (which shouldn't happen)
    if (bet.potentialPayout < 0) {
      console.log(`❌ INVALID: Negative payout detected!`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  await prisma.$disconnect();
}

checkPayouts();
