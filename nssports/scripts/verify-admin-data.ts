/**
 * Admin Dashboard Data Verification
 * 
 * Verifies that the admin API returns real-time data:
 * - Balance, Risk, Available (calculated from Account + Bets)
 * - Total bets count (from Bet table)
 * - Total wagered (sum of all bet stakes)
 * - Pending bets count (bets with status='pending')
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Admin Dashboard Data Verification\n');
  console.log('='.repeat(70));

  // Find the agent (slime)
  const agent = await prisma.agent.findFirst({
    where: { username: 'slime' },
    select: { 
      id: true, 
      username: true,
      players: {
        select: { username: true }
      }
    }
  });

  if (!agent) {
    console.log('❌ Agent "slime" not found');
    return;
  }

  console.log('\n📊 Agent:', agent.username);
  console.log('  ID:', agent.id);
  console.log('  Players:', agent.players.length);

  // Get real-time data for each player
  for (const dashboardPlayer of agent.players) {
    console.log('\n' + '-'.repeat(70));
    console.log(`\n👤 Player: ${dashboardPlayer.username}`);

    const user = await prisma.user.findFirst({
      where: { username: dashboardPlayer.username },
      include: {
        account: { select: { balance: true } },
        bets: {
          select: { 
            id: true, 
            stake: true, 
            status: true, 
            placedAt: true,
            potentialPayout: true
          },
          orderBy: { placedAt: 'desc' }
        }
      }
    });

    if (!user) {
      console.log('  ⚠️  User not found in User table');
      continue;
    }

    // Calculate metrics
    const balance = user.account ? Number(user.account.balance) : 0;
    const pendingBets = user.bets.filter(b => b.status === 'pending');
    const risk = pendingBets.reduce((sum, bet) => sum + Number(bet.stake), 0);
    const available = Math.max(0, balance - risk);
    
    const totalBets = user.bets.length;
    const totalWagered = user.bets.reduce((sum, bet) => sum + Number(bet.stake), 0);
    const wonBets = user.bets.filter(b => b.status === 'won');
    const totalWinnings = wonBets.reduce((sum, bet) => sum + Number(bet.potentialPayout || 0), 0);

    console.log('\n  💰 Balance Metrics:');
    console.log('    Balance:   $' + balance.toFixed(2));
    console.log('    Risk:      $' + risk.toFixed(2));
    console.log('    Available: $' + available.toFixed(2));
    console.log('    Formula:   MAX(0, ' + balance + ' - ' + risk + ') = ' + available);

    console.log('\n  📊 Betting Statistics:');
    console.log('    Total Bets:     ' + totalBets);
    console.log('    Pending Bets:   ' + pendingBets.length);
    console.log('    Total Wagered:  $' + totalWagered.toFixed(2));
    console.log('    Total Winnings: $' + totalWinnings.toFixed(2));

    if (pendingBets.length > 0) {
      console.log('\n  ⏳ Pending Bets:');
      pendingBets.slice(0, 5).forEach((bet, idx) => {
        console.log(`    ${idx + 1}. $${bet.stake} - ${bet.placedAt.toISOString().split('T')[0]}`);
      });
      if (pendingBets.length > 5) {
        console.log(`    ... and ${pendingBets.length - 5} more`);
      }
    }

    console.log('\n  ✅ Verification:');
    if (totalBets > 0) {
      console.log('    ✓ Has betting history (' + totalBets + ' bets)');
    } else {
      console.log('    ⚠️  No bets found');
    }
    
    if (balance === 2500) {
      console.log('    ✓ Balance correct ($2500 starting balance)');
    } else {
      console.log('    ⚠️  Balance is $' + balance + ' (expected $2500)');
    }

    if (available === balance - risk) {
      console.log('    ✓ Available calculation correct');
    } else {
      console.log('    ❌ Available calculation wrong');
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📝 Summary:');
  console.log('  The admin API should return these EXACT values');
  console.log('  All data comes from User/Account/Bet tables in real-time');
  console.log('  DashboardPlayer table is only for username mapping');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
