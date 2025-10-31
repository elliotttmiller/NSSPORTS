#!/usr/bin/env tsx
/**
 * Clear All Bet History Script
 * 
 * Purpose: Reset all user bet history for fresh testing
 * 
 * What this script DOES:
 * ✅ Deletes all bets (pending, won, lost, pushed)
 * ✅ Preserves user accounts
 * ✅ Preserves user balances
 * ✅ Preserves user credentials (username/password)
 * ✅ Preserves all other user data
 * 
 * What this script does NOT do:
 * ❌ Does NOT delete users
 * ❌ Does NOT reset balances
 * ❌ Does NOT delete games/odds/props
 * 
 * Usage:
 *   npx tsx scripts/clearBetHistory.ts
 * 
 * Or with confirmation skip:
 *   npx tsx scripts/clearBetHistory.ts --yes
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function askConfirmation(): Promise<boolean> {
  const rl = createInterface();
  
  return new Promise((resolve) => {
    rl.question(
      `${colors.yellow}Are you sure you want to delete ALL bet history? (yes/no): ${colors.reset}`,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      }
    );
  });
}

async function getBetStatistics() {
  const [totalBets, pendingBets, settledBets, totalUsers, totalStaked] = await Promise.all([
    prisma.bet.count(),
    prisma.bet.count({ where: { status: 'pending' } }),
    prisma.bet.count({ where: { status: { not: 'pending' } } }),
    prisma.user.count(),
    prisma.bet.aggregate({
      _sum: { stake: true },
    }),
  ]);

  return {
    totalBets,
    pendingBets,
    settledBets,
    totalUsers,
    totalStaked: totalStaked._sum.stake || 0,
  };
}

async function clearBetHistory() {
  log('\n🧹 Starting Bet History Cleanup...', 'cyan');
  log('━'.repeat(50), 'cyan');

  // Get statistics before deletion
  log('\n📊 Current Statistics:', 'blue');
  const beforeStats = await getBetStatistics();
  
  log(`  Total Users: ${beforeStats.totalUsers}`, 'reset');
  log(`  Total Bets: ${beforeStats.totalBets}`, 'yellow');
  log(`    - Pending: ${beforeStats.pendingBets}`, 'yellow');
  log(`    - Settled: ${beforeStats.settledBets}`, 'yellow');
  log(`  Total Amount Staked: $${beforeStats.totalStaked.toFixed(2)}`, 'yellow');

  // Check if there are any bets to delete
  if (beforeStats.totalBets === 0) {
    log('\n✅ No bets found - database already clean!', 'green');
    return;
  }

  // Ask for confirmation (unless --yes flag)
  const skipConfirmation = process.argv.includes('--yes') || process.argv.includes('-y');
  
  if (!skipConfirmation) {
    log('\n⚠️  WARNING: This action cannot be undone!', 'red');
    log('⚠️  All bet history will be permanently deleted.', 'red');
    log('✅ User accounts and balances will NOT be affected.\n', 'green');
    
    const confirmed = await askConfirmation();
    
    if (!confirmed) {
      log('\n❌ Operation cancelled.', 'red');
      return;
    }
  }

  // Delete all bets
  log('\n🗑️  Deleting all bets...', 'yellow');
  
  try {
    const result = await prisma.bet.deleteMany({});
    
    log(`\n✅ Successfully deleted ${result.count} bets!`, 'green');
    log('━'.repeat(50), 'green');
    
    // Verify deletion
    const afterStats = await getBetStatistics();
    
    log('\n📊 Updated Statistics:', 'blue');
    log(`  Total Users: ${afterStats.totalUsers} (unchanged ✓)`, 'green');
    log(`  Total Bets: ${afterStats.totalBets}`, 'green');
    log(`  Total Amount Staked: $${afterStats.totalStaked.toFixed(2)}`, 'green');
    
    // Summary
    log('\n📋 Summary:', 'cyan');
    log(`  ✅ Deleted: ${beforeStats.totalBets} bets`, 'green');
    log(`  ✅ Preserved: ${afterStats.totalUsers} user accounts`, 'green');
    log(`  ✅ Preserved: All user balances`, 'green');
    log(`  ✅ Preserved: All user credentials`, 'green');
    
    log('\n🎯 Your application is ready for fresh testing!', 'magenta');
    log('   Users can now place bets with a clean slate.\n', 'magenta');
    
  } catch (error) {
    log('\n❌ Error deleting bets:', 'red');
    console.error(error);
    throw error;
  }
}

async function main() {
  try {
    await clearBetHistory();
  } catch (error) {
    log('\n❌ Script failed:', 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
