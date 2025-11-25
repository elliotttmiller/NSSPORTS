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

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL (or DIRECT_URL) is required to run the seed. Set it in .env.local or the environment.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  DATABASE SEED - LEAGUES ONLY (NO MOCK DATA)              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ============================================================================
  // STEP 1: Upsert Sports (Add new sports, update existing ones)
  // ============================================================================
  console.log('📋 Step 1: Upserting sports (preserving existing data)...');
  
  const sportsData = [
    { id: 'basketball', name: 'Basketball', icon: '🏀' },
    { id: 'football', name: 'Football', icon: '🏈' },
    { id: 'hockey', name: 'Hockey', icon: '🏒' },
    { id: 'tennis', name: 'Tennis', icon: '🎾' },
    { id: 'soccer', name: 'Soccer', icon: '⚽' },
    { id: 'mma', name: 'MMA', icon: '🥊' },
    { id: 'boxing', name: 'Boxing', icon: '🥊' },
    { id: 'golf', name: 'Golf', icon: '⛳' },
    { id: 'horse_racing', name: 'Horse Racing', icon: '🏇' },
  ];
  
  for (const sport of sportsData) {
    try {
      await prisma.sport.upsert({
        where: { id: sport.id },
        update: { name: sport.name, icon: sport.icon },
        create: sport,
      });
      console.log(`  ✓ Upserted sport: ${sport.icon} ${sport.name}`);
    } catch (error) {
      console.error(`  ✗ Error upserting sport ${sport.name}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // STEP 2: Upsert Leagues with OFFICIAL UPPERCASE IDs
  // ============================================================================
  console.log('\n📋 Step 2: Upserting leagues with official SDK IDs (preserving existing data)...');
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
    // Soccer leagues - Per https://sportsgameodds.com/docs/data-types/markets/soccer
    { id: 'EPL', name: 'English Premier League', sportId: 'soccer', logo: '/logos/soccer/EPL.svg' },
    { id: 'LA_LIGA', name: 'La Liga', sportId: 'soccer', logo: '/logos/soccer/LA_LIGA.svg' },
    { id: 'BUNDESLIGA', name: 'Bundesliga', sportId: 'soccer', logo: '/logos/soccer/BUNDESLIGA.svg' },
    { id: 'IT_SERIE_A', name: 'Serie A', sportId: 'soccer', logo: '/logos/soccer/IT_SERIE_A.svg' },
    { id: 'FR_LIGUE_1', name: 'Ligue 1', sportId: 'soccer', logo: '/logos/soccer/FR_LIGUE_1.svg' },
    { id: 'MLS', name: 'MLS', sportId: 'soccer', logo: '/logos/soccer/MLS.svg' },
    { id: 'LIGA_MX', name: 'Liga MX', sportId: 'soccer', logo: '/logos/soccer/LIGA_MX.svg' },
    { id: 'UEFA_CHAMPIONS_LEAGUE', name: 'UEFA Champions League', sportId: 'soccer', logo: '/logos/soccer/UEFA_CHAMPIONS_LEAGUE.svg' },
    { id: 'UEFA_EUROPA_LEAGUE', name: 'UEFA Europa League', sportId: 'soccer', logo: '/logos/soccer/UEFA_EUROPA_LEAGUE.svg' },
    { id: 'BR_SERIE_A', name: 'Brasileirão', sportId: 'soccer', logo: '/logos/soccer/BR_SERIE_A.svg' },
    { id: 'INTERNATIONAL_SOCCER', name: 'International Soccer', sportId: 'soccer', logo: '/logos/soccer/INTERNATIONAL_SOCCER.svg' },
    // MMA leagues - Per https://sportsgameodds.com/docs/data-types/markets/mma
    { id: 'UFC', name: 'UFC', sportId: 'mma', logo: '/logos/mma/UFC.svg' },
    { id: 'BELLATOR', name: 'Bellator MMA', sportId: 'mma', logo: '/logos/mma/BELLATOR.svg' },
    { id: 'PFL', name: 'PFL', sportId: 'mma', logo: '/logos/mma/PFL.svg' },
    { id: 'ONE_CHAMPIONSHIP', name: 'ONE Championship', sportId: 'mma', logo: '/logos/mma/ONE_CHAMPIONSHIP.svg' },
    // Boxing
    { id: 'BOXING', name: 'Boxing', sportId: 'boxing', logo: '/logos/boxing/BOXING.svg' },
    // Golf leagues - Per https://sportsgameodds.com/docs/data-types/leagues
    { id: 'PGA_MEN', name: 'PGA Tour', sportId: 'golf', logo: '/logos/golf/PGA_MEN.svg' },
    { id: 'PGA_WOMEN', name: 'LPGA Tour', sportId: 'golf', logo: '/logos/golf/PGA_WOMEN.svg' },
    { id: 'LIV_TOUR', name: 'LIV Golf', sportId: 'golf', logo: '/logos/golf/LIV_TOUR.svg' },
    { id: 'DP_WORLD_TOUR', name: 'DP World Tour', sportId: 'golf', logo: '/logos/golf/DP_WORLD_TOUR.svg' },
    // Horse Racing
    { id: 'HORSE_RACING', name: 'Horse Racing', sportId: 'horse_racing', logo: '/logos/horse_racing/HORSE_RACING.svg' },
  ];
  
  for (const league of leaguesData) {
    try {
      await prisma.league.upsert({
        where: { id: league.id },
        update: { name: league.name, sportId: league.sportId, logo: league.logo },
        create: league,
      });
      console.log(`  ✓ Upserted league: ${league.name} (ID: ${league.id})`);
    } catch (error) {
      console.error(`  ✗ Error upserting league ${league.name}:`, error);
      throw error;
    }
  }
  
  // ============================================================================
  // SEED COMPLETE
  // ============================================================================
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ SEED COMPLETE - SPORTS & LEAGUES UPSERTED             ║');
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
