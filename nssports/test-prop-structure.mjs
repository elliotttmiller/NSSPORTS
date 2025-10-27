// Check what fields the SDK provides for player props
import { getEvents } from './src/lib/sportsgameodds-sdk.js';

const result = await getEvents({
  eventIDs: 'e8XLT479DU00pCXb61pB',
  oddsAvailable: true,
});

const event = result.data[0];

if (event && event.odds) {
  // Find a player prop oddID
  const playerPropKeys = Object.keys(event.odds).filter(k => 
    k.includes('points-') && k.includes('-game-ou-')
  );
  
  if (playerPropKeys.length > 0) {
    const sampleKey = playerPropKeys[0];
    console.log('Sample player prop oddID:', sampleKey);
    console.log('Sample player prop data:', JSON.stringify(event.odds[sampleKey], null, 2));
  }
}
