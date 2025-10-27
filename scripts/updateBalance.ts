import prisma from '../nssports/src/lib/prisma';

async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'yayzer' } });
  if (!user) {
    console.log("User 'yayzer' not found.");
    return;
  }
  await prisma.account.update({
    where: { userId: user.id },
    data: { balance: 5000.00 }
  });
  console.log("Balance updated for yayzer: $5000.00");
}

main().finally(() => prisma.$disconnect());
