import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Auditing Turtle Balance\n');
  console.log('='.repeat(70));

  const user = await prisma.user.findFirst({
    where: { username: 'turtle' },
    include: {
      account: { select: { balance: true } },
      bets: {
        select: { 
          id: true, 
          stake: true, 
          status: true, 
          placedAt: true,
          settledAt: true,
          potentialPayout: true
        },
        orderBy: { placedAt: 'desc' }
      }
    }
  });

  if (!user) {
    console.log('❌ User "turtle" not found');
    return;
  }

  const balance = user.account ? Number(user.account.balance) : 0;
  const pendingBets = user.bets.filter(b => b.status === 'pending');
  const settledBets = user.bets.filter(b => b.status !== 'pending');
  const risk = pendingBets.reduce((sum, bet) => sum + Number(bet.stake), 0);
  const available = Math.max(0, balance - risk);

  console.log('\n📊 Current State:');
  console.log('  Username:', user.username);
  console.log('  Balance:', `$${balance.toFixed(2)}`);
  console.log('  Risk:', `$${risk.toFixed(2)}`);
  console.log('  Available:', `$${available.toFixed(2)}`);
  console.log('  Total Bets:', user.bets.length);
  console.log('  Pending Bets:', pendingBets.length);
  console.log('  Settled Bets:', settledBets.length);

  console.log('\n💰 Expected State (if started at $2500):');
  console.log('  Balance:', '$2500.00');
  console.log('  Risk:', `$${risk.toFixed(2)}`);
  console.log('  Available:', `$${(2500 - risk).toFixed(2)}`);

  if (pendingBets.length > 0) {
    console.log('\n⏳ Pending Bets:');
    pendingBets.forEach((bet, idx) => {
      console.log(`  ${idx + 1}. Stake: $${bet.stake} | Placed: ${bet.placedAt}`);
    });
  }

  if (settledBets.length > 0) {
    console.log('\n✅ Settled Bets:');
    settledBets.forEach((bet, idx) => {
      console.log(`  ${idx + 1}. Status: ${bet.status} | Stake: $${bet.stake} | Payout: $${bet.potentialPayout || 0} | Settled: ${bet.settledAt}`);
    });
  }

  console.log('\n🔍 Balance Discrepancy Analysis:');
  console.log('  Current Balance:', `$${balance.toFixed(2)}`);
  console.log('  Expected Balance:', '$2500.00');
  console.log('  Difference:', `$${(balance - 2500).toFixed(2)}`);

  if (balance !== 2500) {
    console.log('\n⚠️  Balance is not $2500!');
    console.log('  Possible causes:');
    console.log('  1. Bets were settled (won/lost)');
    console.log('  2. Manual balance adjustment was made');
    console.log('  3. Old bet placement logic deducted stake incorrectly');
    
    if (settledBets.length === 0) {
      console.log('\n  🔴 No settled bets found, but balance is off by $' + (2500 - balance).toFixed(2));
      console.log('  This suggests the old workflow deducted the stake when the bet was placed.');
    }
  }

  console.log('\n' + '='.repeat(70));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
