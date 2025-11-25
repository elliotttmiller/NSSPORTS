import prisma from '../../src/lib/prisma';
import { logger } from '../../src/lib/logger';

async function checkImageUrls() {
  try {
    // Check all leagues for example.com URLs
    const leagues = await prisma.league.findMany({
      where: {
        OR: [
          { logo: { contains: 'example.com' } },
          { logo: { startsWith: 'http://example.com' } }
        ]
      },
      select: {
        id: true,
        name: true,
        logo: true
      }
    });
    
  logger.info(`\n🔍 Found ${leagues.length} leagues with example.com URLs:\n`);
    
    for (const league of leagues) {
      logger.info(`League: ${league.name}`);
      logger.info(`  ID: ${league.id}`);
      logger.info(`  Logo: ${league.logo}`);
      logger.info('');
    }
    
    if (leagues.length > 0) {
      logger.info('💡 These URLs need to use HTTPS or be replaced with real logos.\n');
    }
    
  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImageUrls();
