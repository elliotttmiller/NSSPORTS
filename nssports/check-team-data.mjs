// Check what team data the SDK provides
const response = await fetch('http://localhost:3000/api/games?page=1&limit=1');
const data = await response.json();

if (data?.data?.data?.[0]) {
  const game = data.data.data[0];
  console.log('\n=== TEAM DATA STRUCTURE ===');
  console.log('Home Team:', JSON.stringify(game.homeTeam, null, 2));
  console.log('\nAway Team:', JSON.stringify(game.awayTeam, null, 2));
}
