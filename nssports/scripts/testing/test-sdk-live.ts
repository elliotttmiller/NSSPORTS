/**
 * Test SDK Live Games - Direct Query
 * Tests what the SportsGameOdds SDK actually returns for live games
 */

import 'dotenv/config';
import SportsGameOdds from 'sports-odds-api';

let apiKey = process.env.SPORTSGAMEODDS_API_KEY || process.env.NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY;

if (!apiKey) {
  console.error('❌ SPORTSGAMEODDS_API_KEY not found in environment');
  console.error('   Make sure .env file is loaded');
  console.error('   Current keys:', Object.keys(process.env).filter(k => k.includes('SPORTS')));
  process.exit(1);
}

// Strip quotes if present (from .env file)
apiKey = apiKey.replace(/^["']|["']$/g, '');

console.log('✅ API Key loaded:', apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4));

const sdk = new SportsGameOdds({
  apiKeyHeader: apiKey,
  timeout: 20 * 1000,
  maxRetries: 3,
});

async function testLiveGames() {
  console.log('🔍 Testing SportsGameOdds SDK - Live Games Query\n');
  console.log('='.repeat(60));
  
  const leagues = ['NBA', 'NFL', 'NHL'];
  
  for (const leagueID of leagues) {
    console.log(`\n📊 ${leagueID} - Testing different query strategies:\n`);
    
    // Strategy 1: Official live query
    console.log(`1️⃣  Official Query (live: true, finalized: false):`);
    try {
      const result1 = await sdk.events.get({
        leagueID,
        live: true,
        finalized: false,
        oddsAvailable: true,
        limit: 50,
      });
      console.log(`   Found: ${result1.data.length} games`);
      if (result1.data.length > 0) {
        console.log(`   Sample game data:`, JSON.stringify(result1.data[0], null, 2).substring(0, 500));
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.log(`   Error: ${err.message}`);
    }
    
    // Strategy 2: No time filter, just not finalized
    console.log(`\n2️⃣  Broader Query (finalized: false only):`);
    try {
      const result2 = await sdk.events.get({
        leagueID,
        finalized: false,
        oddsAvailable: true,
        limit: 50,
      });
      console.log(`   Found: ${result2.data.length} games`);
      if (result2.data.length > 0) {
        console.log(`   Sample game data:`, JSON.stringify(result2.data[0], null, 2).substring(0, 500));
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.log(`   Error: ${err.message}`);
    }
    
    // Strategy 3: Look back 12 hours
    console.log(`\n3️⃣  Time Window (last 12 hours to next 7 days):`);
    try {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const sevenDaysAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const result3 = await sdk.events.get({
        leagueID,
        finalized: false,
        oddsAvailable: true,
        startsAfter: twelveHoursAgo.toISOString(),
        startsBefore: sevenDaysAhead.toISOString(),
        limit: 50,
      });
      console.log(`   Found: ${result3.data.length} games`);
      if (result3.data.length > 0) {
        console.log(`   Sample game data:`, JSON.stringify(result3.data[0], null, 2).substring(0, 500));
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.log(`   Error: ${err.message}`);
    }
    
    console.log('\n' + '-'.repeat(60));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ SDK Test Complete\n');
}

testLiveGames().catch(console.error);
