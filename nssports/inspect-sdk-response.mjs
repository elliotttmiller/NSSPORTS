#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;

if (!API_KEY) {
  console.error('❌ SPORTSGAMEODDS_API_KEY is not set');
  process.exit(1);
}

async function inspectSDKResponse() {
  const SportsGameOdds = (await import('sports-odds-api')).default;
  const client = new SportsGameOdds({ apiKeyParam: API_KEY });
  
  console.log('Fetching NBA events...\n');
  
  const page = await client.events.get({
    leagueID: 'NBA',
    oddsAvailable: true,
    limit: 1,
  });
  
  const events = page.data || [];
  
  if (events.length === 0) {
    console.log('No events found');
    return;
  }
  
  const event = events[0];
  
  console.log('TOP-LEVEL EVENT KEYS:');
  console.log('═'.repeat(80));
  console.log(Object.keys(event));
  console.log('\n');
  
  console.log('IMPORTANT FIELDS:');
  console.log('═'.repeat(80));
  console.log('eventID:', event.eventID);
  console.log('leagueID:', event.leagueID);
  console.log('activity:', event.activity);
  console.log('commence:', event.commence);
  console.log('startTime:', event.startTime);
  console.log('\n');
  
  console.log('STATUS OBJECT:');
  console.log('═'.repeat(80));
  console.log(JSON.stringify(event.status, null, 2));
  console.log('\n');
  
  console.log('TEAMS OBJECT:');
  console.log('═'.repeat(80));
  console.log(JSON.stringify(event.teams, null, 2));
  console.log('\n');
  
  console.log('PLAYERS OBJECT SAMPLE (first 3 keys):');
  console.log('═'.repeat(80));
  if (event.players) {
    const playerKeys = Object.keys(event.players).slice(0, 3);
    playerKeys.forEach(key => {
      console.log(`\n${key}:`, JSON.stringify(event.players[key], null, 2));
    });
  }
}

inspectSDKResponse().catch(console.error);
