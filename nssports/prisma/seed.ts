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
    { 
      id: 'NBA',  // ← UPPERCASE per official SDK specification
      name: 'NBA', 
      sportId: 'basketball', 
      logo: '/logos/nba/NBA.svg' 
    },
    { 
      id: 'NCAAB',  // ← UPPERCASE per official SDK specification
      name: 'NCAA Basketball', 
      sportId: 'basketball', 
      logo: '' 
    },
    { 
      id: 'NFL',  // ← UPPERCASE per official SDK specification
      name: 'NFL', 
      sportId: 'football', 
      logo: '/logos/nfl/NFL.svg' 
    },
    { 
      id: 'NCAAF',  // ← UPPERCASE per official SDK specification
      name: 'NCAA Football', 
      sportId: 'football', 
      logo: '' 
    },
    { 
      id: 'NHL',  // ← UPPERCASE per official SDK specification
      name: 'NHL', 
      sportId: 'hockey', 
      logo: '/logos/nhl/NHL.svg' 
    },
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
