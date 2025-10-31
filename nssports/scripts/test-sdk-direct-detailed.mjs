#!/usr/bin/env node
/**
 * Test SportsGameOdds SDK directly with detailed logging
 * Run: node scripts/test-sdk-direct-detailed.mjs
 */

import SportsGameOdds from 'sports-odds-api';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const apiKey = process.env.SPORTSGAMEODDS_API_KEY;

if (!apiKey) {
  console.error('❌ SPORTSGAMEODDS_API_KEY not found in environment');
  process.exit(1);
}

console.log('✅ API Key loaded:', apiKey.substring(0, 10) + '...');

const client = new SportsGameOdds({
  apiKeyHeader: apiKey,
  timeout: 20 * 1000,
  maxRetries: 3,
});

console.log('\n📊 Testing SDK Event Queries...\n');

// Test 1: Live games query (what /api/games/live uses)
console.log('=== TEST 1: Live Games (NBA) ===');
try {
  const page = await client.events.get({
    leagueID: 'NBA',
    live: true,
    finalized: false,
    oddsAvailable: true,
    oddIDs: 'game-ml,game-ats,game-ou',
    includeOpposingOddIDs: true,
    limit: 50,
  });
  console.log(`✅ Found ${page.data.length} live NBA games`);
  if (page.data.length > 0) {
    console.log('Sample game:', {
      eventID: page.data[0].eventID,
      teams: page.data[0].teams,
      startTime: page.data[0].status?.startsAt,
      activity: page.data[0].status?.activity,
    });
  }
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 2: Upcoming games query (what /api/games uses)
console.log('\n=== TEST 2: Upcoming Games (NBA, next 14 days) ===');
try {
  const now = new Date();
  const startsAfter = now.toISOString();
  const startsBefore = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  
  console.log(`Time range: ${startsAfter} to ${startsBefore}`);
  
  const page = await client.events.get({
    leagueID: 'NBA',
    finalized: false,
    oddsAvailable: true,
    startsAfter,
    startsBefore,
    oddIDs: 'game-ml,game-ats,game-ou',
    includeOpposingOddIDs: true,
    limit: 10,
  });
  console.log(`✅ Found ${page.data.length} upcoming NBA games`);
  if (page.data.length > 0) {
    console.log('Sample game:', {
      eventID: page.data[0].eventID,
      teams: page.data[0].teams,
      startTime: page.data[0].status?.startsAt,
      activity: page.data[0].status?.activity,
    });
  }
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 3: Any games without filters (see what SDK has)
console.log('\n=== TEST 3: Any NBA Games (minimal filters) ===');
try {
  const page = await client.events.get({
    leagueID: 'NBA',
    limit: 10,
  });
  console.log(`✅ Found ${page.data.length} NBA games (any status)`);
  if (page.data.length > 0) {
    console.log('First 3 games:');
    page.data.slice(0, 3).forEach((game, i) => {
      console.log(`  ${i + 1}. ${game.teams?.home?.name} vs ${game.teams?.away?.name}`);
      console.log(`     Start: ${game.status?.startsAt}`);
      console.log(`     Activity: ${game.status?.activity}`);
      console.log(`     Finalized: ${game.status?.finalized}`);
    });
  }
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 4: Try NFL
console.log('\n=== TEST 4: Any NFL Games (minimal filters) ===');
try {
  const page = await client.events.get({
    leagueID: 'NFL',
    limit: 10,
  });
  console.log(`✅ Found ${page.data.length} NFL games (any status)`);
  if (page.data.length > 0) {
    console.log('First 3 games:');
    page.data.slice(0, 3).forEach((game, i) => {
      console.log(`  ${i + 1}. ${game.teams?.home?.name} vs ${game.teams?.away?.name}`);
      console.log(`     Start: ${game.status?.startsAt}`);
      console.log(`     Activity: ${game.status?.activity}`);
      console.log(`     Finalized: ${game.status?.finalized}`);
    });
  }
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 5: Try NHL
console.log('\n=== TEST 5: Any NHL Games (minimal filters) ===');
try {
  const page = await client.events.get({
    leagueID: 'NHL',
    limit: 10,
  });
  console.log(`✅ Found ${page.data.length} NHL games (any status)`);
  if (page.data.length > 0) {
    console.log('First 3 games:');
    page.data.slice(0, 3).forEach((game, i) => {
      console.log(`  ${i + 1}. ${game.teams?.home?.name} vs ${game.teams?.away?.name}`);
      console.log(`     Start: ${game.status?.startsAt}`);
      console.log(`     Activity: ${game.status?.activity}`);
      console.log(`     Finalized: ${game.status?.finalized}`);
    });
  }
} catch (error) {
  console.log('❌ Error:', error.message);
}

console.log('\n✅ SDK diagnostic complete');
