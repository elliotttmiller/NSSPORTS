/**
 * ============================================================================
 * DATABASE SEED - LEAGUES ONLY (NO MOCK DATA)
 * ============================================================================
 * 
 * This seed file ONLY creates the leagues table with official SportsGameOdds
 * SDK league IDs (NBA, NFL, NHL - UPPERCASE per official specification).
 * 
 * ❌ NO MOCK DATA - All real data comes from SportsGameOdds API:
 *    - Teams: Fetched and cached from SDK
 *    - Games: Real-time from SDK  
 *    - Odds: Real-time consensus odds from SDK
 *    - Players: Real-time from SDK
 *    - Props: Real-time from SDK
 * 
 * ✅ ONLY creates:
 *    - Sports table (basketball, football, hockey)
 *    - Leagues table (NBA, NFL, NHL with official uppercase IDs)
 * 
 * Purpose: Foreign key constraint satisfaction for games.leagueId
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  DATABASE SEED - LEAGUES ONLY (NO MOCK DATA)              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ============================================================================
  // STEP 0: Clear existing users/accounts and create admin
  console.log('📋 Step 0: Clearing users/accounts and creating admin...');
  try {
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    console.log('  ✓ Cleared accounts and users tables');
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        password: 'admin123',
        userType: 'platform_admin',
        isActive: true,
        name: 'Admin',
      }
    });
    await prisma.account.create({
      data: {
        userId: adminUser.id,
        balance: 0,
        freePlay: 0,
      }
    });
    console.log('  ✓ Created admin user: admin / admin123');
  } catch (error) {
    console.error('  ✗ Error creating admin user/account:', error);
    throw error;
  }
  // STEP 1: Clear existing leagues and sports
  // ============================================================================
  console.log('📋 Step 1: Clearing existing leagues and sports...');
  
  try {
    await prisma.league.deleteMany();
    console.log('  ✓ Cleared leagues table');
    
    await prisma.sport.deleteMany();
    console.log('  ✓ Cleared sports table');
  } catch (error) {
    console.error('  ✗ Error clearing tables:', error);
    throw error;
  }

  // ============================================================================
  // STEP 2: Create Sports (basketball, football, hockey)
  // ============================================================================
  console.log('\n📋 Step 2: Creating sports...');
  
  const sportsData = [
    { id: 'basketball', name: 'Basketball', icon: '🏀' },
    { id: 'football', name: 'Football', icon: '🏈' },
    { id: 'hockey', name: 'Hockey', icon: '🏒' },
    { id: 'tennis', name: 'Tennis', icon: '🎾' },
  ];
  
  for (const sport of sportsData) {
    try {
      await prisma.sport.create({ data: sport });
      console.log(`  ✓ Created sport: ${sport.icon} ${sport.name}`);
    } catch (error) {
      console.error(`  ✗ Error creating sport ${sport.name}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // STEP 3: Create Leagues with OFFICIAL UPPERCASE IDs
  // ============================================================================
  console.log('\n📋 Step 3: Creating leagues with official SDK IDs...');
  console.log('   ⚠️  CRITICAL: IDs must match SportsGameOdds SDK (NBA, NFL, NHL)');
  console.log('   📚 Reference: https://sportsgameodds.com/docs/data-types/leagues\n');
  
  const leaguesData = [
    { id: 'NBA', name: 'NBA', sportId: 'basketball', logo: '/logos/nba/NBA.svg' },
    { id: 'NCAAB', name: 'NCAA Basketball', sportId: 'basketball', logo: '/logos/ncaa/NCAA_logo.svg' },
    { id: 'NFL', name: 'NFL', sportId: 'football', logo: '/logos/nfl/NFL.svg' },
    { id: 'NCAAF', name: 'NCAA Football', sportId: 'football', logo: '/logos/ncaa/NCAA_logo.svg' },
    { id: 'NHL', name: 'NHL', sportId: 'hockey', logo: '/logos/nhl/NHL.svg' },
    // Tennis leagues
    { id: 'ATP', name: 'ATP', sportId: 'tennis', logo: '/logos/atp/atp.svg' },
    { id: 'WTA', name: 'WTA', sportId: 'tennis', logo: '/logos/wta/wta.svg' },
    { id: 'ITF', name: 'ITF', sportId: 'tennis', logo: '/logos/itf/itf.svg' },
  ];
  
  for (const league of leaguesData) {
    try {
      await prisma.league.create({ data: league });
      console.log(`  ✓ Created league: ${league.name} (ID: ${league.id})`);
    } catch (error) {
      console.error(`  ✗ Error creating league ${league.name}:`, error);
      throw error;
    }
  }
  
  // ============================================================================
  // SEED COMPLETE
  // ============================================================================
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ SEED COMPLETE - LEAGUES CREATED SUCCESSFULLY          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n📡 DATA SOURCES:');
  console.log('   ✓ Teams:  Real-time from SportsGameOdds SDK');
  console.log('   ✓ Games:  Real-time from SportsGameOdds SDK');
  console.log('   ✓ Odds:   Real-time consensus from SportsGameOdds SDK');
  console.log('   ✓ Players: Real-time from SportsGameOdds SDK');
  console.log('   ✓ Props:  Real-time from SportsGameOdds SDK');
  console.log('\n❌ NO MOCK DATA - ALL DATA IS REAL-TIME FROM API\n');
}

// ============================================================================
// EXECUTION
// ============================================================================
main()
  .catch((error) => {
    console.error('\n❌ SEED FAILED:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed\n');
  });
