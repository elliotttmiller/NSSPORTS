import 'dotenv/config';
import { getSportsGameOddsClient } from '../../src/lib/sportsgameodds-sdk';

async function testNHLSpreads() {
  const client = getSportsGameOddsClient();
  
  console.log('🏒 Testing NHL Spread Data\n');
  
  try {
    // Fetch NHL games
    const events = await client.events.get({
      leagueID: 'NHL',
      finalized: false,
      limit: 5,
    });
    
    const games = events.data;
    console.log(`Found ${games.length} NHL games\n`);
    
    if (games.length === 0) {
      console.log('⚠️  No NHL games available');
      return;
    }
    
    // Analyze first game's odds structure
    const game = games[0];
    const gameAny = game as Record<string, unknown>;
    console.log('='.repeat(80));
    console.log(`Game: ${game.teams?.away?.names?.short || 'Away'} @ ${game.teams?.home?.names?.short || 'Home'}`);
    console.log(`EventID: ${game.eventID}`);
    console.log(`Start Time Fields:`);
    console.log(`  - startsAt: ${gameAny.startsAt}`);
    console.log(`  - commence: ${gameAny.commence}`);
    console.log(`  - startTime: ${gameAny.startTime}`);
    console.log('='.repeat(80));
    
    if (!game.odds) {
      console.log('❌ No odds data available');
      return;
    }
    
    console.log('\n📊 Available oddIDs:');
    const oddIDs = Object.keys(game.odds);
    console.log(`Total markets: ${oddIDs.length}\n`);
    
    // Find spread odds
    const spreadOddIDs = oddIDs.filter(id => id.includes('-sp-') || id.includes('-ats-'));
    console.log(`Spread markets found: ${spreadOddIDs.length}`);
    
    if (spreadOddIDs.length === 0) {
      console.log('\n⚠️  NO SPREAD MARKETS FOUND');
      console.log('\nAll available oddIDs:');
      oddIDs.forEach(id => console.log(`  - ${id}`));
      return;
    }
    
    console.log('\n🎯 Spread Market Details:\n');
    
    for (const oddID of spreadOddIDs) {
      const oddData = game.odds[oddID];
      console.log(`oddID: ${oddID}`);
      console.log(`  fairOddsAvailable: ${oddData.fairOddsAvailable}`);
      console.log(`  fairOdds: ${oddData.fairOdds}`);
      console.log(`  fairSpread: ${oddData.fairSpread}`);
      console.log(`  bookOddsAvailable: ${oddData.bookOddsAvailable}`);
      console.log(`  bookOdds: ${oddData.bookOdds}`);
      console.log(`  bookSpread: ${oddData.bookSpread}`);
      console.log('');
    }
    
    // Check for puck line specifically (NHL spread)
    const puckLineOddIDs = oddIDs.filter(id => id.includes('game') && (id.includes('-sp-') || id.includes('-pl-')));
    if (puckLineOddIDs.length > 0) {
      console.log('\n🏒 Puck Line (NHL Spread) Markets:');
      puckLineOddIDs.forEach(id => console.log(`  - ${id}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testNHLSpreads();
