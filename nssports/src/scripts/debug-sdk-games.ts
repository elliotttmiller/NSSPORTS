/**
 * Debug script to see SDK Event structure for results and periods
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

import { getEvents } from '@/lib/sportsgameodds-sdk';

async function debugSDKGames() {
  console.log('🔍 Analyzing SDK Event structure for results/periods...\n');

  try {
    const response = await getEvents({
      leagueID: 'NBA',
      limit: 2,
    });

    console.log(`Total events received: ${response.data.length}\n`);

    response.data.forEach((game, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Game ${index + 1}:`);
      console.log(`Event ID: ${game.eventID}`);
      console.log(`Status:`, game.status?.completed ? 'COMPLETED' : 'NOT COMPLETED');
      
      // Check team scores
      console.log(`\nTeam Scores:`);
      console.log(`  Home: ${game.teams?.home?.names?.short} = ${game.teams?.home?.score}`);
      console.log(`  Away: ${game.teams?.away?.names?.short} = ${game.teams?.away?.score}`);
      
      // Check results object structure
      console.log(`\nResults Object:`);
      if (game.results) {
        console.log(`  Has results: YES`);
        console.log(`  Results keys (periodIDs):`, Object.keys(game.results));
        
        // Check 1q quarter data
        if (game.results['1q']) {
          console.log(`\n  1Q Data:`);
          console.log(`    Keys:`, Object.keys(game.results['1q']));
          console.log(`    Content:`, JSON.stringify(game.results['1q'], null, 6));
        }
        
        // Check game level data for player stats
        if (game.results['game']) {
          console.log(`\n  GAME Level Data:`);
          console.log(`    Top level keys:`, Object.keys(game.results['game']).slice(0, 10));
          
          // Sample player data
          const playerKeys = Object.keys(game.results['game']).filter(k => k.includes('_NBA'));
          if (playerKeys.length > 0) {
            const samplePlayer = playerKeys[0];
            console.log(`\n    Sample Player: ${samplePlayer}`);
            console.log(`    Stats:`, JSON.stringify(game.results['game'][samplePlayer], null, 6));
          }
          
          // Sample home team data
          if (game.results['game']['home']) {
            console.log(`\n    Home Team Stats (sample):`, 
              JSON.stringify(game.results['game']['home'], null, 6).substring(0, 500)
            );
          }
        }
      } else {
        console.log(`  Has results: NO`);
      }
      
      // Check periods in status
      console.log(`\nPeriods:`);
      if (game.status?.periods) {
        console.log(`  Ended periods:`, game.status.periods.ended);
        console.log(`  Started periods:`, game.status.periods.started);
      } else {
        console.log(`  No period data in status`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

debugSDKGames();
