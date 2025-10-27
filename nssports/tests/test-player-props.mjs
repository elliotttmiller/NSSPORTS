// Test player props API
const eventId = 'e8XLT479DU00pCXb61pB'; // Cavaliers @ Pistons game

console.log(`Fetching player props for event: ${eventId}`);

const response = await fetch(`http://localhost:3000/api/matches/${eventId}/player-props`);
const data = await response.json();

console.log('\n=== PLAYER PROPS RESPONSE ===');
console.log('Status:', response.status);
console.log('Success:', data.success);

if (data.success && data.data) {
  console.log(`\nTotal props: ${data.data.length}`);
  
  if (data.data.length > 0) {
    console.log('\nSample props:');
    data.data.slice(0, 5).forEach((prop) => {
      console.log({
        player: prop.playerName,
        stat: prop.statType,
        line: prop.line,
        over: prop.overOdds,
        under: prop.underOdds
      });
    });
    
    // Group by stat type
    const byStatType = data.data.reduce((acc, prop) => {
      acc[prop.statType] = (acc[prop.statType] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nProps by stat type:');
    console.log(byStatType);
  } else {
    console.log('\nNo player props available!');
  }
} else {
  console.log('\nError:', data);
}
