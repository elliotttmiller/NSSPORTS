// Direct SDK test to verify it's working
import { getEvents } from './src/lib/sportsgameodds-sdk.js';

const startsAfter = new Date().toISOString();
const startsBefore = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

console.log('Fetching NBA games...');
console.log('Starts after:', startsAfter);
console.log('Starts before:', startsBefore);

try {
  const result = await getEvents({
    leagueID: 'basketball_nba',
    startsAfter,
    startsBefore,
    oddsAvailable: true,
    limit: 100
  });
  
  console.log(`\nFetched ${result.data.length} games`);
  
  if (result.data.length > 0) {
    const game = result.data[0];
    console.log('\nFirst game:', game.teams?.away?.names?.long, '@', game.teams?.home?.names?.long);
    console.log('Event ID:', game.eventID);
    console.log('Has odds?', !!game.odds);
    
    if (game.odds) {
      const oddsKeys = Object.keys(game.odds);
      console.log(`Odds keys (${oddsKeys.length} total):`, oddsKeys.slice(0, 10));
      
      // Check for main game odds
      const mlKey = oddsKeys.find(k => k.includes('-game-ml-'));
      const spKey = oddsKeys.find(k => k.includes('-game-sp-'));
      const ouKey = oddsKeys.find(k => k.includes('-game-ou-'));
      
      if (mlKey) {
        console.log('\nMoneyline sample:', mlKey, game.odds[mlKey]);
      }
      if (spKey) {
        console.log('Spread sample:', spKey, game.odds[spKey]);
      }
      if (ouKey) {
        console.log('Total sample:', ouKey, game.odds[ouKey]);
      }
    }
  }
} catch (error) {
  console.error('Error:', error.message);
}
