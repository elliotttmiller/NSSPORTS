import 'dotenv/config';
import { transformSDKEvents } from '../src/lib/transformers/sportsgameodds-sdk';
import { getSportsGameOddsClient } from '../src/lib/sportsgameodds-sdk';

async function testNHLTransformedSpreads() {
  const client = getSportsGameOddsClient();
  
  console.log('🏒 Testing NHL Spread Transformation\n');
  
  try {
    // Fetch NHL games
    const events = await client.events.get({
      leagueID: 'NHL',
      finalized: false,
      limit: 3,
    });
    
    const games = transformSDKEvents(events.data);
    console.log(`✅ Transformed ${games.length} NHL games\n`);
    
    if (games.length === 0) {
      console.log('⚠️  No NHL games available');
      return;
    }
    
    // Check spread data for each game
    for (const game of games) {
      console.log('='.repeat(80));
      console.log(`Game: ${game.awayTeam.shortName} @ ${game.homeTeam.shortName}`);
      console.log('='.repeat(80));
      
      console.log('\n📊 Spread Lines:');
      console.log(`  Home: ${game.odds.spread.home.line ?? 'N/A'} (odds: ${game.odds.spread.home.odds})`);
      console.log(`  Away: ${game.odds.spread.away.line ?? 'N/A'} (odds: ${game.odds.spread.away.odds})`);
      
      console.log('\n💰 Moneyline:');
      console.log(`  Home: ${game.odds.moneyline.home.odds}`);
      console.log(`  Away: ${game.odds.moneyline.away.odds}`);
      
      console.log('\n🎯 Total:');
      console.log(`  Over: ${game.odds.total.over?.line ?? 'N/A'} (odds: ${game.odds.total.over?.odds ?? 'N/A'})`);
      console.log(`  Under: ${game.odds.total.under?.line ?? 'N/A'} (odds: ${game.odds.total.under?.odds ?? 'N/A'})`);
      
      // Validation
      const hasValidSpread = game.odds.spread.home.line !== undefined && 
                             game.odds.spread.away.line !== undefined;
      const spreadIsNonZero = game.odds.spread.home.line !== 0;
      
      if (!hasValidSpread) {
        console.log('\n❌ ERROR: Spread line is missing!');
      } else if (!spreadIsNonZero) {
        console.log('\n⚠️  WARNING: Spread line is 0 (unusual but valid for pick\'em games)');
      } else {
        console.log('\n✅ Spread lines look correct');
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testNHLTransformedSpreads();
