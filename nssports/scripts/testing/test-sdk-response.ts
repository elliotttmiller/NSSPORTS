/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test script to check actual SDK response data
 * Run: npx tsx scripts/testing/test-sdk-response.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { getEvents, MAIN_LINE_ODDIDS } from '../../src/lib/sportsgameodds-sdk';

async function testSDKResponse() {
  console.log('🔍 Testing SportsGameOdds SDK Response...\n');
  
  try {
    // Fetch live NBA games
    console.log('📡 Fetching live NBA games with team data...');
    const { data: events } = await getEvents({
      leagueID: 'NBA',
      live: true,
      finalized: false,
      oddIDs: MAIN_LINE_ODDIDS,
      includeOpposingOddIDs: true,
      limit: 3,
    });
    
    console.log(`✅ Received ${events.length} events\n`);
    
    if (events.length === 0) {
      console.log('⚠️  No live NBA games found. Trying upcoming games...\n');
      
      const { data: upcomingEvents } = await getEvents({
        leagueID: 'NBA',
        finalized: false,
        oddIDs: MAIN_LINE_ODDIDS,
        includeOpposingOddIDs: true,
        limit: 3,
      });
      
      console.log(`✅ Received ${upcomingEvents.length} upcoming events\n`);
      
      if (upcomingEvents.length > 0) {
        analyzeEvent(upcomingEvents[0]);
      } else {
        console.log('❌ No games found at all');
      }
    } else {
      analyzeEvent(events[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

function analyzeEvent(event: any) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 EVENT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('🆔 Event ID:', event.eventID);
  console.log('🏆 League:', event.leagueID);
  console.log('📅 Start Time:', event.status?.startsAt || event.startTime);
  console.log('📍 Status:', event.status?.live ? 'LIVE' : 'UPCOMING');
  console.log();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏠 HOME TEAM');
  console.log('═══════════════════════════════════════════════════════════');
  const homeTeam = event.teams?.home;
  if (homeTeam) {
    console.log('Team ID:', homeTeam.teamID || '❌ MISSING');
    console.log('Name:', homeTeam.name || '❌ MISSING');
    console.log('Logo URL:', homeTeam.logo || '❌ MISSING');
    console.log('Full Team Object:', JSON.stringify(homeTeam, null, 2));
  } else {
    console.log('❌ HOME TEAM DATA COMPLETELY MISSING');
  }
  console.log();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✈️  AWAY TEAM');
  console.log('═══════════════════════════════════════════════════════════');
  const awayTeam = event.teams?.away;
  if (awayTeam) {
    console.log('Team ID:', awayTeam.teamID || '❌ MISSING');
    console.log('Name:', awayTeam.name || '❌ MISSING');
    console.log('Logo URL:', awayTeam.logo || '❌ MISSING');
    console.log('Full Team Object:', JSON.stringify(awayTeam, null, 2));
  } else {
    console.log('❌ AWAY TEAM DATA COMPLETELY MISSING');
  }
  console.log();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('💰 MAIN ODDS SAMPLE (First 3)');
  console.log('═══════════════════════════════════════════════════════════');
  if (event.odds) {
    const oddsKeys = Object.keys(event.odds).slice(0, 3);
    oddsKeys.forEach(oddID => {
      console.log(`\n${oddID}:`);
      const oddData = event.odds[oddID];
      console.log('  fairOdds:', oddData.fairOdds || 'N/A');
      console.log('  fairSpread:', oddData.fairSpread || 'N/A');
      console.log('  fairOverUnder:', oddData.fairOverUnder || 'N/A');
    });
  } else {
    console.log('❌ NO ODDS DATA');
  }
  console.log('\n');
}

// Run the test
testSDKResponse().catch(console.error);
