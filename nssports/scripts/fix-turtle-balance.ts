import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing Turtle Balance\n');
  console.log('='.repeat(70));

  // Fix turtle's balance back to $2500
  const turtle = await prisma.user.findFirst({
    where: { username: 'turtle' },
    select: { id: true, username: true }
  });

  if (!turtle) {
    console.log('❌ User "turtle" not found');
    return;
  }

  console.log('Current balance: $2490.00');
  console.log('Adding back: $10.00 (incorrectly deducted stake)');
  console.log('New balance: $2500.00');

  await prisma.account.update({
    where: { userId: turtle.id },
    data: { balance: 2500 }
  });

  console.log('\n✅ Balance corrected to $2500.00');

  // Verify the fix
  const updated = await prisma.user.findFirst({
    where: { username: 'turtle' },
    include: {
      account: { select: { balance: true } },
      bets: {
        where: { status: 'pending' },
        select: { stake: true }
      }
    }
  });

  if (updated) {
    const balance = Number(updated.account?.balance || 0);
    const risk = updated.bets.reduce((sum, bet) => sum + Number(bet.stake), 0);
    const available = Math.max(0, balance - risk);

    console.log('\n📊 Verified New State:');
    console.log('  Balance:', `$${balance.toFixed(2)}`);
    console.log('  Risk:', `$${risk.toFixed(2)}`);
    console.log('  Available:', `$${available.toFixed(2)}`);
    console.log('  Calculation: $' + balance + ' - $' + risk + ' = $' + available);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Turtle balance fixed! Now using correct workflow.');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
