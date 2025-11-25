import 'dotenv/config';
import prisma from '../../src/lib/prisma';
import { logger } from '../../src/lib/logger';

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!DATABASE_URL) {
  logger.error('DATABASE_URL (or DIRECT_URL) is required to run this script.');
  process.exit(1);
}

// Use shared prisma client

async function main() {
  logger.info('Clearing cache...');
  
  // Delete all odds
  const oddsCount = await prisma.odds.deleteMany({});
  logger.info(`Deleted ${oddsCount.count} odds records`);
  
  // Delete all player props
  const propsCount = await prisma.playerProp.deleteMany({});
  logger.info(`Deleted ${propsCount.count} player props records`);
  
  // Delete all games
  const gamesCount = await prisma.game.deleteMany({});
  logger.info(`Deleted ${gamesCount.count} games records`);
  
  logger.info('\nCache cleared! Fresh data will be fetched on next API call.');
  
  await prisma.$disconnect();
}

main().catch((err) => logger.error(err));
