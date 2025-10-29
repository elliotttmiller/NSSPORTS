/**
 * Diagnostic to see EXACTLY what oddIDs the SDK is returning
 * This will show us if we're getting alternate lines from the API
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseOddIDs() {
  try {
    console.log('🔍 DIAGNOSING ODD IDs\n');
    console.log('=' .repeat(80) + '\n');
    
    // Get all odds for one NBA game
    const nbaGame = await prisma.game.findFirst({
      where: { leagueId: 'NBA' },
      include: {
        homeTeam: true,
        awayTeam: true,
        odds: true
      }
    });
    
    if (!nbaGame) {
      console.log('❌ No NBA games found');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`🏀 NBA Game: ${nbaGame.awayTeam.name} @ ${nbaGame.homeTeam.name}\n`);
    console.log(`Total odds stored: ${nbaGame.odds.length}\n`);
    console.log('=' .repeat(80) + '\n');
    
    // Group by bet type
    const byType = {};
    nbaGame.odds.forEach(odd => {
      if (!byType[odd.betType]) byType[odd.betType] = [];
      byType[odd.betType].push(odd);
    });
    
    console.log('📊 ODDS BY TYPE:\n');
    
    for (const [betType, odds] of Object.entries(byType)) {
      console.log(`\n${betType.toUpperCase()}: ${odds.length} odds`);
      console.log('-'.repeat(80));
      
      if (betType === 'total') {
        // Show ALL total odds with lines
        odds.forEach((odd, i) => {
          console.log(`  ${i + 1}. ${odd.selection.padEnd(8)} | Line: ${String(odd.line).padEnd(8)} | Odds: ${odd.odds > 0 ? '+' : ''}${odd.odds}`);
        });
        
        // Analyze the lines
        const uniqueLines = [...new Set(odds.map(o => o.line))].sort((a, b) => (a || 0) - (b || 0));
        console.log(`\n  📈 Unique lines: ${uniqueLines.join(', ')}`);
        
        // Check which is main line
        const mainLine = uniqueLines.find(l => l && l > 200 && l < 250);
        const alternateLinesLow = uniqueLines.filter(l => l && l < 150);
        const alternateLinesHigh = uniqueLines.filter(l => l && l > 250);
        
        console.log(`\n  ✅ Main line (200-250): ${mainLine || 'NONE!'}`);
        if (alternateLinesLow.length > 0) {
          console.log(`  ⚠️  Alternate lines (LOW): ${alternateLinesLow.join(', ')}`);
        }
        if (alternateLinesHigh.length > 0) {
          console.log(`  ⚠️  Alternate lines (HIGH): ${alternateLinesHigh.join(', ')}`);
        }
      } else {
        // Show first 3 for other types
        odds.slice(0, 3).forEach((odd, i) => {
          console.log(`  ${i + 1}. ${odd.selection.padEnd(8)} | Line: ${String(odd.line || 'N/A').padEnd(8)} | Odds: ${odd.odds > 0 ? '+' : ''}${odd.odds}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    console.log('🎯 ROOT CAUSE ANALYSIS:\n');
    
    const totalOdds = byType.total || [];
    const hasAlternates = totalOdds.some(o => o.line && (o.line < 150 || o.line > 250));
    
    if (hasAlternates) {
      console.log('❌ PROBLEM IDENTIFIED: We are storing ALTERNATE LINES!');
      console.log('\nWhy this is happening:');
      console.log('  1. We requested "game-ou" which returns ALL total lines (main + alternates)');
      console.log('  2. Our filter accepts anything with "-game-ou-" pattern');
      console.log('  3. SDK returns multiple lines per market (115, 117, 231.5)');
      console.log('\nWhat we need to do:');
      console.log('  ✅ Use CONSENSUS calculation to pick the TRUE main line');
      console.log('  ✅ Filter by fairOverUnder closest to typical NBA range (210-240)');
      console.log('  ✅ OR only store odds where the line is the MOST COMMON');
      console.log('  ✅ OR request specific main line only (not alternates)');
    } else {
      console.log('✅ Only main lines detected - filtering is working!');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

diagnoseOddIDs();
