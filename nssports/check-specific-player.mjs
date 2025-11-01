import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const targetId = 'cmhfzda8a00brv8r4d26f69bc';

const dp = await prisma.dashboardPlayer.findUnique({
  where: { id: targetId }
});

console.log('DashboardPlayer lookup:', dp);

await prisma.$disconnect();
