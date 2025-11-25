#!/usr/bin/env node
/**
 * Verify Database State
 * Checks that database is properly seeded and ready
 */

import 'dotenv/config';
import prisma from '../../src/lib/prisma';
import { logger } from '../../src/lib/logger';

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!DATABASE_URL) {
  logger.error('DATABASE_URL or DIRECT_URL not set; cannot connect to DB.');
  process.exit(1);
}

async function verifyDatabase() {
  logger.info('🔍 Verifying Database State...');
  
  try {
    // Check sports
  const sports = await prisma.sport.findMany();
  logger.info(`✅ Sports: ${sports.length}`);
  sports.forEach(s => logger.info(`   - ${s.icon} ${s.name} (${s.id})`));
    
    // Check leagues
  const leagues = await prisma.league.findMany();
  logger.info(`✅ Leagues: ${leagues.length}`);
  leagues.forEach(l => logger.info(`   - ${l.name} (ID: ${l.id})`));
    
    // Check teams
    const teams = await prisma.team.findMany();
    logger.info(`📊 Teams: ${teams.length}`);
    if (teams.length > 0) {
      logger.info(`   Sample: ${teams.slice(0, 3).map(t => t.name).join(', ')}`);
    }
    
    // Check games
    const games = await prisma.game.findMany({
      orderBy: { startTime: 'asc' },
      take: 10
    });
    logger.info(`📊 Games: ${games.length}`);
    if (games.length > 0) {
      logger.info('   Most recent:');
      games.slice(0, 3).forEach(g => {
        const startDate = new Date(g.startTime).toISOString();
        logger.info(`   - ${g.id.substring(0, 8)}... | ${g.status} | ${startDate}`);
      });
    }
    
    // Check odds
  const odds = await prisma.odds.findMany();
  logger.info(`📊 Odds: ${odds.length}`);
    
    // Check players
  const players = await prisma.player.findMany();
  logger.info(`📊 Players: ${players.length}`);
    
    // Check player props
  const playerProps = await prisma.playerProp.findMany();
  logger.info(`📊 Player Props: ${playerProps.length}`);

  logger.info('✅ Database verification complete!');

    if (leagues.length === 0) {
      logger.warn('⚠️  WARNING: No leagues found. Run: npm run db:seed');
    }
    
    if (games.length === 0) {
      logger.info('⚠️  INFO: No games cached yet. Will be fetched on first API call.');
    }
    
  } catch (error) {
    logger.error('❌ Error verifying database', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
