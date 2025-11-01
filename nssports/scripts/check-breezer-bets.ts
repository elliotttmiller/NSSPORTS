import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { username: 'yayzer' },
    include: {
      bets: {
        where: { status: 'pending' },
        select: {
          id: true,
          stake: true,
          status: true,
          placedAt: true,
        },
        orderBy: { placedAt: 'desc' }
      },
      account: {
        select: { balance: true }
      }
    }
  });

  if (!user) {
    console.log('User "yayzer" not found');
    return;
  }

  console.log('\n=== User Info ===');
  console.log('Username:', user.username);
  console.log('Balance:', user.account?.balance || 0);
  console.log('Pending Bets Count:', user.bets?.length || 0);
  
  const totalRisk = user.bets?.reduce((sum, bet) => sum + Number(bet.stake), 0) || 0;
  console.log('Total Risk:', totalRisk);
  console.log('Available:', Math.max(0, Number(user.account?.balance || 0) - totalRisk));

  if (user.bets && user.bets.length > 0) {
    console.log('\n=== All Pending Bets ===');
    user.bets.forEach((bet, idx) => {
      console.log(`${idx + 1}. ID: ${bet.id}`);
      console.log(`   Stake: $${bet.stake}`);
      console.log(`   Status: ${bet.status}`);
      console.log(`   Placed: ${bet.placedAt}`);
    });
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
