// Test odds structure 
import SportsGameOdds from 'sports-odds-api';

const client = new SportsGameOdds({
  apiKeyHeader: 'b0639641743e82a08d2fb9e0a4b7c421',
  enableCaching: false,
  enableConsensus: true,
  developmentMode: true,
});

async function testOddsStructure() {
  try {
    console.log('🔍 Fetching NBA events with odds...');
    
    const response = await client.events.get({
      leagueID: 'NBA',
      oddID: 'ml,sp,ou',
      oddsAvailable: true,
      fetchLimit: 1
    });
    
    const events = response.data || [];
    
    if (events.length === 0) {
      console.log('❌ No events found');
      return;
    }
    
    const event = events[0];
    console.log('✅ Found event:', event.eventID);
    console.log('📊 Total odds markets:', Object.keys(event.odds).length);
    
    // Find main game odds
    const mainGameOdds = {};
    for (const [key, value] of Object.entries(event.odds)) {
      if (key.includes('-game-')) {
        if (key.includes('ml-') || key.includes('sp-') || key.includes('ou-')) {
          mainGameOdds[key] = value;
        }
      }
    }
    
    console.log('\n🎯 MAIN GAME ODDS (moneyline, spread, total):');
    console.log('Found', Object.keys(mainGameOdds).length, 'main game markets');
    
    for (const [key, odds] of Object.entries(mainGameOdds)) {
      console.log(`\n${key}:`);
      console.log('  fairOdds:', odds.fairOdds);
      console.log('  bookOdds:', odds.bookOdds);
      console.log('  line:', odds.line);
      console.log('  consensus:', odds.consensus);
      
      // Show bookmaker data if available
      if (odds.byBookmaker && Object.keys(odds.byBookmaker).length > 0) {
        console.log('  bookmakers:', Object.keys(odds.byBookmaker).slice(0, 3).join(', '));
        
        // Show sample bookmaker odds
        const firstBookmaker = Object.keys(odds.byBookmaker)[0];
        const bookOdds = odds.byBookmaker[firstBookmaker];
        console.log(`  ${firstBookmaker}:`, {
          odds: bookOdds.odds,
          line: bookOdds.line
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOddsStructure();