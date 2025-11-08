/**
 * Quick Test Script - Verify Juice Configuration is Working
 * 
 * Run this to test that juice is being applied to odds
 * Usage: npx tsx scripts/test-juice.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Juice Configuration\n');
  console.log('='.repeat(70));

  // 1. Check if config exists
  console.log('\n📋 Step 1: Checking configuration...');
  const config = await prisma.oddsConfiguration.findFirst({
    where: { isActive: true },
    orderBy: { lastModified: 'desc' },
  });

  if (!config) {
    console.log('❌ No active odds configuration found!');
    console.log('💡 Run: npx tsx prisma/seed-admin.ts');
    return;
  }

  console.log('✅ Configuration found');
  console.log(`   Status: ${config.isActive ? '🟢 ENABLED' : '🔴 DISABLED'}`);
  console.log(`   Spread Margin: ${(config.spreadMargin * 100).toFixed(2)}%`);
  console.log(`   Moneyline Margin: ${(config.moneylineMargin * 100).toFixed(2)}%`);
  console.log(`   Total Margin: ${(config.totalMargin * 100).toFixed(2)}%`);
  console.log(`   Live Multiplier: ${config.liveGameMultiplier}x`);

  // 2. Test juice calculation
  console.log('\n📋 Step 2: Testing juice calculations...');
  
  // Import the juice service
  const { oddsJuiceService } = await import('../../src/lib/odds-juice-service');
  
  const testCases = [
    { fairOdds: -110, marketType: 'spread' as const, description: 'Standard spread' },
    { fairOdds: +150, marketType: 'moneyline' as const, description: 'Underdog moneyline' },
    { fairOdds: -200, marketType: 'moneyline' as const, description: 'Favorite moneyline' },
    { fairOdds: -110, marketType: 'total' as const, description: 'Over/Under' },
  ];

  for (const testCase of testCases) {
    const result = await oddsJuiceService.applyJuice({
      fairOdds: testCase.fairOdds,
      marketType: testCase.marketType,
      league: 'NBA',
      isLive: false,
    });

    const change = result.juicedOdds - result.fairOdds;
    const changeStr = change > 0 ? `+${change}` : `${change}`;
    
    console.log(`\n   ${testCase.description}:`);
    console.log(`     Fair Odds:   ${result.fairOdds}`);
    console.log(`     Juiced Odds: ${result.juicedOdds} (${changeStr})`);
    console.log(`     Margin:      ${(result.marginApplied * 100).toFixed(2)}%`);
    console.log(`     House Edge:  ${result.holdPercentage.toFixed(2)}%`);
  }

  // 3. Test live game multiplier
  console.log('\n📋 Step 3: Testing live game multiplier...');
  
  const preLiveResult = await oddsJuiceService.applyJuice({
    fairOdds: -110,
    marketType: 'spread',
    league: 'NBA',
    isLive: false,
  });
  
  const liveResult = await oddsJuiceService.applyJuice({
    fairOdds: -110,
    marketType: 'spread',
    league: 'NBA',
    isLive: true,
  });

  console.log(`   Pre-game: -110 → ${preLiveResult.juicedOdds}`);
  console.log(`   Live:     -110 → ${liveResult.juicedOdds}`);
  console.log(`   Difference: ${liveResult.juicedOdds - preLiveResult.juicedOdds} (${config.liveGameMultiplier}x multiplier)`);

  // 4. Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ TEST COMPLETE\n');
  console.log('🎯 How to verify on game cards:');
  console.log('   1. Go to http://localhost:3000/games');
  console.log('   2. Open DevTools Console (F12)');
  console.log('   3. Look for [OddsJuice] logs showing margin application');
  console.log('   4. Compare odds to what you see here');
  console.log('\n💡 To change margins:');
  console.log('   1. Go to http://localhost:3000/admin/odds-config');
  console.log('   2. Adjust margins and save');
  console.log('   3. Refresh game cards to see changes');
  console.log('\n📊 Revenue Impact:');
  const dailyHandle = 10000;
  const avgMargin = (config.spreadMargin + config.moneylineMargin + config.totalMargin) / 3;
  const dailyProfit = dailyHandle * avgMargin;
  console.log(`   $${dailyHandle.toLocaleString()} daily handle × ${(avgMargin * 100).toFixed(2)}% = $${dailyProfit.toFixed(2)}/day profit`);
  
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
