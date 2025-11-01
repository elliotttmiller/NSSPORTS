import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const user = await prisma.user.findFirst({
  where: { username: 'turtle' },
  select: { id: true, username: true, name: true }
});

console.log('User lookup by username "turtle":', user);

await prisma.$disconnect();
