import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find yayzer user
  const user = await prisma.user.findFirst({
    where: { username: 'yayzer' },
    select: {
      id: true,
      username: true,
      account: {
        select: { balance: true }
      },
      bets: {
        where: { status: 'pending' },
        select: { stake: true }
      }
    }
  });

  if (!user) {
    console.log('User "yayzer" not found');
    return;
  }

  console.log('Current state:');
  console.log('  Username:', user.username);
  console.log('  Balance:', user.account?.balance || 0);
  
  const risk = user.bets.reduce((sum, bet) => sum + Number(bet.stake), 0);
  console.log('  Risk:', risk);
  console.log('  Pending bets:', user.bets.length);

  // Restore balance to 2500
  await prisma.account.update({
    where: { userId: user.id },
    data: { balance: 2500 }
  });

  console.log('\n✅ Balance restored to $2500');
  console.log('\nNew state:');
  console.log('  Balance: $2500');
  console.log('  Risk: $' + risk);
  console.log('  Available: $' + (2500 - risk));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
