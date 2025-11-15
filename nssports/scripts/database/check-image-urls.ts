import prisma from '../../src/lib/prisma';

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
    
    console.log(`\n🔍 Found ${leagues.length} leagues with example.com URLs:\n`);
    
    for (const league of leagues) {
      console.log(`League: ${league.name}`);
      console.log(`  ID: ${league.id}`);
      console.log(`  Logo: ${league.logo}`);
      console.log('');
    }
    
    if (leagues.length > 0) {
      console.log('💡 These URLs need to use HTTPS or be replaced with real logos.\n');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImageUrls();
