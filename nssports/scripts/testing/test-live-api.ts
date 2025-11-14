/**
 * Test Live Games API Endpoint
 * 
 * This tests our actual /api/games/live endpoint to see what data
 * is being returned to the frontend.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function testLiveAPI() {
  try {
    console.log('🔴 Testing /api/games/live endpoint...\n');
    
    // Start the dev server first if not running
    const baseUrl = 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/games/live`);
    
    if (!response.ok) {
      console.error(`❌ API returned ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error(text);
      return;
    }
    
    const data = await response.json();
    const games = data.data || [];
    
    console.log(`✅ API returned ${games.length} live games\n`);
    
    if (games.length === 0) {
      console.log('⚠️  No live games found in API response.');
      console.log('   This could mean:');
      console.log('   1. No games are currently live (status.live === false in SDK)');
      console.log('   2. SDK API is not returning live games correctly');
      console.log('   3. Time-based filters are excluding games\n');
      return;
    }
    
    console.log('=== LIVE GAMES FROM API ===\n');
    
    games.forEach((game: any, index: number) => {
      console.log(`Game ${index + 1}: ${game.awayTeam.shortName} @ ${game.homeTeam.shortName}`);
      console.log(`  League: ${game.leagueId}`);
      console.log(`  Status: ${game.status}`);
      console.log(`  Start Time: ${new Date(game.startTime).toLocaleString()}`);
      
      if (game.homeScore !== undefined && game.awayScore !== undefined) {
        console.log(`  Score: ${game.awayTeam.shortName} ${game.awayScore} - ${game.homeScore} ${game.homeTeam.shortName}`);
      }
      
      if (game.period) {
        console.log(`  Period: ${game.period}`);
      }
      
      if (game.timeRemaining) {
        console.log(`  Clock: ${game.timeRemaining}`);
      }
      
      console.log('');
    });
    
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Could not connect to dev server.');
      console.error('   Please start the dev server first: npm run dev\n');
    } else {
      console.error('❌ Error testing API:', error.message);
    }
    process.exit(1);
  }
}

testLiveAPI();
