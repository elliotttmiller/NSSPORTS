#!/usr/bin/env tsx
/**
 * Test Live Bet Settlement - Memphis @ Cleveland Game
 * ═══════════════════════════════════════════════════════════════
 * 
 * Tests bet settlement on 4 active bets for user 'slime':
 * 1. Player Prop - De'Andre Hunter OVER 2.5 assists
 * 2. Moneyline - CLE WIN
 * 3. Total - UNDER 238
 * 4. Spread - CLE -10.5
 * 
 * Process:
 * 1. Find all 4 bets on MEM @ CLE game
 * 2. Simulate realistic game ending with final scores
 * 3. Trigger settlement for all bets
 * 4. Verify each bet type settles correctly
 */

import { PrismaClient } from '@prisma/client';
import { settleBet, gradePlayerPropBet } from '../../src/services/bet-settlement';
import type { PlayerGameStats } from '../../src/lib/player-stats';

const prisma = new PrismaClient();

// Mock player stats for De'Andre Hunter
const MOCK_PLAYER_STATS: Record<string, PlayerGameStats> = {
  'DEANDRE_HUNTER_1_NBA': {
    points: 18,
    rebounds: 4,
    assists: 3,  // Over 2.5 - BET WINS
    steals: 1,
    blocks: 0,
    turnovers: 2,
    minutes: 32,
    fieldGoalsMade: 7,
    fieldGoalsAttempted: 14,
    threePointersMade: 2,
    threePointersAttempted: 5,
    freeThrowsMade: 2,
    freeThrowsAttempted: 2
  }
};

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🧪 MEMPHIS @ CLEVELAND - MULTI-BET SETTLEMENT TEST');
  console.log('═'.repeat(80) + '\n');

  try {
    // Step 1: Find user 'slime'
    const user = await prisma.user.findFirst({
      where: { username: 'slime' }
    });

    if (!user) {
      console.error('❌ User "slime" not found');
      return;
    }

    console.log(`✅ Found user: ${user.username} (${user.id})\n`);

    // Step 2: Find all pending bets for MEM @ CLE game
    const activeBets = await prisma.bet.findMany({
      where: {
        userId: user.id,
        status: 'pending',
        game: {
          OR: [
            { homeTeam: { shortName: { contains: 'CLE' } } },
            { awayTeam: { shortName: { contains: 'MEM' } } }
          ]
        }
      },
      include: {
        game: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        }
      }
    });

    if (activeBets.length === 0) {
      console.log('ℹ️  No active bets found for MEM @ CLE game');
      return;
    }

    console.log(`📊 Found ${activeBets.length} active bet(s) on MEM @ CLE:\n`);

    // Display all bets
    activeBets.forEach((bet, idx) => {
      console.log(`${idx + 1}. ${bet.betType.toUpperCase()}`);
      console.log(`   Bet ID: ${bet.id}`);
      console.log(`   Selection: ${bet.selection}`);
      if (bet.line !== null && bet.line !== undefined) {
        console.log(`   Line: ${bet.line}`);
      }
      console.log(`   Odds: ${bet.odds}`);
      console.log(`   Stake: $${bet.stake}`);
      console.log(`   Potential Payout: $${bet.potentialPayout}`);
      console.log('');
    });

    const game = activeBets[0]?.game;
    if (!game) {
      console.error('❌ No game found');
      return;
    }

    console.log('─'.repeat(80));
    console.log(`🏀 Game: ${game.awayTeam?.name} @ ${game.homeTeam?.name}`);
    console.log(`   Status: ${game.status}`);
    console.log(`   Current Score: ${game.awayScore || 0} - ${game.homeScore || 0}`);
    console.log('─'.repeat(80) + '\n');

    // Step 3: Simulate realistic game ending
    // Based on the bets, let's create a scenario:
    // - CLE wins (moneyline)
    // - CLE covers -10.5 spread
    // - Total goes UNDER 238
    // - De'Andre Hunter gets OVER 2.5 assists (3 assists)
    
    const finalAwayScore = 105; // Memphis
    const finalHomeScore = 118; // Cleveland (wins by 13, covers -10.5)
    const finalTotal = finalAwayScore + finalHomeScore; // 223 (under 238)

    console.log('🎯 SIMULATED FINAL SCORE:');
    console.log(`   Memphis: ${finalAwayScore}`);
    console.log(`   Cleveland: ${finalHomeScore}`);
    console.log(`   Total: ${finalTotal}`);
    console.log(`   Spread: CLE wins by ${finalHomeScore - finalAwayScore}`);
    console.log('');

    // Determine outcomes
    console.log('📋 EXPECTED OUTCOMES:');
    activeBets.forEach(bet => {
      let expectedOutcome = '';
      
      if (bet.betType === 'moneyline') {
        if (bet.selection === 'home' && finalHomeScore > finalAwayScore) {
          expectedOutcome = '✅ WIN (CLE won)';
        } else if (bet.selection === 'away' && finalAwayScore > finalHomeScore) {
          expectedOutcome = '✅ WIN (MEM won)';
        } else {
          expectedOutcome = '❌ LOSS';
        }
      } else if (bet.betType === 'spread') {
        const line = bet.line || 0;
        if (bet.selection === 'home') {
          const coverMargin = finalHomeScore + line - finalAwayScore;
          if (coverMargin > 0) {
            expectedOutcome = `✅ WIN (CLE ${line} covered by ${coverMargin.toFixed(1)})`;
          } else if (coverMargin === 0) {
            expectedOutcome = '↩️ PUSH';
          } else {
            expectedOutcome = `❌ LOSS (CLE ${line} missed by ${Math.abs(coverMargin).toFixed(1)})`;
          }
        } else {
          const coverMargin = finalAwayScore - line - finalHomeScore;
          if (coverMargin > 0) {
            expectedOutcome = `✅ WIN (MEM ${line} covered by ${coverMargin.toFixed(1)})`;
          } else if (coverMargin === 0) {
            expectedOutcome = '↩️ PUSH';
          } else {
            expectedOutcome = `❌ LOSS (MEM ${line} missed by ${Math.abs(coverMargin).toFixed(1)})`;
          }
        }
      } else if (bet.betType === 'total') {
        const line = bet.line || 0;
        if (bet.selection === 'over') {
          if (finalTotal > line) {
            expectedOutcome = `✅ WIN (Total ${finalTotal} over ${line})`;
          } else if (finalTotal === line) {
            expectedOutcome = '↩️ PUSH';
          } else {
            expectedOutcome = `❌ LOSS (Total ${finalTotal} under ${line})`;
          }
        } else {
          if (finalTotal < line) {
            expectedOutcome = `✅ WIN (Total ${finalTotal} under ${line})`;
          } else if (finalTotal === line) {
            expectedOutcome = '↩️ PUSH';
          } else {
            expectedOutcome = `❌ LOSS (Total ${finalTotal} over ${line})`;
          }
        }
      } else if (bet.betType === 'player_prop') {
        // Simulate De'Andre Hunter with 3 assists (over 2.5)
        const hunterAssists = 3;
        const line = bet.line || 0;
        if (bet.selection === 'over') {
          if (hunterAssists > line) {
            expectedOutcome = `✅ WIN (Hunter ${hunterAssists} assists over ${line})`;
          } else {
            expectedOutcome = `❌ LOSS (Hunter ${hunterAssists} assists under ${line})`;
          }
        } else {
          if (hunterAssists < line) {
            expectedOutcome = `✅ WIN (Hunter ${hunterAssists} assists under ${line})`;
          } else {
            expectedOutcome = `❌ LOSS (Hunter ${hunterAssists} assists over ${line})`;
          }
        }
      }
      
      console.log(`   ${bet.betType.toUpperCase()}: ${expectedOutcome}`);
    });
    console.log('');

    // Step 4: Mark game as finished
    console.log('⚙️  Marking game as finished...\n');
    
    await prisma.game.update({
      where: { id: game.id },
      data: {
        status: 'finished',
        homeScore: finalHomeScore,
        awayScore: finalAwayScore,
        finishedAt: new Date()
      }
    });

    console.log('✅ Game marked as finished\n');

    // Step 5: Settle all bets
    console.log('─'.repeat(80));
    console.log('⚙️  SETTLING ALL BETS');
    console.log('─'.repeat(80) + '\n');

    const settlementResults = [];

    for (const bet of activeBets) {
      console.log(`Settling ${bet.betType.toUpperCase()} bet (${bet.id})...`);
      
      // Special handling for player props - manually settle with mock stats
      if (bet.betType === 'player_prop') {
        try {
          // Extract player prop metadata
          const metadata = bet.legs ? (typeof bet.legs === 'string' ? JSON.parse(bet.legs) : bet.legs) : null;
          const playerPropMetadata = metadata?.playerProp;
          
          if (!playerPropMetadata?.playerId || !playerPropMetadata?.statType) {
            console.log(`  ❌ Missing player prop metadata\n`);
            continue;
          }

          const playerId = playerPropMetadata.playerId;
          const statType = playerPropMetadata.statType;
          const mockStats = MOCK_PLAYER_STATS[playerId];

          if (!mockStats) {
            console.log(`  ❌ No mock stats for player ${playerId}\n`);
            continue;
          }

          console.log(`  📊 Using mock stats for ${playerId}:`);
          console.log(`     ${statType}: ${mockStats[statType]}`);

          // Grade the player prop bet manually
          const gradeResult = gradePlayerPropBet({
            selection: bet.selection,
            line: bet.line || 0,
            playerId: playerId,
            statType: statType
          }, mockStats);

          // Calculate payout based on grade result
          let payout = 0;
          if (gradeResult.status === 'won') {
            const decimalOdds = bet.odds >= 0 
              ? (bet.odds / 100) + 1 
              : (100 / Math.abs(bet.odds)) + 1;
            payout = bet.stake * decimalOdds;
          } else if (gradeResult.status === 'push') {
            payout = bet.stake;
          }

          // Update bet in database
          await prisma.bet.update({
            where: { id: bet.id },
            data: {
              status: gradeResult.status,
              potentialPayout: payout,
              settledAt: new Date()
            }
          });

          // Update user balance
          const account = await prisma.account.findUnique({
            where: { userId: bet.userId }
          });

          if (account) {
            await prisma.account.update({
              where: { userId: bet.userId },
              data: {
                balance: account.balance + payout
              }
            });
          }

          settlementResults.push({
            betType: bet.betType,
            betId: bet.id,
            selection: bet.selection,
            line: bet.line,
            odds: bet.odds,
            stake: bet.stake,
            status: gradeResult.status,
            payout: payout
          });

          console.log(`  ✅ Status: ${gradeResult.status.toUpperCase()}`);
          console.log(`  💰 Payout: $${payout.toFixed(2)}`);
          
          if (gradeResult.status === 'won') {
            console.log(`  📈 Profit: $${(payout - bet.stake).toFixed(2)}`);
          }
          console.log('');

        } catch (error) {
          console.log(`  ❌ Error settling player prop: ${error}\n`);
        }
      } else {
        // Regular settlement for non-player-prop bets
        const result = await settleBet(bet.id);
        
        if (result) {
          settlementResults.push({
            betType: bet.betType,
            betId: bet.id,
            selection: bet.selection,
            line: bet.line,
            odds: bet.odds,
            stake: bet.stake,
            status: result.status,
            payout: result.payout
          });
          
          console.log(`  ✅ Status: ${result.status.toUpperCase()}`);
          console.log(`  💰 Payout: $${result.payout.toFixed(2)}`);
          
          if (result.status === 'won') {
            console.log(`  📈 Profit: $${(result.payout - bet.stake).toFixed(2)}`);
          }
          console.log('');
        } else {
          console.log(`  ❌ Settlement failed\n`);
        }
      }
    }

    // Step 6: Summary
    console.log('─'.repeat(80));
    console.log('📊 SETTLEMENT SUMMARY');
    console.log('─'.repeat(80) + '\n');

    const wins = settlementResults.filter(r => r.status === 'won');
    const losses = settlementResults.filter(r => r.status === 'lost');
    const pushes = settlementResults.filter(r => r.status === 'push');

    console.log(`Total Bets: ${settlementResults.length}`);
    console.log(`✅ Wins: ${wins.length}`);
    console.log(`❌ Losses: ${losses.length}`);
    console.log(`↩️  Pushes: ${pushes.length}\n`);

    const totalStaked = settlementResults.reduce((sum, r) => sum + r.stake, 0);
    const totalPayout = settlementResults.reduce((sum, r) => sum + r.payout, 0);
    const netProfit = totalPayout - totalStaked;

    console.log(`💵 Total Staked: $${totalStaked.toFixed(2)}`);
    console.log(`💰 Total Payout: $${totalPayout.toFixed(2)}`);
    console.log(`${netProfit >= 0 ? '📈' : '📉'} Net ${netProfit >= 0 ? 'Profit' : 'Loss'}: $${netProfit.toFixed(2)}\n`);

    // Detailed results
    console.log('DETAILED RESULTS:\n');
    settlementResults.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.betType.toUpperCase()}`);
      console.log(`   Selection: ${result.selection}${result.line ? ` (${result.line})` : ''}`);
      console.log(`   Odds: ${result.odds}`);
      console.log(`   Stake: $${result.stake}`);
      console.log(`   Status: ${result.status.toUpperCase()}`);
      console.log(`   Payout: $${result.payout.toFixed(2)}`);
      if (result.status === 'won') {
        console.log(`   Profit: $${(result.payout - result.stake).toFixed(2)}`);
      } else if (result.status === 'lost') {
        console.log(`   Loss: $${result.stake.toFixed(2)}`);
      }
      console.log('');
    });

    console.log('═'.repeat(80));
    console.log('✅ TEST COMPLETE');
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
