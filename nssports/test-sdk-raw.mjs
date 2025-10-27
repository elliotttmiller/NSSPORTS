/**
 * Direct SDK test to see raw odds data structure
 */

import { getEvents } from './src/lib/sportsgameodds-sdk.ts';

async function testSDKDirectly() {
  try {
    console.log('🔍 TESTING DIRECT SDK CALLS\n');
    console.log('=' .repeat(80) + '\n');
    
    const now = new Date();
    const startsAfter = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const startsBefore = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    
    // Test NBA
    console.log('📡 Fetching NBA games from SDK...\n');
    const nbaResult = await getEvents({
      leagueID: 'NBA',
      startsAfter,
      startsBefore,
      oddsAvailable: true,
      oddIDs: 'game-ml,game-ats,game-ou',
      includeOpposingOddIDs: true,
      limit: 1, // Just get one game
    });
    
    if (nbaResult.data && nbaResult.data.length > 0) {
      const game = nbaResult.data[0];
      console.log(`✅ NBA Game: ${game.teams?.away?.name} @ ${game.teams?.home?.name}`);
      console.log(`   Game ID: ${game.eventID}`);
      console.log(`\n   RAW ODDS OBJECT:`);
      console.log(JSON.stringify(game.odds, null, 2));
    } else {
      console.log('❌ No NBA games returned');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Test NFL
    console.log('📡 Fetching NFL games from SDK...\n');
    const nflResult = await getEvents({
      leagueID: 'NFL',
      startsAfter,
      startsBefore,
      oddsAvailable: true,
      oddIDs: 'game-ml,game-ats,game-ou',
      includeOpposingOddIDs: true,
      limit: 1,
    });
    
    if (nflResult.data && nflResult.data.length > 0) {
      const game = nflResult.data[0];
      console.log(`✅ NFL Game: ${game.teams?.away?.name} @ ${game.teams?.home?.name}`);
      console.log(`   Game ID: ${game.eventID}`);
      console.log(`\n   RAW ODDS OBJECT:`);
      console.log(JSON.stringify(game.odds, null, 2));
    } else {
      console.log('❌ No NFL games returned');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testSDKDirectly();
