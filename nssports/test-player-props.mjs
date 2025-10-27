/**
 * Test player props endpoint to verify it's working independently
 */

async function testPlayerProps() {
  try {
    console.log('🔍 TESTING PLAYER PROPS ENDPOINT\n');
    console.log('=' .repeat(80) + '\n');
    
    // First get a game ID
    const gamesResponse = await fetch('http://localhost:3000/api/games?limit=1');
    const gamesResult = await gamesResponse.json();
    
    if (!gamesResult.success || !gamesResult.data?.data?.[0]) {
      console.error('❌ No games found');
      return;
    }
    
    const gameId = gamesResult.data.data[0].id;
    const gameInfo = gamesResult.data.data[0];
    
    console.log(`📊 Testing with game: ${gameInfo.awayTeam.name} @ ${gameInfo.homeTeam.name}`);
    console.log(`   Game ID: ${gameId}`);
    console.log(`   League: ${gameInfo.leagueId}\n`);
    
    // Fetch player props for this game
    console.log('📡 Fetching player props...\n');
    const propsResponse = await fetch(`http://localhost:3000/api/player-props?gameId=${gameId}`);
    const propsResult = await propsResponse.json();
    
    if (!propsResponse.ok || !propsResult.success) {
      console.log(`⚠️  Player props not available for this game`);
      console.log(`   Response: ${JSON.stringify(propsResult, null, 2)}`);
      return;
    }
    
    const props = propsResult.data;
    
    console.log(`✅ Found ${props.length} player props\n`);
    
    if (props.length === 0) {
      console.log('ℹ️  No player props available for this game (this is normal for some games)');
      return;
    }
    
    // Group by stat type
    const byStatType = {};
    props.forEach(prop => {
      if (!byStatType[prop.statType]) byStatType[prop.statType] = [];
      byStatType[prop.statType].push(prop);
    });
    
    console.log('📈 Props by Stat Type:');
    for (const [statType, statProps] of Object.entries(byStatType)) {
      console.log(`  ${statType}: ${statProps.length} props`);
    }
    
    // Show sample props
    console.log('\n📋 Sample Player Props:\n');
    props.slice(0, 5).forEach((prop, index) => {
      console.log(`${index + 1}. ${prop.playerName} (${prop.position}) - ${prop.statType}`);
      console.log(`   Line: ${prop.line}`);
      console.log(`   Over: ${prop.overOdds > 0 ? '+' : ''}${prop.overOdds}`);
      console.log(`   Under: ${prop.underOdds > 0 ? '+' : ''}${prop.underOdds}`);
      console.log('');
    });
    
    console.log('✅ Player props endpoint is working correctly!');
    console.log('   This is completely separate from main game odds filtering.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPlayerProps();
