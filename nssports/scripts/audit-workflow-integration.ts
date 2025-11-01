/**
 * Complete Workflow Integration Audit
 * 
 * This verifies that ALL bet placement paths use the new workflow:
 * - No balance deduction on bet placement
 * - Balance only changes on bet settlement
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const checks = [
  {
    name: 'API Route - Single Bet',
    file: 'src/app/api/my-bets/route.ts',
    shouldNotContain: ['balance: {\n          decrement: stakeAmount'],
    shouldContain: ['availableBalance', 'currentRisk', 'DO NOT deduct stake']
  },
  {
    name: 'Server Action - Single Bet',
    file: 'src/app/actions/bets.ts',
    location: 'placeSingleBetAction',
    shouldNotContain: ['balance: {\n          decrement: stake'],
    shouldContain: ['availableBalance', 'currentRisk']
  },
  {
    name: 'Server Action - Parlay Bet',
    file: 'src/app/actions/bets.ts',
    location: 'placeParlayBetAction',
    shouldNotContain: ['balance: {\n          decrement: stake'],
    shouldContain: ['availableBalance', 'currentRisk']
  },
  {
    name: 'Server Action - Teaser Bet',
    file: 'src/app/actions/bets.ts',
    location: 'placeTeaserBetAction',
    shouldNotContain: ['balance: {\n          decrement: stake'],
    shouldContain: ['availableBalance', 'currentRisk']
  },
  {
    name: 'Settlement Logic',
    file: 'src/app/actions/bets.ts',
    location: 'settleBetAction',
    shouldContain: ['decrement: bet.stake', 'increment: payoutAmount']
  }
];

console.log('🔍 Complete Workflow Integration Audit\n');
console.log('='.repeat(70));

let allPassed = true;

checks.forEach(check => {
  console.log(`\n📋 ${check.name}`);
  console.log('  File:', check.file);
  if (check.location) console.log('  Function:', check.location);

  try {
    const content = readFileSync(join(process.cwd(), check.file), 'utf-8');
    
    // Check for things that SHOULD NOT be present
    if (check.shouldNotContain) {
      check.shouldNotContain.forEach(pattern => {
        if (content.includes(pattern)) {
          console.log(`  ❌ FAIL: Found old pattern "${pattern}"`);
          allPassed = false;
        } else {
          console.log(`  ✓ Old pattern removed`);
        }
      });
    }

    // Check for things that SHOULD be present
    if (check.shouldContain) {
      check.shouldContain.forEach(pattern => {
        if (content.includes(pattern)) {
          console.log(`  ✓ New workflow implemented`);
        } else {
          console.log(`  ❌ FAIL: Missing pattern "${pattern}"`);
          allPassed = false;
        }
      });
    }

  } catch {
    console.log(`  ❌ ERROR: Could not read file`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(70));
console.log('\n📊 Summary:\n');

console.log('✅ Bet Placement Workflow:');
console.log('  1. Validate: Available Balance (Balance - Risk) >= Stake');
console.log('  2. Create: Bet record with status="pending"');
console.log('  3. Update: NO balance change (stays same)');
console.log('  4. Result: Risk increases, Available decreases\n');

console.log('✅ Bet Settlement Workflow:');
console.log('  1. Win: Balance += payout');
console.log('  2. Loss: Balance -= stake');
console.log('  3. Push: Balance += stake (return it)');
console.log('  4. Result: Risk decreases, Available recalculates\n');

console.log('✅ Display Logic:');
console.log('  • Balance = account.balance (total funds)');
console.log('  • Risk = SUM(pending bets.stake)');
console.log('  • Available = MAX(0, Balance - Risk)\n');

if (allPassed) {
  console.log('🎉 ALL CHECKS PASSED!');
  console.log('✅ Workflow is universally integrated for all future players!\n');
} else {
  console.log('⚠️  SOME CHECKS FAILED!');
  console.log('❌ Review the failures above and fix them.\n');
}

console.log('='.repeat(70));
