import { syncFinishedGames } from './src/scripts/sync-game-status';
import { settleAllFinishedGames } from './src/services/bet-settlement';

async function test() {
  try {
    console.log('\n========================================');
    console.log('Testing Settlement Cycle');
    console.log('========================================\n');
    
    console.log('Step 1: Syncing game status from SDK...');
    const syncResult = await syncFinishedGames();
    console.log('✅ Sync complete:', syncResult);
    
    console.log('\nStep 2: Settling bets for finished games...');
    const settlementResult = await settleAllFinishedGames();
    console.log('✅ Settlement complete:', settlementResult);
    
    console.log('\n========================================');
    console.log('Settlement cycle completed successfully!');
    console.log('========================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Settlement cycle failed:');
    console.error(error);
    process.exit(1);
  }
}

test();
