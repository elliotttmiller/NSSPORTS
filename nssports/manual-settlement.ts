/**
 * Manual Settlement Test - Direct TypeScript
 */

import { syncFinishedGames } from './src/scripts/sync-game-status';
import { settleAllFinishedGames } from './src/services/bet-settlement';

async function runManualSettlement() {
  console.log('=== MANUAL SETTLEMENT TEST ===\n');

  try {
    // Step 1: Sync game status from SDK
    console.log('Step 1: Syncing game status from SDK...');
    const syncResult = await syncFinishedGames();
    
    console.log('\nSync Results:');
    console.log(`  Games checked: ${syncResult.gamesChecked}`);
    console.log(`  Games updated: ${syncResult.gamesUpdated}`);
    console.log(`  Bets settled: ${syncResult.betsSettled}`);
    
    if (syncResult.errors.length > 0) {
      console.log(`  Errors: ${syncResult.errors.length}`);
      syncResult.errors.forEach(err => console.log(`    - ${err}`));
    }

    // Step 2: Settle all finished games
    console.log('\nStep 2: Settling all finished games...');
    const settlementResult = await settleAllFinishedGames();
    
    console.log('\nSettlement Results:');
    console.log(`  Games processed: ${settlementResult.gamesProcessed}`);
    console.log(`  Bets settled: ${settlementResult.betsSettled}`);
    
    const won = settlementResult.results.filter(r => r.status === 'won').length;
    const lost = settlementResult.results.filter(r => r.status === 'lost').length;
    const push = settlementResult.results.filter(r => r.status === 'push').length;
    
    console.log(`\nBreakdown:`);
    console.log(`  Won: ${won}`);
    console.log(`  Lost: ${lost}`);
    console.log(`  Push: ${push}`);

    console.log('\n✅ Settlement complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Settlement failed:', error);
    console.error(error);
    process.exit(1);
  }
}

runManualSettlement();
