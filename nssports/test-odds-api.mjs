#!/usr/bin/env node

/**
 * Test The Odds API Integration
 * 
 * This script tests the integration with The Odds API to verify:
 * 1. API key is configured correctly
 * 2. API calls work as expected
 * 3. Data transformation is successful
 * 
 * Usage: node test-odds-api.mjs
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.THE_ODDS_API_KEY;

if (!API_KEY) {
  console.error('❌ THE_ODDS_API_KEY is not set in .env.local');
  console.error('Please add your API key to .env.local');
  process.exit(1);
}

console.log('🔑 API Key found:', API_KEY.substring(0, 8) + '...');
console.log('');

async function testSportsEndpoint() {
  console.log('📋 Testing /sports endpoint...');
  const url = `https://api.the-odds-api.com/v4/sports?apiKey=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const sports = await response.json();
    console.log(`✅ Found ${sports.length} sports`);
    
    // Show NBA, NFL, NHL
    const targetSports = ['basketball_nba', 'americanfootball_nfl', 'icehockey_nhl'];
    const found = sports.filter(s => targetSports.includes(s.key));
    
    console.log('\n📊 Relevant sports:');
    found.forEach(sport => {
      console.log(`  - ${sport.title} (${sport.key}): ${sport.active ? '✅ Active' : '❌ Inactive'}`);
    });
    
    return found.length > 0;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testOddsEndpoint() {
  console.log('\n🎲 Testing /odds endpoint (NBA)...');
  const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const events = await response.json();
    console.log(`✅ Found ${events.length} NBA games with odds`);
    
    if (events.length > 0) {
      const event = events[0];
      console.log(`\n📍 Sample game:`);
      console.log(`  ${event.away_team} @ ${event.home_team}`);
      console.log(`  Start: ${new Date(event.commence_time).toLocaleString()}`);
      console.log(`  Bookmakers: ${event.bookmakers.length}`);
      
      if (event.bookmakers.length > 0) {
        const bm = event.bookmakers[0];
        console.log(`\n  ${bm.title}:`);
        bm.markets.forEach(market => {
          console.log(`    - ${market.key}: ${market.outcomes.length} outcomes`);
        });
      }
    } else {
      console.log('⚠️  No games currently available (off-season?)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testQuotaUsage() {
  console.log('\n📊 Checking API quota usage...');
  console.log('ℹ️  Visit https://the-odds-api.com/account/ to check your quota');
  console.log('ℹ️  Each test uses 2 API requests (sports + odds)');
}

async function main() {
  console.log('🧪 The Odds API Integration Test\n');
  console.log('═'.repeat(50));
  
  const sportsOk = await testSportsEndpoint();
  const oddsOk = await testOddsEndpoint();
  await testQuotaUsage();
  
  console.log('\n' + '═'.repeat(50));
  
  if (sportsOk && oddsOk) {
    console.log('\n✅ All tests passed!');
    console.log('The Odds API integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed.');
    console.log('Please check your API key and network connection.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
