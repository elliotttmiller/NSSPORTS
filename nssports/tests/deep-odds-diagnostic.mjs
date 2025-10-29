/**
 * Deep diagnostic to check RAW odds data from database
 * This will show us exactly what's stored vs what the SDK returned
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deepOddsDiagnostic() {
  try {
    console.log('🔬 DEEP ODDS DIAGNOSTIC\n');
    console.log('=' .repeat(80) + '\n');
    
    // Get one NBA game with all its odds
    const nbaGame = await prisma.game.findFirst({
      where: { leagueId: 'NBA' },
      include: {
        homeTeam: true,
        awayTeam: true,
        odds: {
          where: {
            betType: 'total' // Focus on totals since that's the problem
          }
        }
      }
    });
    
    if (!nbaGame) {
      console.log('❌ No NBA games in database');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`🏀 NBA Game: ${nbaGame.awayTeam.name} @ ${nbaGame.homeTeam.name}`);
    console.log(`   Game ID: ${nbaGame.id}`);
    console.log(`   Start: ${nbaGame.startTime}`);
    console.log(`\n${'='.repeat(80)}\n`);
    
    console.log(`📊 TOTAL ODDS STORED IN DATABASE:\n`);
    
    if (nbaGame.odds.length === 0) {
      console.log('❌ NO TOTAL ODDS FOUND!');
      await prisma.$disconnect();
      return;
    }
    
    nbaGame.odds.forEach((odd, index) => {
      console.log(`${index + 1}. ${odd.selection.toUpperCase()}`);
      console.log(`   Odds: ${odd.odds > 0 ? '+' : ''}${odd.odds}`);
      console.log(`   Line: ${odd.line}`);
      console.log(`   Last Updated: ${odd.lastUpdated}`);
      console.log('');
    });
    
    // Get all odds types for this game
    const allOdds = await prisma.odds.findMany({
      where: { gameId: nbaGame.id }
    });
    
    console.log(`${'='.repeat(80)}\n`);
    console.log(`📈 ALL ODDS FOR THIS GAME:\n`);
    
    const byType = {};
    allOdds.forEach(odd => {
      if (!byType[odd.betType]) byType[odd.betType] = [];
      byType[odd.betType].push(odd);
    });
    
    for (const [betType, odds] of Object.entries(byType)) {
      console.log(`${betType.toUpperCase()}: ${odds.length} odds`);
      odds.slice(0, 2).forEach(odd => {
        console.log(`  - ${odd.selection}: line=${odd.line}, odds=${odd.odds}`);
      });
    }
    
    // Check for multiple total lines (alternate lines)
    console.log(`\n${'='.repeat(80)}\n`);
    console.log(`🔍 CHECKING FOR MULTIPLE TOTAL LINES:\n`);
    
    const totalOdds = byType.total || [];
    const uniqueLines = [...new Set(totalOdds.map(o => o.line))];
    
    console.log(`Found ${uniqueLines.length} unique total lines:`);
    uniqueLines.sort((a, b) => (a || 0) - (b || 0)).forEach(line => {
      const oddsForLine = totalOdds.filter(o => o.line === line);
      console.log(`\n  Line ${line}:`);
      oddsForLine.forEach(odd => {
        console.log(`    ${odd.selection}: ${odd.odds > 0 ? '+' : ''}${odd.odds}`);
      });
    });
    
    if (uniqueLines.length > 1) {
      console.log(`\n⚠️  MULTIPLE LINES DETECTED!`);
      console.log(`   The main line should be the one closest to standard NBA totals (~220)`);
      console.log(`   Lines: ${uniqueLines.join(', ')}`);
      
      const mainLine = uniqueLines.find(l => l && l > 200) || uniqueLines[0];
      console.log(`   \n   ✅ Likely main line: ${mainLine}`);
    }
    
    // Check if any line is reasonable for NBA
    const hasReasonableLine = uniqueLines.some(l => l && l > 200 && l < 250);
    
    console.log(`\n${'='.repeat(80)}\n`);
    if (!hasReasonableLine) {
      console.log('❌ CRITICAL ISSUE: No reasonable NBA total line found!');
      console.log('   Expected: 210-240 range');
      console.log(`   Found: ${uniqueLines.join(', ')}`);
      console.log('\n   This means the SDK is returning incorrect data OR');
      console.log('   our filtering is excluding the main game total line.');
    } else {
      console.log('✅ Reasonable total line found in database');
      console.log('   The issue might be in how the frontend selects which line to display');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

deepOddsDiagnostic();
