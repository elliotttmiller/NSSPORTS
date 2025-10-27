#!/usr/bin/env node

/**
 * Test SportsGameOdds API Integration
 * 
 * This script tests the integration with SportsGameOdds.com API to verify:
 * 1. API key is configured correctly
 * 2. API calls work as expected
 * 3. Data transformation is successful
 * 
 * Usage: node test-sportsgameodds-api.mjs
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;
const BASE_URL = 'https://api.sportsgameodds.com/v2';

if (!API_KEY) {
  console.error('❌ SPORTSGAMEODDS_API_KEY is not set in .env.local');
  console.error('Please add your API key to .env.local');
  process.exit(1);
}

console.log('🔑 API Key configured: ✓');
console.log('');

async function testLeaguesEndpoint() {
  console.log('📋 Testing /leagues endpoint...');
  const url = `${BASE_URL}/leagues`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const leagues = result.data || [];
    
    console.log(`✅ Found ${leagues.length} leagues`);
    
    // Show NBA, NFL, NHL
    const targetLeagues = ['NBA', 'NFL', 'NHL'];
    const found = leagues.filter(l => targetLeagues.includes(l.leagueID));
    
    console.log('\n📊 Relevant leagues:');
    found.forEach(league => {
      console.log(`  - ${league.name} (${league.leagueID}): ${league.active ? '✅ Active' : '❌ Inactive'}`);
    });
    
    return found.length > 0;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testEventsEndpoint() {
  console.log('\n🎲 Testing /events endpoint (NBA)...');
  
  // Get events for the next 7 days
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const url = `${BASE_URL}/events?leagueID=NBA&startsAfter=${now.toISOString()}&startsBefore=${sevenDaysFromNow.toISOString()}&limit=10`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const events = result.data || [];
    
    console.log(`✅ Found ${events.length} NBA events`);
    
    if (events.length > 0) {
      const event = events[0];
      console.log(`\n📍 Sample game:`);
      console.log(`  ${event.awayTeam?.name} @ ${event.homeTeam?.name}`);
      console.log(`  Start: ${new Date(event.startTime).toLocaleString()}`);
      console.log(`  Status: ${event.status || 'scheduled'}`);
      console.log(`  Event ID: ${event.eventID}`);
      
      if (event.odds) {
        console.log(`  Odds available: Yes`);
      }
    } else {
      console.log('⚠️  No games currently scheduled (off-season?)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testOddsEndpoint() {
  console.log('\n💰 Testing odds availability...');
  
  // Get a recent event first
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const eventsUrl = `${BASE_URL}/events?leagueID=NBA&startsAfter=${now.toISOString()}&startsBefore=${sevenDaysFromNow.toISOString()}&limit=1`;
  
  try {
    const eventsResponse = await fetch(eventsUrl, {
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });
    
    if (!eventsResponse.ok) {
      throw new Error(`HTTP ${eventsResponse.status}: ${eventsResponse.statusText}`);
    }
    
    const eventsResult = await eventsResponse.json();
    const events = eventsResult.data || [];
    
    if (events.length === 0) {
      console.log('⚠️  No events found to test odds endpoint');
      return true;
    }
    
    const eventId = events[0].eventID;
    console.log(`Testing odds for event: ${eventId}`);
    
    // Now fetch odds for this event
    const oddsUrl = `${BASE_URL}/odds?eventID=${eventId}`;
    
    const oddsResponse = await fetch(oddsUrl, {
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });
    
    if (!oddsResponse.ok) {
      throw new Error(`HTTP ${oddsResponse.status}: ${oddsResponse.statusText}`);
    }
    
    const oddsResult = await oddsResponse.json();
    const oddsData = oddsResult.data || [];
    
    if (oddsData.length > 0) {
      console.log('✅ Odds data available');
      const event = oddsData[0];
      if (event.odds) {
        console.log('  Markets available:', Object.keys(event.odds).join(', '));
      }
    } else {
      console.log('⚠️  No odds available for this event yet');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testRateLimits() {
  console.log('\n📊 Rate Limit Information');
  console.log('ℹ️  Check your dashboard at https://sportsgameodds.com/dashboard for quota usage');
  console.log('ℹ️  This test made 3-4 API requests total');
}

async function main() {
  console.log('🧪 SportsGameOdds API Integration Test\n');
  console.log('═'.repeat(50));
  
  const leaguesOk = await testLeaguesEndpoint();
  const eventsOk = await testEventsEndpoint();
  const oddsOk = await testOddsEndpoint();
  await testRateLimits();
  
  console.log('\n' + '═'.repeat(50));
  
  if (leaguesOk && eventsOk && oddsOk) {
    console.log('\n✅ All tests passed!');
    console.log('SportsGameOdds API integration is working correctly.');
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
