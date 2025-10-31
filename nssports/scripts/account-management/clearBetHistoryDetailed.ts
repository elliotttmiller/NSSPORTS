#!/usr/bin/env tsx
/**
 * Clear Bet History with Detailed Report
 * 
 * This script provides a detailed breakdown of bet history per user
 * before clearing all bets. Useful for audit trails and verification.
 * 
 * Usage:
 *   npx tsx scripts/clearBetHistoryDetailed.ts
 * 
 * With automatic confirmation:
 *   npx tsx scripts/clearBetHistoryDetailed.ts --yes
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
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
      `${colors.yellow}Delete all bet history? (yes/no): ${colors.reset}`,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      }
    );
  });
}

interface UserBetStats {
  userId: string;
  username: string;
  name: string | null;
  balance: number;
  totalBets: number;
  pendingBets: number;
  wonBets: number;
  lostBets: number;
  pushedBets: number;
  totalStaked: number;
  totalPotentialPayout: number;
}

async function getUserBetStatistics(): Promise<UserBetStats[]> {
  // Get all users with their accounts
  const users = await prisma.user.findMany({
    include: {
      account: true,
      bets: {
        select: {
          status: true,
          stake: true,
          potentialPayout: true,
        },
      },
    },
  });

  return users.map(user => {
    const totalBets = user.bets.length;
    const pendingBets = user.bets.filter(b => b.status === 'pending').length;
    const wonBets = user.bets.filter(b => b.status === 'won').length;
    const lostBets = user.bets.filter(b => b.status === 'lost').length;
    const pushedBets = user.bets.filter(b => b.status === 'pushed').length;
    const totalStaked = user.bets.reduce((sum, b) => sum + b.stake, 0);
    const totalPotentialPayout = user.bets
      .filter(b => b.status === 'pending')
      .reduce((sum, b) => sum + b.potentialPayout, 0);

    return {
      userId: user.id,
      username: user.username,
      name: user.name,
      balance: user.account?.balance || 0,
      totalBets,
      pendingBets,
      wonBets,
      lostBets,
      pushedBets,
      totalStaked,
      totalPotentialPayout,
    };
  });
}

async function displayDetailedReport() {
  log('\n📊 DETAILED BET HISTORY REPORT', 'cyan');
  log('━'.repeat(80), 'cyan');

  const userStats = await getUserBetStatistics();
  const usersWithBets = userStats.filter(u => u.totalBets > 0);

  if (usersWithBets.length === 0) {
    log('\n✅ No bet history found - database is clean!', 'green');
    return false;
  }

  log(`\n👥 Users with Bet History: ${usersWithBets.length}`, 'blue');
  log('━'.repeat(80), 'gray');

  // Display each user's statistics
  for (const stats of usersWithBets) {
    log(`\n👤 User: ${stats.username}`, 'yellow');
    if (stats.name) log(`   Name: ${stats.name}`, 'gray');
    log(`   User ID: ${stats.userId}`, 'gray');
    log(`   Current Balance: $${stats.balance.toFixed(2)}`, 'green');
    log('   ─'.repeat(40), 'gray');
    log(`   📊 Bet Statistics:`, 'cyan');
    log(`      Total Bets: ${stats.totalBets}`, 'reset');
    log(`      ├─ Pending: ${stats.pendingBets}`, 'yellow');
    log(`      ├─ Won: ${stats.wonBets}`, 'green');
    log(`      ├─ Lost: ${stats.lostBets}`, 'red');
    log(`      └─ Pushed: ${stats.pushedBets}`, 'blue');
    log(`   💰 Financial:`, 'cyan');
    log(`      Total Staked: $${stats.totalStaked.toFixed(2)}`, 'reset');
    log(`      Potential Payout (pending): $${stats.totalPotentialPayout.toFixed(2)}`, 'yellow');
  }

  // Overall summary
  log('\n━'.repeat(80), 'gray');
  log('📈 OVERALL SUMMARY', 'cyan');
  log('━'.repeat(80), 'gray');

  const totalBets = usersWithBets.reduce((sum, u) => sum + u.totalBets, 0);
  const totalPending = usersWithBets.reduce((sum, u) => sum + u.pendingBets, 0);
  const totalWon = usersWithBets.reduce((sum, u) => sum + u.wonBets, 0);
  const totalLost = usersWithBets.reduce((sum, u) => sum + u.lostBets, 0);
  const totalPushed = usersWithBets.reduce((sum, u) => sum + u.pushedBets, 0);
  const totalStaked = usersWithBets.reduce((sum, u) => sum + u.totalStaked, 0);
  const totalPotential = usersWithBets.reduce((sum, u) => sum + u.totalPotentialPayout, 0);

  log(`\nTotal Bets Across All Users: ${totalBets}`, 'blue');
  log(`  ├─ Pending: ${totalPending}`, 'yellow');
  log(`  ├─ Won: ${totalWon}`, 'green');
  log(`  ├─ Lost: ${totalLost}`, 'red');
  log(`  └─ Pushed: ${totalPushed}`, 'blue');
  log(`\nTotal Amount Staked: $${totalStaked.toFixed(2)}`, 'magenta');
  log(`Total Potential Payout: $${totalPotential.toFixed(2)}`, 'yellow');

  log('\n━'.repeat(80), 'gray');

  return true;
}

async function clearAllBets() {
  log('\n🗑️  Clearing all bet history...', 'yellow');
  
  const result = await prisma.bet.deleteMany({});
  
  log(`\n✅ Successfully deleted ${result.count} bets!`, 'green');
  log('━'.repeat(80), 'green');
  
  // Verify deletion
  const remainingBets = await prisma.bet.count();
  const totalUsers = await prisma.user.count();
  
  log('\n📊 Post-Deletion Status:', 'blue');
  log(`  ✅ Remaining Bets: ${remainingBets}`, 'green');
  log(`  ✅ User Accounts Preserved: ${totalUsers}`, 'green');
  log(`  ✅ User Balances Preserved: YES`, 'green');
  log(`  ✅ User Credentials Preserved: YES`, 'green');
  
  log('\n🎯 Bet history cleared! Ready for fresh testing.', 'magenta');
}

async function main() {
  try {
    // Display detailed report
    const hasBets = await displayDetailedReport();
    
    if (!hasBets) {
      log('\nℹ️  Nothing to clear.\n', 'blue');
      return;
    }

    // Ask for confirmation (unless --yes flag)
    const skipConfirmation = process.argv.includes('--yes') || process.argv.includes('-y');
    
    if (!skipConfirmation) {
      log('\n⚠️  WARNING: This will permanently delete all bet history!', 'red');
      log('⚠️  User accounts, balances, and credentials will NOT be affected.\n', 'yellow');
      
      const confirmed = await askConfirmation();
      
      if (!confirmed) {
        log('\n❌ Operation cancelled. Bet history preserved.\n', 'red');
        return;
      }
    }

    // Clear all bets
    await clearAllBets();
    
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
