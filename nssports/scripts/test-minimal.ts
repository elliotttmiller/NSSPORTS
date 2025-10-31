/**
 * Minimal SDK Test - Just get ANY events
 */

import { getSportsGameOddsClient } from '../src/lib/sportsgameodds-sdk';

async function testMinimal() {
  console.log('🔍 Testing MINIMAL queries (no filters)\n');
  
  const client = getSportsGameOddsClient();
  
  for (const league of ['NBA', 'NFL', 'NHL']) {
    console.log(`\n${league}:`);
    
    // Test 1: Absolutely minimal - just league
    console.log('  1. Just league ID:');
    try {
      const result1 = await client.events.get({
        leagueID: league,
        limit: 5,
      });
      console.log(`     Found: ${result1.data.length} events`);
    } catch (error) {
      console.log(`     Error: ${(error as Error).message}`);
    }
    
    // Test 2: Just live flag
    console.log('  2. Live flag only:');
    try {
      const result2 = await client.events.get({
        leagueID: league,
        live: true,
        limit: 5,
      });
      console.log(`     Found: ${result2.data.length} events`);
    } catch (error) {
      console.log(`     Error: ${(error as Error).message}`);
    }
    
    // Test 3: NOT finalized (should include live + upcoming)
    console.log('  3. Not finalized:');
    try {
      const result3 = await client.events.get({
        leagueID: league,
        finalized: false,
        limit: 5,
      });
      console.log(`     Found: ${result3.data.length} events`);
    } catch (error) {
      console.log(`     Error: ${(error as Error).message}`);
    }
  }
  
  console.log('\n✅ Test complete\n');
}

testMinimal();
