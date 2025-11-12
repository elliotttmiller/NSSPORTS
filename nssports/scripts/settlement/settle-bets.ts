#!/usr/bin/env tsx
/**
 * Bet Settlement Script
 * 
 * Settles all pending bets for finished games.
 * Can be run manually or scheduled with any task scheduler:
 * - Windows Task Scheduler
 * - Cron (Linux/Mac)
 * - pm2-cron
 * - node-cron
 * - GitHub Actions
 * 
 * Usage:
 *   npm run settle-bets              # Settle all finished games
 *   npm run settle-bets -- --game=xxx # Settle specific game
 *   npm run settle-bets -- --bet=xxx  # Settle specific bet
 *   npm run settle-bets -- --dry-run  # Preview without settling
 */

import { PrismaClient } from '@prisma/client';
import { settleAllFinishedGames, settleGameBets, settleBet } from '../../src/services/bet-settlement';

const prisma = new PrismaClient();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const gameId = args.find(arg => arg.startsWith('--game='))?.split('=')[1];
  const betId = args.find(arg => arg.startsWith('--bet='))?.split('=')[1];

  log('\n' + '='.repeat(60), 'cyan');
  log('🎲 BET SETTLEMENT SCRIPT', 'bright');
  log('='.repeat(60), 'cyan');
  log(`Started at: ${new Date().toLocaleString()}`, 'cyan');
  if (dryRun) {
    log('⚠️  DRY RUN MODE - No changes will be made', 'yellow');
  }
  log('');

  try {
    // Settle specific bet
    if (betId) {
      log(`📌 Settling specific bet: ${betId}`, 'blue');
      
      if (dryRun) {
        const bet = await prisma.bet.findUnique({
          where: { id: betId },
          include: { game: true }
        });
        
        if (!bet) {
          log(`❌ Bet not found`, 'red');
          return;
        }
        
        log(`   Bet Type: ${bet.betType}`, 'reset');
        log(`   Status: ${bet.status}`, 'reset');
        log(`   Stake: $${bet.stake.toFixed(2)}`, 'reset');
        log(`   Game: ${bet.game?.id || 'N/A'}`, 'reset');
        log(`   Game Status: ${bet.game?.status || 'N/A'}`, 'reset');
        log('   [DRY RUN - Would settle this bet]', 'yellow');
        return;
      }
      
      const result = await settleBet(betId);
      
      if (!result) {
        log(`❌ Failed to settle bet - may be already settled or invalid`, 'red');
        return;
      }
      
      log(`✅ Bet settled as: ${result.status.toUpperCase()}`, 'green');
      log(`   Payout: $${result.payout.toFixed(2)}`, 'green');
      return;
    }

    // Settle specific game
    if (gameId) {
      log(`🏀 Settling all bets for game: ${gameId}`, 'blue');
      
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          homeTeam: { select: { shortName: true } },
          awayTeam: { select: { shortName: true } }
        }
      });
      
      if (!game) {
        log(`❌ Game not found`, 'red');
        return;
      }
      
      log(`   Matchup: ${game.awayTeam.shortName} @ ${game.homeTeam.shortName}`, 'reset');
      log(`   Status: ${game.status}`, 'reset');
      log(`   Score: ${game.awayScore ?? '-'} - ${game.homeScore ?? '-'}`, 'reset');
      log('');
      
      if (dryRun) {
        const pendingBets = await prisma.bet.count({
          where: { gameId, status: 'pending' }
        });
        log(`   [DRY RUN - Would settle ${pendingBets} bet(s)]`, 'yellow');
        return;
      }
      
      const results = await settleGameBets(gameId);
      
      log(`✅ Settled ${results.length} bets`, 'green');
      log(`   Won: ${results.filter(r => r.status === 'won').length}`, 'green');
      log(`   Lost: ${results.filter(r => r.status === 'lost').length}`, 'red');
      log(`   Push: ${results.filter(r => r.status === 'push').length}`, 'yellow');
      return;
    }

    // Settle all finished games (default)
    log(`🔄 Settling all finished games with pending bets...`, 'blue');
    log('');
    
    if (dryRun) {
      const finishedGames = await prisma.game.findMany({
        where: {
          status: 'finished',
          bets: { some: { status: 'pending' } }
        },
        include: {
          homeTeam: { select: { shortName: true } },
          awayTeam: { select: { shortName: true } },
          _count: { select: { bets: true } }
        }
      });
      
      log(`   Found ${finishedGames.length} game(s) with pending bets:`, 'reset');
      
      for (const game of finishedGames) {
        log(`   - ${game.awayTeam.shortName} @ ${game.homeTeam.shortName} (${game._count.bets} bets)`, 'reset');
      }
      
      log('', 'reset');
      log(`   [DRY RUN - Would settle these games]`, 'yellow');
      return;
    }
    
    const result = await settleAllFinishedGames();
    
    log('📊 SETTLEMENT SUMMARY', 'bright');
    log('─'.repeat(60), 'cyan');
    log(`   Games Processed: ${result.gamesProcessed}`, 'reset');
    log(`   Total Bets Settled: ${result.betsSettled}`, 'bright');
    log(`   ✅ Won: ${result.results.filter(r => r.status === 'won').length}`, 'green');
    log(`   ❌ Lost: ${result.results.filter(r => r.status === 'lost').length}`, 'red');
    log(`   ↩️  Push: ${result.results.filter(r => r.status === 'push').length}`, 'yellow');
    log('');
    
    if (result.betsSettled === 0) {
      log('   No bets to settle at this time.', 'yellow');
    } else {
      log('   ✅ Settlement completed successfully!', 'green');
    }

  } catch (error) {
    log('\n❌ ERROR:', 'red');
    log(error instanceof Error ? error.message : String(error), 'red');
    if (error instanceof Error && error.stack) {
      log('\nStack trace:', 'red');
      log(error.stack, 'red');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    log('\n' + '='.repeat(60), 'cyan');
    log(`Completed at: ${new Date().toLocaleString()}`, 'cyan');
    log('='.repeat(60) + '\n', 'cyan');
  }
}

main();
