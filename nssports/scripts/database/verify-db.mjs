#!/usr/bin/env node
/**
 * Verify Database State
 * Checks that database is properly seeded and ready
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('🔍 Verifying Database State...\n');
  
  try {
    // Check sports
    const sports = await prisma.sport.findMany();
    console.log(`✅ Sports: ${sports.length}`);
    sports.forEach(s => console.log(`   - ${s.icon} ${s.name} (${s.id})`));
    
    // Check leagues
    const leagues = await prisma.league.findMany();
    console.log(`\n✅ Leagues: ${leagues.length}`);
    leagues.forEach(l => console.log(`   - ${l.name} (ID: ${l.id})`));
    
    // Check teams
    const teams = await prisma.team.findMany();
    console.log(`\n📊 Teams: ${teams.length}`);
    if (teams.length > 0) {
      console.log(`   Sample: ${teams.slice(0, 3).map(t => t.name).join(', ')}`);
    }
    
    // Check games
    const games = await prisma.game.findMany({
      orderBy: { startTime: 'asc' },
      take: 10
    });
    console.log(`\n📊 Games: ${games.length}`);
    if (games.length > 0) {
      console.log('   Most recent:');
      games.slice(0, 3).forEach(g => {
        const startDate = new Date(g.startTime).toISOString();
        console.log(`   - ${g.id.substring(0, 8)}... | ${g.status} | ${startDate}`);
      });
    }
    
    // Check odds
    const odds = await prisma.odds.findMany();
    console.log(`\n📊 Odds: ${odds.length}`);
    
    // Check players
    const players = await prisma.player.findMany();
    console.log(`📊 Players: ${players.length}`);
    
    // Check player props
    const playerProps = await prisma.playerProp.findMany();
    console.log(`📊 Player Props: ${playerProps.length}`);
    
    console.log('\n✅ Database verification complete!');
    
    if (leagues.length === 0) {
      console.log('\n⚠️  WARNING: No leagues found. Run: npm run db:seed');
    }
    
    if (games.length === 0) {
      console.log('\n⚠️  INFO: No games cached yet. Will be fetched on first API call.');
    }
    
  } catch (error) {
    console.error('❌ Error verifying database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
