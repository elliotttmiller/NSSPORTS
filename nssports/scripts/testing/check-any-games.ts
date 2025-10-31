/**
 * Check if ANY games exist (even without odds)
 */

import { getSportsGameOddsClient } from '../../src/lib/sportsgameodds-sdk';

async function checkGames() {
  console.log('🔍 Checking for ANY games (with or without odds)\n');
  
  const client = getSportsGameOddsClient();
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  for (const league of ['NBA', 'NFL', 'NHL']) {
    console.log(`\n${league}:`);
    
    try {
      // Try WITHOUT oddsAvailable filter
      const result = await client.events.get({
        leagueID: league,
        finalized: false,
        startsAfter: twelveHoursAgo.toISOString(),
        startsBefore: tomorrow.toISOString(),
        limit: 10,
      });
      
      console.log(`  Found ${result.data.length} games (with or without odds)`);
      
      if (result.data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const game = result.data[0] as any;
        console.log(`  Sample: ${game.awayTeam?.displayName || 'Away'} @ ${game.homeTeam?.displayName || 'Home'}`);
        console.log(`  Start: ${game.startDate}`);
        console.log(`  Has odds: ${game.odds ? 'Yes' : 'No'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  Error: ${errorMessage}`);
    }
  }
  
  console.log('\n✅ Check complete\n');
}

checkGames();
