/**
 * Check current odds configuration in database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOddsConfig() {
  try {
    console.log('🔍 Checking odds configuration in database...\n');

    // Get all configurations
    const allConfigs = await prisma.oddsConfiguration.findMany({
      orderBy: { lastModified: 'desc' },
    });

    console.log(`📊 Total configurations found: ${allConfigs.length}\n`);

    if (allConfigs.length === 0) {
      console.log('❌ No odds configurations found in database');
      console.log('   This means the system will use hardcoded defaults\n');
      return;
    }

    // Show each config
    allConfigs.forEach((config, index) => {
      console.log(`Configuration #${index + 1}:`);
      console.log(`  ID: ${config.id}`);
      console.log(`  Status: ${config.isActive ? '🟢 ACTIVE' : '⚫ INACTIVE'}`);
      console.log(`  Spread Margin: ${(config.spreadMargin * 100).toFixed(1)}%`);
      console.log(`  Moneyline Margin: ${(config.moneylineMargin * 100).toFixed(1)}%`);
      console.log(`  Total Margin: ${(config.totalMargin * 100).toFixed(1)}%`);
      console.log(`  Player Props: ${(config.playerPropsMargin * 100).toFixed(1)}%`);
      console.log(`  Game Props: ${(config.gamePropsMargin * 100).toFixed(1)}%`);
      console.log(`  Live Multiplier: ${config.liveGameMultiplier}x`);
      console.log(`  Rounding: ${config.roundingMethod}`);
      console.log(`  Last Modified: ${config.lastModified.toISOString()}`);
      console.log(`  Modified By: ${config.modifiedBy || 'N/A'}`);
      
      if (config.leagueOverrides) {
        console.log(`  League Overrides: ${Object.keys(config.leagueOverrides as object).length} league(s)`);
      }
      
      console.log('');
    });

    // Show active config specifically
    const activeConfig = allConfigs.find(c => c.isActive);
    
    if (activeConfig) {
      console.log('✅ ACTIVE CONFIGURATION:');
      console.log(`   This config is currently being applied to live odds`);
      console.log(`   Average margin: ${((activeConfig.spreadMargin + activeConfig.moneylineMargin + activeConfig.totalMargin) / 3 * 100).toFixed(2)}%\n`);
    } else {
      console.log('⚠️  WARNING: No active configuration found');
      console.log('   Juice system is effectively DISABLED');
      console.log('   Games will show fair odds without margins\n');
    }

    // Check history
    const historyCount = await prisma.oddsConfigHistory.count();
    console.log(`📜 Configuration history records: ${historyCount}`);

  } catch (error) {
    console.error('❌ Error checking odds configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOddsConfig();
