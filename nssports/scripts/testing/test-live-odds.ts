#!/usr/bin/env node
/**
 * Test script to verify live game odds from SDK
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import SportsGameOdds from 'sports-odds-api';

// Load .env.local explicitly (ES module compatible)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function testLiveOdds() {
  const apiKey = process.env.SPORTSGAMEODDS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ SPORTSGAMEODDS_API_KEY not set');
    process.exit(1);
  }

  const client = new SportsGameOdds({ apiKeyHeader: apiKey });
  
  console.log('\n🔍 Testing Live NHL Game Odds...\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const response = await client.events.get({
      leagueID: 'NHL',
      live: true,
      finalized: false,
      oddID: 'points-home-game-ml-home,points-home-game-sp-home,points-all-game-ou-over',
      includeOpposingOdds: true,
      limit: 5,
    });

    console.log(`✅ Received ${response.data.length} live NHL games\n`);

    for (const event of response.data) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📊 ${event.teams?.away?.names?.long} @ ${event.teams?.home?.names?.long}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Event ID: ${event.eventID}`);
      console.log(`Status: ${event.status?.live ? 'LIVE' : 'NOT LIVE'}`);
      console.log(`Started: ${event.status?.started ? 'Yes' : 'No'}`);
      console.log();

      if (!event.odds) {
        console.log('❌ NO ODDS DATA\n');
        continue;
      }

      const oddsKeys = Object.keys(event.odds);
      console.log(`📈 Available odds markets: ${oddsKeys.length}`);
      console.log();

      // Check moneyline
      const mlHome = event.odds['points-home-game-ml-home'];
      const mlAway = event.odds['points-away-game-ml-away'];

      console.log('💰 MONEYLINE:');
      if (mlHome) {
        console.log(`  Home (${event.teams?.home?.names?.short}):`);
        console.log(`    fairOdds: ${mlHome.fairOdds || 'N/A'}`);
        console.log(`    bookOdds: ${mlHome.bookOdds || 'N/A'}`);
        console.log(`    fairOddsAvailable: ${mlHome.fairOddsAvailable}`);
        console.log(`    bookOddsAvailable: ${mlHome.bookOddsAvailable}`);
      } else {
        console.log(`  Home: ❌ MISSING`);
      }
      
      if (mlAway) {
        console.log(`  Away (${event.teams?.away?.names?.short}):`);
        console.log(`    fairOdds: ${mlAway.fairOdds || 'N/A'}`);
        console.log(`    bookOdds: ${mlAway.bookOdds || 'N/A'}`);
        console.log(`    fairOddsAvailable: ${mlAway.fairOddsAvailable}`);
        console.log(`    bookOddsAvailable: ${mlAway.bookOddsAvailable}`);
      } else {
        console.log(`  Away: ❌ MISSING`);
      }
      console.log();

      // Check spread
      const spHome = event.odds['points-home-game-sp-home'];
      const spAway = event.odds['points-away-game-sp-away'];

      console.log('📊 SPREAD:');
      if (spHome) {
        console.log(`  Home: ${spHome.fairSpread || spHome.bookSpread || 'N/A'} (${spHome.fairOdds || spHome.bookOdds || 'N/A'})`);
      }
      if (spAway) {
        console.log(`  Away: ${spAway.fairSpread || spAway.bookSpread || 'N/A'} (${spAway.fairOdds || spAway.bookOdds || 'N/A'})`);
      }
      console.log();

      // Check total
      const ouOver = event.odds['points-all-game-ou-over'];
      const ouUnder = event.odds['points-all-game-ou-under'];

      console.log('🎯 TOTAL:');
      if (ouOver) {
        console.log(`  Over: ${ouOver.fairOverUnder || ouOver.bookOverUnder || 'N/A'} (${ouOver.fairOdds || ouOver.bookOdds || 'N/A'})`);
      }
      if (ouUnder) {
        console.log(`  Under: ${ouUnder.fairOverUnder || ouUnder.bookOverUnder || 'N/A'} (${ouUnder.fairOdds || ouUnder.bookOdds || 'N/A'})`);
      }
      console.log('\n');
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    console.error(error);
  }
}

testLiveOdds();
