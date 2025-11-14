/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test Live Score Display - CLEAN VERSION
 * 
 * This script ONLY tests live game scores and clock data.
 * NO player stats, NO odds data, NO unnecessary information.
 * 
 * Tests the exact data our game cards need:
 * - event.status.live (boolean)
 * - event.status.clock (string, e.g., "5:32")
 * - event.status.currentPeriodID (string, e.g., "3q")
 * - event.results.game.home.points (number)
 * - event.results.game.away.points (number)
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { getEvents } from '../../src/lib/sportsgameodds-sdk.js';

async function testLiveScores() {
  try {
    console.log('🏀 Fetching games from active leagues (NBA, NHL, NCAAB, NFL)...');
    console.log(`📅 Current date: ${new Date().toISOString()}\n`);
    
    // Force fetch games from TODAY only
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    
    console.log(`⏰ Searching for games between:`);
    console.log(`   ${startOfToday.toISOString()}`);
    console.log(`   ${endOfToday.toISOString()}\n`);
    
    // Fetch from major active leagues with DATE FILTER
    const response = await getEvents({
      leagueID: 'NBA,NHL,NCAAB,NFL',
      startsAfter: startOfToday.toISOString(),
      startsBefore: endOfToday.toISOString(),
      limit: 100,
    });

    const events = response.data || [];
    console.log(`✅ Found ${events.length} games\n`);

    if (events.length === 0) {
      console.log('⚠️  No games found. Try again later.\n');
      return;
    }

    // Filter to ONLY truly live games
    const liveGames = events.filter((event: any) => event.status?.live === true);

    console.log('=== LIVE GAMES SCAN ===\n');
    
    if (liveGames.length === 0) {
      console.log('⚠️  No live games currently (status.live === true).\n');
      console.log('📊 Showing sample of recent/upcoming games instead:\n');
      
      // Show first 5 games with their status
      events.slice(0, 5).forEach((event: any) => {
        const awayTeam = event.teams?.away?.names?.short || 'Away';
        const homeTeam = event.teams?.home?.names?.short || 'Home';
        const league = event.leagueID;
        const awayScore = event.results?.game?.away?.points;
        const homeScore = event.results?.game?.home?.points;
        const status = event.status?.displayShort || 'Unknown';
        const startsAt = new Date(event.status?.startsAt).toLocaleString();
        
        console.log(`${awayTeam} @ ${homeTeam} (${league})`);
        console.log(`  Status: ${status}`);
        console.log(`  Starts: ${startsAt}`);
        if (awayScore !== undefined && homeScore !== undefined) {
          console.log(`  Final Score: ${awayTeam} ${awayScore} - ${homeScore} ${homeTeam}`);
        }
        console.log(`  status.live: ${event.status?.live}`);
        console.log(`  status.clock: ${event.status?.clock || 'N/A'}`);
        console.log(`  status.currentPeriodID: ${event.status?.currentPeriodID || 'N/A'}`);
        console.log('');
      });
      
      return;
    }

    // Show ONLY live game data
    console.log(`🔴 FOUND ${liveGames.length} LIVE GAMES!\n`);
    
    liveGames.forEach((event: any, index: number) => {
      const awayTeam = event.teams?.away?.names?.short || 'Away';
      const homeTeam = event.teams?.home?.names?.short || 'Home';
      const league = event.leagueID;
      const awayScore = event.results?.game?.away?.points;
      const homeScore = event.results?.game?.home?.points;
      const clock = event.status?.clock;
      const period = event.status?.currentPeriodID;
      
      console.log(`Game ${index + 1}: ${awayTeam} @ ${homeTeam} (${league})`);
      console.log(`  🔴 LIVE`);
      console.log(`  Score: ${awayTeam} ${awayScore} - ${homeScore} ${homeTeam}`);
      console.log(`  Period: ${period}`);
      console.log(`  Clock: ${clock}`);
      console.log(`  Event ID: ${event.eventID}`);
      console.log('');
    });

    console.log('\n=== RAW STATUS DATA (First Live Game) ===\n');
    if (liveGames[0]) {
      const firstLive = liveGames[0];
      const status = firstLive.status as any; // SDK returns these properties but they're not in the types
      console.log('Status object:', JSON.stringify({
        live: status?.live,
        clock: status?.clock,
        currentPeriodID: status?.currentPeriodID,
        displayShort: status?.displayShort,
        displayLong: status?.displayLong,
      }, null, 2));
      
      console.log('\nResults object:', JSON.stringify({
        game: {
          away: { points: firstLive.results?.game?.away?.points },
          home: { points: firstLive.results?.game?.home?.points },
        }
      }, null, 2));
    }

  } catch (error) {
    console.error('❌ Error fetching live games:', error);
    process.exit(1);
  }
}

testLiveScores();
