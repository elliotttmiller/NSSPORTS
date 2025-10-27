// Check what the API is actually returning
const response = await fetch('http://localhost:3000/api/games?page=1&limit=10');
const data = await response.json();

console.log('\n=== FULL API RESPONSE ===');
console.log(JSON.stringify(data, null, 2));

// Access games from the correct nested path
const games = data?.data?.data || [];

if (games && games.length > 0) {
  const game = games[0];
  
  console.log('\n=== API RESPONSE STRUCTURE ===');
  console.log('Game:', game.awayTeam?.name, '@', game.homeTeam?.name);
  console.log('\n=== ODDS STRUCTURE ===');
  console.log(JSON.stringify(game.odds, null, 2));
  
  console.log('\n=== ODDS VALUES ===');
  if (game.odds) {
    console.log('Moneyline Home:', game.odds.moneyline?.home?.odds);
    console.log('Moneyline Away:', game.odds.moneyline?.away?.odds);
    console.log('Spread Home:', game.odds.spread?.home?.odds, game.odds.spread?.home?.line);
    console.log('Spread Away:', game.odds.spread?.away?.odds, game.odds.spread?.away?.line);
    console.log('Total Over:', game.odds.total?.over?.odds, game.odds.total?.line);
    console.log('Total Under:', game.odds.total?.under?.odds, game.odds.total?.line);
  } else {
    console.log('NO ODDS OBJECT IN RESPONSE!');
  }
} else {
  console.log('No games in response');
}
