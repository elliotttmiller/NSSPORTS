// Check if event has roster/team information for players
import { getEvents } from 'sports-odds-api';

const result = await getEvents({
  eventIDs: 'e8XLT479DU00pCXb61pB',
  oddsAvailable: true,
});

const event = result.data[0];

console.log('\n=== EVENT TEAMS ===');
console.log('Home Team:', event.teams?.home?.teamID);
console.log('Away Team:', event.teams?.away?.teamID);

console.log('\n=== CHECKING FOR ROSTER DATA ===');
console.log('Home roster:', event.teams?.home?.roster ? 'YES' : 'NO');
console.log('Away roster:', event.teams?.away?.roster ? 'YES' : 'NO');
console.log('Home players:', event.teams?.home?.players ? 'YES' : 'NO');
console.log('Away players:', event.teams?.away?.players ? 'YES' : 'NO');

// Check a sample player prop oddData for team info
const playerPropKey = Object.keys(event.odds).find(k => 
  k.includes('assists-CADE_CUNNINGHAM')
);

if (playerPropKey) {
  console.log('\n=== SAMPLE PLAYER PROP DATA ===');
  console.log('OddID:', playerPropKey);
  const oddData = event.odds[playerPropKey];
  console.log('Has teamID?:', !!oddData.teamID);
  console.log('Has team?:', !!oddData.team);
  console.log('Has side?:', !!oddData.side);
  console.log('Has statEntityID?:', !!oddData.statEntityID);
  console.log('\nAll keys:', Object.keys(oddData).slice(0, 20));
}
