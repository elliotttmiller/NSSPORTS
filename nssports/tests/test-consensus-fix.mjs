/**
 * Fetch games to populate cache, then diagnose
 */

async function testConsensusFix() {
  try {
    console.log('🔄 Fetching games to populate cache...\n');
    
    const response = await fetch('http://localhost:3000/api/games?leagueId=NBA');
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ Fetched ${data.data?.length || 0} NBA games\n`);
    
    if (data.data && data.data.length > 0) {
      const firstGame = data.data[0];
      console.log('📊 FIRST GAME ODDS:\n');
      console.log(`Game: ${firstGame.awayTeam.shortName} @ ${firstGame.homeTeam.shortName}\n`);
      
      console.log('TOTALS:');
      console.log(`  Over:  ${firstGame.odds.total.over?.line || 'N/A'} (${firstGame.odds.total.over?.odds})`);
      console.log(`  Under: ${firstGame.odds.total.under?.line || 'N/A'} (${firstGame.odds.total.under?.odds})`);
      
      console.log('\nSPREAD:');
      console.log(`  Home:  ${firstGame.odds.spread.home?.line || 'N/A'} (${firstGame.odds.spread.home?.odds})`);
      console.log(`  Away:  ${firstGame.odds.spread.away?.line || 'N/A'} (${firstGame.odds.spread.away?.odds})`);
      
      console.log('\nMONEYLINE:');
      console.log(`  Home:  ${firstGame.odds.moneyline.home?.odds}`);
      console.log(`  Away:  ${firstGame.odds.moneyline.away?.odds}`);
      
      // Check if total is reasonable
      const totalLine = firstGame.odds.total.over?.line;
      if (totalLine) {
        if (totalLine > 200 && totalLine < 250) {
          console.log('\n✅ CONSENSUS FIX WORKING! Total line is in proper NBA range (200-250)');
        } else if (totalLine < 150) {
          console.log('\n❌ STILL BROKEN! Total line is showing alternate/half line');
        }
      }
    }
    
    // Now run database diagnostic
    console.log('\n' + '='.repeat(80));
    console.log('Running database diagnostic...\n');
    
    const { execSync } = await import('child_process');
    execSync('node diagnose-oddids.mjs', { stdio: 'inherit' });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testConsensusFix();
