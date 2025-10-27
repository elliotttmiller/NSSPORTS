import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const oddsCount = await prisma.odds.count();
  console.log(`\nTotal odds in database: ${oddsCount}`);
  
  if (oddsCount > 0) {
    const sampleOdds = await prisma.odds.findMany({ take: 10 });
    console.log('\nSample odds:');
    sampleOdds.forEach(odd => {
      console.log({
        gameId: odd.gameId.substring(0, 10) + '...',
        betType: odd.betType,
        selection: odd.selection,
        odds: odd.odds,
        line: odd.line
      });
    });
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
