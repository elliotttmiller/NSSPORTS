// Test what fields are in oddData
import SportsGameOdds from 'sports-odds-api';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new SportsGameOdds({
  apiKey: process.env.SPORTSGAMEODDS_API_KEY
});

const result = await client.events.get({
  eventIDs: 'e8XLT479DU00pCXb61pB',
  oddsAvailable: true,
});

const event = result.data[0];

// Find a player prop
const playerPropKey = Object.keys(event.odds).find(k => 
  k.includes('assists-CADE_CUNNINGHAM')
);

if (playerPropKey) {
  console.log('\n=== PLAYER PROP ODD DATA ===');
  console.log('OddID:', playerPropKey);
  const oddData = event.odds[playerPropKey];
  console.log('\nAll fields:', Object.keys(oddData));
  console.log('\nFull oddData:', JSON.stringify(oddData, null, 2));
}
