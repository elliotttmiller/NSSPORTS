/**
 * Diagnostic script to inspect raw odds data from API
 * Compares NBA vs NFL odds structure to identify the issue
 */

async function diagnoseOdds() {
  try {
    console.log('🔍 ODDS DATA DIAGNOSTIC\n');
    console.log('=' .repeat(80) + '\n');
    
    // Fetch games
    const response = await fetch('http://localhost:3000/api/games?limit=50');
    const result = await response.json();
    
    if (!result.success || !result.data?.data) {
      console.error('❌ Failed to fetch games');
      return;
    }
    
    const games = result.data.data;
    
    // Group by league
    const nbaGames = games.filter(g => g.leagueId === 'NBA');
    const nflGames = games.filter(g => g.leagueId === 'NFL');
    const nhlGames = games.filter(g => g.leagueId === 'NHL');
    
    console.log(`📊 Found: ${nbaGames.length} NBA, ${nflGames.length} NFL, ${nhlGames.length} NHL games\n`);
    
    // Function to analyze odds structure
    function analyzeOdds(game, leagueName) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`${leagueName}: ${game.awayTeam.name} @ ${game.homeTeam.name}`);
      console.log(`Game ID: ${game.id}`);
      console.log(`Start: ${game.startTime}`);
      console.log('-'.repeat(80));
      
      const odds = game.odds;
      
      // Check if odds exist
      if (!odds) {
        console.log('❌ NO ODDS OBJECT');
        return;
      }
      
      // Spread analysis
      console.log('\n📈 SPREAD:');
      console.log(`  Home: line=${odds.spread?.home?.line ?? 'NULL'}, odds=${odds.spread?.home?.odds ?? 'NULL'}`);
      console.log(`  Away: line=${odds.spread?.away?.line ?? 'NULL'}, odds=${odds.spread?.away?.odds ?? 'NULL'}`);
      
      if (odds.spread?.home?.odds === 0 || odds.spread?.away?.odds === 0) {
        console.log('  ⚠️  WARNING: Zero odds detected (using default fallback!)');
      }
      
      // Moneyline analysis
      console.log('\n💰 MONEYLINE:');
      console.log(`  Home: odds=${odds.moneyline?.home?.odds ?? 'NULL'}`);
      console.log(`  Away: odds=${odds.moneyline?.away?.odds ?? 'NULL'}`);
      
      if (odds.moneyline?.home?.odds === 0 || odds.moneyline?.away?.odds === 0) {
        console.log('  ⚠️  WARNING: Zero odds detected (using default fallback!)');
      }
      
      // Total analysis
      console.log('\n🎯 TOTAL:');
      console.log(`  Over: line=${odds.total?.over?.line ?? 'NULL'}, odds=${odds.total?.over?.odds ?? 'NULL'}`);
      console.log(`  Under: line=${odds.total?.under?.line ?? 'NULL'}, odds=${odds.total?.under?.odds ?? 'NULL'}`);
      
      if (odds.total?.over?.odds === 0 || odds.total?.under?.odds === 0) {
        console.log('  ⚠️  WARNING: Zero odds detected (using default fallback!)');
      }
      
      // Summary
      const hasValidSpread = odds.spread?.home?.odds !== 0 && odds.spread?.away?.odds !== 0;
      const hasValidML = odds.moneyline?.home?.odds !== 0 && odds.moneyline?.away?.odds !== 0;
      const hasValidTotal = odds.total?.over?.odds !== 0 && odds.total?.under?.odds !== 0;
      
      console.log('\n✅ VALIDITY CHECK:');
      console.log(`  Spread: ${hasValidSpread ? '✅ VALID' : '❌ INVALID (using defaults)'}`);
      console.log(`  Moneyline: ${hasValidML ? '✅ VALID' : '❌ INVALID (using defaults)'}`);
      console.log(`  Total: ${hasValidTotal ? '✅ VALID' : '❌ INVALID (using defaults)'}`);
    }
    
    // Analyze first NBA game
    if (nbaGames.length > 0) {
      analyzeOdds(nbaGames[0], '🏀 NBA');
    }
    
    // Analyze first NFL game
    if (nflGames.length > 0) {
      analyzeOdds(nflGames[0], '🏈 NFL');
    }
    
    // Analyze first NHL game
    if (nhlGames.length > 0) {
      analyzeOdds(nhlGames[0], '🏒 NHL');
    }
    
    // Summary comparison
    console.log(`\n${'='.repeat(80)}`);
    console.log('📋 SUMMARY COMPARISON\n');
    
    const nbaValid = nbaGames.filter(g => 
      g.odds?.spread?.home?.odds !== 0 && 
      g.odds?.moneyline?.home?.odds !== 0 &&
      g.odds?.total?.over?.odds !== 0
    ).length;
    
    const nflValid = nflGames.filter(g => 
      g.odds?.spread?.home?.odds !== 0 && 
      g.odds?.moneyline?.home?.odds !== 0 &&
      g.odds?.total?.over?.odds !== 0
    ).length;
    
    const nhlValid = nhlGames.filter(g => 
      g.odds?.spread?.home?.odds !== 0 && 
      g.odds?.moneyline?.home?.odds !== 0 &&
      g.odds?.total?.over?.odds !== 0
    ).length;
    
    console.log(`NBA: ${nbaValid}/${nbaGames.length} games with valid odds (${nbaGames.length - nbaValid} using defaults)`);
    console.log(`NFL: ${nflValid}/${nflGames.length} games with valid odds (${nflGames.length - nflValid} using defaults)`);
    console.log(`NHL: ${nhlValid}/${nhlGames.length} games with valid odds (${nhlGames.length - nhlValid} using defaults)`);
    
    if (nbaGames.length - nbaValid > 0) {
      console.log('\n⚠️  CRITICAL ISSUE: NBA games are using default fallback odds!');
      console.log('This means odds data is NOT being fetched/stored correctly for NBA.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

diagnoseOdds();
