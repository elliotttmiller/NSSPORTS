import prisma from '../nssports/src/lib/prisma';

async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'slime' } });
  if (!user) {
    console.log("User 'slime' not found.");
    return;
  }
  
  // Get current balance
  const account = await prisma.account.findUnique({ where: { userId: user.id } });
  const currentBalance = account?.balance || 0;
  const newBalance = currentBalance + 5000.00;
  
  await prisma.account.update({
    where: { userId: user.id },
    data: { balance: newBalance }
  });
  
  console.log(`Balance updated for slime:`);
  console.log(`  Previous: $${currentBalance.toFixed(2)}`);
  console.log(`  Added: $5,000.00`);
  console.log(`  New Balance: $${newBalance.toFixed(2)}`);
}

main().finally(() => prisma.$disconnect());
