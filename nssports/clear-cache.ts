import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing cache...');
  
  // Delete all odds
  const oddsCount = await prisma.odds.deleteMany({});
  console.log(`Deleted ${oddsCount.count} odds records`);
  
  // Delete all player props
  const propsCount = await prisma.playerProp.deleteMany({});
  console.log(`Deleted ${propsCount.count} player props records`);
  
  // Delete all games
  const gamesCount = await prisma.game.deleteMany({});
  console.log(`Deleted ${gamesCount.count} games records`);
  
  console.log('\nCache cleared! Fresh data will be fetched on next API call.');
  
  await prisma.$disconnect();
}

main().catch(console.error);
