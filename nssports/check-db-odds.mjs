/**
 * Check what's actually in the database for odds
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 DATABASE ODDS INSPECTION\n');
    console.log('=' .repeat(80) + '\n');
    
    // Get all games with their odds
    const games = await prisma.game.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        odds: true,
      },
      orderBy: { leagueId: 'asc' },
    });
    
    console.log(`📊 Found ${games.length} games in database\n`);
    
    // Group by league
    const leagues = {};
    games.forEach(game => {
      if (!leagues[game.leagueId]) leagues[game.leagueId] = [];
      leagues[game.leagueId].push(game);
    });
    
    for (const [leagueId, leagueGames] of Object.entries(leagues)) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`${leagueId} LEAGUE - ${leagueGames.length} games`);
      console.log('='.repeat(80));
      
      // Analyze first game in detail
      const game = leagueGames[0];
      console.log(`\n${game.awayTeam.name} @ ${game.homeTeam.name}`);
      console.log(`Game ID: ${game.id}`);
      console.log(`Odds count: ${game.odds.length}`);
      
      if (game.odds.length === 0) {
        console.log('❌ NO ODDS IN DATABASE!');
        continue;
      }
      
      console.log(`\nODDS BREAKDOWN:`);
      
      // Group odds by type
      const byType = {};
      game.odds.forEach(odd => {
        if (!byType[odd.betType]) byType[odd.betType] = [];
        byType[odd.betType].push(odd);
      });
      
      // Show moneyline
      if (byType.moneyline) {
        console.log(`\n💰 MONEYLINE:`);
        byType.moneyline.forEach(odd => {
          console.log(`   ${odd.selection}: odds=${odd.odds}, line=${odd.line}`);
        });
      }
      
      // Show spread
      if (byType.spread) {
        console.log(`\n📈 SPREAD:`);
        byType.spread.forEach(odd => {
          console.log(`   ${odd.selection}: odds=${odd.odds}, line=${odd.line}`);
        });
      }
      
      // Show total
      if (byType.total) {
        console.log(`\n🎯 TOTAL:`);
        byType.total.forEach(odd => {
          console.log(`   ${odd.selection}: odds=${odd.odds}, line=${odd.line}`);
        });
        
        // Check for suspicious values
        const hasZeroLine = byType.total.some(odd => odd.line === 0 || odd.line === 0.5);
        if (hasZeroLine && leagueId === 'NBA') {
          console.log(`\n⚠️  WARNING: NBA total line is ${byType.total[0].line} (should be ~220.5)`);
          console.log(`   This indicates the SDK is returning incorrect data!`);
        }
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('📋 SUMMARY\n');
    
    for (const [leagueId, leagueGames] of Object.entries(leagues)) {
      const gamesWithOdds = leagueGames.filter(g => g.odds.length > 0).length;
      const totalOdds = leagueGames.reduce((sum, g) => sum + g.odds.length, 0);
      console.log(`${leagueId}: ${gamesWithOdds}/${leagueGames.length} games have odds (${totalOdds} total odds records)`);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

checkDatabase();
