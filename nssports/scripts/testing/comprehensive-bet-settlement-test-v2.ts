#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * COMPREHENSIVE BET SETTLEMENT TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Full end-to-end testing using REAL database structure and bet placement logic
 * 
 * Tests all bet types:
 * - Moneyline (home win, away win)
 * - Spread (cover, no cover, push)
 * - Total (over, under, push)
 * - Parlays (all win, one loss)
 * 
 * This test suite:
 * 1. Starts settlement worker automatically
 * 2. Creates real games in database with teams/leagues
 * 3. Places bets using actual bet creation logic
 * 4. Marks games as finished with controlled scores
 * 5. Triggers settlement
 * 6. Verifies all bets settled correctly
 * 7. Generates detailed test report
 */

import { PrismaClient } from '@prisma/client';
import { spawn, ChildProcess } from 'child_process';
import { addSettleBetsJob } from '../../src/lib/queues/settlement.js';
import { calculatePayout } from '../../src/lib/calculations.js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const prisma = new PrismaClient();

// Test configuration
const TEST_USER = 'slime';
const SETTLEMENT_WAIT_TIME = 15000; // 15 seconds

// Worker process
let workerProcess: ChildProcess | null = null;

// Test results tracking
interface TestResult {
  testName: string;
  betType: string;
  betId: string;
  expectedStatus: string;
  actualStatus: string;
  expectedPayout: number;
  actualPayout: number;
  passed: boolean;
  error?: string;
}

const testResults: TestResult[] = [];

// Test game IDs
const testGameIds: string[] = [];

/**
 * Start settlement worker
 */
/**
 * Check if worker is running
 */
async function checkWorkerRunning(): Promise<boolean> {
  try {
    const { settlementQueue } = await import('../../src/lib/queues/settlement.js');
    const workers = await settlementQueue.getWorkers();
    await settlementQueue.close();
    return workers.length > 0;
  } catch (error) {
    console.error('Error checking worker:', error);
    return false;
  }
}

/**
 * Ensure settlement worker is running
 */
async function startWorker(): Promise<void> {
  console.log('\n� Checking if settlement worker is running...\n');
  
  const isRunning = await checkWorkerRunning();
  
  if (isRunning) {
    console.log('✅ Settlement worker is already running\n');
    return;
  }
  
  console.log('⚠️  No worker detected, starting new worker...\n');
  
  return new Promise((resolve, reject) => {
    workerProcess = spawn('npx', ['tsx', 'src/workers/settlement-worker.ts'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: false
    });

    let startupOutput = '';

    workerProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      startupOutput += output;
      
      if (output.includes('Settlement worker running') || output.includes('Worker ready')) {
        console.log('✅ Settlement worker started successfully\n');
        resolve();
      }
    });

    workerProcess.stderr?.on('data', (data) => {
      // Ignore Redis eviction policy warnings
      const output = data.toString();
      if (!output.includes('eviction policy')) {
        console.error('Worker error:', output);
      }
    });

    workerProcess.on('error', (error) => {
      reject(new Error(`Failed to start worker: ${error.message}`));
    });

    setTimeout(() => {
      if (startupOutput.includes('Worker ready') || startupOutput.includes('running')) {
        resolve();
      } else {
        reject(new Error('Worker startup timeout'));
      }
    }, 10000);
  });
}

/**
 * Stop settlement worker
 */
async function stopWorker(): Promise<void> {
  if (workerProcess) {
    console.log('\n🛑 Stopping settlement worker...\n');
    workerProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

/**
 * Get test user
 */
async function getTestUser() {
  const user = await prisma.user.findUnique({
    where: { username: TEST_USER },
    include: { account: true }
  });

  if (!user) {
    throw new Error(`Test user '${TEST_USER}' not found`);
  }

  return user;
}

/**
 * Create test league and teams
 */
async function createTestLeagueAndTeams() {
  // Create sport
  const sport = await prisma.sport.upsert({
    where: { id: 'BASKETBALL' },
    update: {},
    create: {
      id: 'BASKETBALL',
      name: 'Basketball',
      icon: '🏀'
    }
  });

  // Create league
  const league = await prisma.league.upsert({
    where: { id: 'TEST_NBA' },
    update: {},
    create: {
      id: 'TEST_NBA',
      name: 'Test NBA',
      sportId: sport.id,
      logo: 'https://example.com/nba.png'
    }
  });

  // Create teams
  const teams = [];
  for (let i = 1; i <= 4; i++) {
    const team = await prisma.team.upsert({
      where: { id: `TEST_TEAM_${i}` },
      update: {},
      create: {
        id: `TEST_TEAM_${i}`,
        name: `Test Team ${i}`,
        shortName: `TT${i}`,
        logo: `https://example.com/team${i}.png`,
        record: '0-0',
        leagueId: league.id
      }
    });
    teams.push(team);
  }

  return { league, teams };
}

/**
 * Create test game
 */
async function createTestGame(leagueId: string, homeTeamId: string, awayTeamId: string, gameNumber: number) {
  const game = await prisma.game.create({
    data: {
      id: `TEST_GAME_${gameNumber}_${Date.now()}`,
      leagueId,
      homeTeamId,
      awayTeamId,
      startTime: new Date(),
      status: 'live', // Start as live
      venue: 'Test Arena'
    }
  });

  testGameIds.push(game.id);
  return game;
}

/**
 * Create test bet
 */
async function createTestBet(params: {
  userId: string;
  gameId: string | null;
  betType: string;
  selection: string;
  odds: number;
  line?: number;
  stake: number;
  legs?: any;
}) {
  const potentialPayout = calculatePayout(params.stake, params.odds);

  const bet = await prisma.bet.create({
    data: {
      userId: params.userId,
      gameId: params.gameId,
      betType: params.betType,
      selection: params.selection,
      odds: params.odds,
      line: params.line ?? null,
      stake: params.stake,
      potentialPayout,
      status: 'pending',
      legs: params.legs
    }
  });

  return bet;
}

/**
 * Mark game as finished
 */
async function finishGameWithScores(gameId: string, homeScore: number, awayScore: number) {
  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'finished',
      homeScore,
      awayScore
    }
  });
}

/**
 * Add test result
 */
function addTestResult(result: TestResult) {
  testResults.push(result);
  
  const status = result.passed ? '✅' : '❌';
  const payoutMatch = Math.abs(result.expectedPayout - result.actualPayout) < 0.01 ? '✅' : '❌';
  
  console.log(`${status} ${result.testName}`);
  console.log(`   Bet Type: ${result.betType}`);
  console.log(`   Expected: ${result.expectedStatus} (payout: $${result.expectedPayout.toFixed(2)})`);
  console.log(`   Actual: ${result.actualStatus} (payout: $${result.actualPayout.toFixed(2)}) ${payoutMatch}`);
  if (!result.passed) {
    console.log(`   ❌ FAILED: ${result.error || 'Status/payout mismatch'}`);
  }
  console.log();
}

/**
 * Verify bet settlement
 */
async function verifyBetSettlement(
  betId: string,
  testName: string,
  betType: string,
  expectedStatus: 'won' | 'lost' | 'push',
  stake: number,
  potentialPayout: number
): Promise<boolean> {
  const bet = await prisma.bet.findUnique({
    where: { id: betId }
  });

  if (!bet) {
    addTestResult({
      testName,
      betType,
      betId,
      expectedStatus,
      actualStatus: 'NOT FOUND',
      expectedPayout: expectedStatus === 'won' ? potentialPayout : expectedStatus === 'push' ? stake : 0,
      actualPayout: 0,
      passed: false,
      error: 'Bet not found in database'
    });
    return false;
  }

  // For display purposes:
  // - won: show potentialPayout
  // - lost: show 0 (user gets nothing)
  // - push: show stake (user gets stake back)
  const expectedPayoutDisplay = 
    expectedStatus === 'won' ? potentialPayout :
    expectedStatus === 'push' ? stake :
    0;

  const actualPayoutDisplay =
    bet.status === 'won' ? bet.potentialPayout :
    bet.status === 'push' ? stake :
    0;

  const passed = bet.status === expectedStatus;

  addTestResult({
    testName,
    betType,
    betId,
    expectedStatus,
    actualStatus: bet.status,
    expectedPayout: expectedPayoutDisplay,
    actualPayout: actualPayoutDisplay,
    passed
  });

  return passed;
}

/**
 * TEST 1: Moneyline Bets
 */
async function testMoneylineBets(user: any, gameId: string) {
  console.log('\n' + '═'.repeat(80));
  console.log('TEST 1: MONEYLINE BETS');
  console.log('═'.repeat(80) + '\n');

  const homeOdds = -150;
  const awayOdds = 130;

  // Test 1a: Home Win
  console.log('Test 1a: Moneyline - Home Wins');
  const bet1a = await createTestBet({
    userId: user.id,
    gameId,
    betType: 'moneyline',
    selection: 'home',
    odds: homeOdds,
    stake: 10
  });

  // Test 1b: Away Win
  console.log('Test 1b: Moneyline - Away Loses');
  const bet1b = await createTestBet({
    userId: user.id,
    gameId,
    betType: 'moneyline',
    selection: 'away',
    odds: awayOdds,
    stake: 10
  });

  // Simulate home team winning 110-95
  await finishGameWithScores(gameId, 110, 95);

  // Trigger settlement
  await addSettleBetsJob();
  console.log('⏳ Waiting for settlement...\n');
  await new Promise(resolve => setTimeout(resolve, SETTLEMENT_WAIT_TIME));

  // Verify results
  await verifyBetSettlement(bet1a.id, 'Moneyline Home Win', 'moneyline', 'won', 10, bet1a.potentialPayout);
  await verifyBetSettlement(bet1b.id, 'Moneyline Away Loss', 'moneyline', 'lost', 10, bet1b.potentialPayout);
}

/**
 * TEST 2: Spread Bets
 */
async function testSpreadBets(user: any, gameId: string) {
  console.log('\n' + '═'.repeat(80));
  console.log('TEST 2: SPREAD BETS');
  console.log('═'.repeat(80) + '\n');

  // Test 2a: Home covers spread
  console.log('Test 2a: Spread - Home covers -3.5');
  const bet2a = await createTestBet({
    userId: user.id,
    gameId,
    betType: 'spread',
    selection: 'home',
    odds: -110,
    line: -3.5,
    stake: 10
  });

  // Test 2b: Away doesn't cover
  console.log('Test 2b: Spread - Away +3.5 doesn\'t cover');
  const bet2b = await createTestBet({
    userId: user.id,
    gameId,
    betType: 'spread',
    selection: 'away',
    odds: -110,
    line: 3.5,
    stake: 10
  });

  // Test 2c: Push scenario
  console.log('Test 2c: Spread - Push at -5.0');
  const bet2c = await createTestBet({
    userId: user.id,
    gameId,
    betType: 'spread',
    selection: 'home',
    odds: -110,
    line: -5.0,
    stake: 10
  });

  // Simulate home winning by 5 (105-100)
  await finishGameWithScores(gameId, 105, 100);

  await addSettleBetsJob();
  console.log('⏳ Waiting for settlement...\n');
  await new Promise(resolve => setTimeout(resolve, SETTLEMENT_WAIT_TIME));

  // Verify - home wins by 5, so -3.5 covers, +3.5 doesn't, -5.0 pushes
  await verifyBetSettlement(bet2a.id, 'Spread Home Covers -3.5', 'spread', 'won', 10, bet2a.potentialPayout);
  await verifyBetSettlement(bet2b.id, 'Spread Away +3.5 No Cover', 'spread', 'lost', 10, bet2b.potentialPayout);
  await verifyBetSettlement(bet2c.id, 'Spread Push -5.0', 'spread', 'push', 10, bet2c.potentialPayout);
}

/**
 * TEST 3: Total (Over/Under) Bets
 */
async function testTotalBets(user: any, gameId: string) {
  console.log('\n' + '═'.repeat(80));
  console.log('TEST 3: TOTAL (OVER/UNDER) BETS');
  console.log('═'.repeat(80) + '\n');

  // Test 3a: Over hits
  console.log('Test 3a: Total O195.5 hits');
  const bet3a = await createTestBet({
    userId: user.id,
    gameId,
    betType: 'total',
    selection: 'over',
    odds: -110,
    line: 195.5,
    stake: 10
  });

  // Test 3b: Under misses
  console.log('Test 3b: Total U195.5 misses');
  const bet3b = await createTestBet({
    userId: user.id,
    gameId,
    betType: 'total',
    selection: 'under',
    odds: -110,
    line: 195.5,
    stake: 10
  });

  // Test 3c: Push scenario
  console.log('Test 3c: Total push at 200.0');
  const bet3c = await createTestBet({
    userId: user.id,
    gameId,
    betType: 'total',
    selection: 'over',
    odds: -110,
    line: 200.0,
    stake: 10
  });

  // Simulate final score: 110-90 = 200 total
  await finishGameWithScores(gameId, 110, 90);

  await addSettleBetsJob();
  console.log('⏳ Waiting for settlement...\n');
  await new Promise(resolve => setTimeout(resolve, SETTLEMENT_WAIT_TIME));

  // Verify - total is 200, so O195.5 wins, U195.5 loses, 200.0 pushes
  await verifyBetSettlement(bet3a.id, 'Total Over 195.5 Hits', 'total', 'won', 10, bet3a.potentialPayout);
  await verifyBetSettlement(bet3b.id, 'Total Under 195.5 Misses', 'total', 'lost', 10, bet3b.potentialPayout);
  await verifyBetSettlement(bet3c.id, 'Total Push 200.0', 'total', 'push', 10, bet3c.potentialPayout);
}

/**
 * TEST 4: Parlay Bets
 */
async function testParlayBets(user: any, game1Id: string, game2Id: string) {
  console.log('\n' + '═'.repeat(80));
  console.log('TEST 4: PARLAY BETS');
  console.log('═'.repeat(80) + '\n');

  const odds1 = -150;
  const odds2 = -110;

  // Calculate parlay odds
  const decimal1 = odds1 > 0 ? (odds1 / 100 + 1) : (100 / Math.abs(odds1) + 1);
  const decimal2 = odds2 > 0 ? (odds2 / 100 + 1) : (100 / Math.abs(odds2) + 1);
  const parlayDecimal = decimal1 * decimal2;
  const parlayOdds = parlayDecimal >= 2 ? Math.round((parlayDecimal - 1) * 100) : Math.round(-100 / (parlayDecimal - 1));

  // Test 4a: Both legs win
  console.log('Test 4a: Parlay - Both legs win');
  const bet4a = await createTestBet({
    userId: user.id,
    gameId: null,
    betType: 'parlay',
    selection: 'parlay',
    odds: parlayOdds,
    stake: 10,
    legs: {
      legs: [
        { gameId: game1Id, betType: 'moneyline', selection: 'home', odds: odds1 },
        { gameId: game2Id, betType: 'moneyline', selection: 'home', odds: odds2 }
      ]
    }
  });

  // Test 4b: One leg loses
  console.log('Test 4b: Parlay - One leg loses');
  const bet4b = await createTestBet({
    userId: user.id,
    gameId: null,
    betType: 'parlay',
    selection: 'parlay',
    odds: parlayOdds,
    stake: 10,
    legs: {
      legs: [
        { gameId: game1Id, betType: 'moneyline', selection: 'home', odds: odds1 },
        { gameId: game2Id, betType: 'moneyline', selection: 'away', odds: odds2 }
      ]
    }
  });

  // Finish both games with home wins
  await finishGameWithScores(game1Id, 110, 95);
  await finishGameWithScores(game2Id, 105, 100);

  await addSettleBetsJob();
  console.log('⏳ Waiting for settlement...\n');
  await new Promise(resolve => setTimeout(resolve, SETTLEMENT_WAIT_TIME));

  await verifyBetSettlement(bet4a.id, 'Parlay Both Win', 'parlay', 'won', 10, bet4a.potentialPayout);
  await verifyBetSettlement(bet4b.id, 'Parlay One Loss', 'parlay', 'lost', 10, bet4b.potentialPayout);
}

/**
 * Generate test report
 */
function generateTestReport() {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 COMPREHENSIVE TEST REPORT');
  console.log('═'.repeat(80) + '\n');

  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : '0.00';

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Pass Rate: ${passRate}%\n`);

  // Group by bet type
  const byType = testResults.reduce((acc, result) => {
    if (!acc[result.betType]) {
      acc[result.betType] = { passed: 0, failed: 0 };
    }
    if (result.passed) {
      acc[result.betType].passed++;
    } else {
      acc[result.betType].failed++;
    }
    return acc;
  }, {} as Record<string, { passed: number; failed: number }>);

  console.log('Results by Bet Type:');
  Object.entries(byType).forEach(([type, counts]) => {
    const total = counts.passed + counts.failed;
    const rate = ((counts.passed / total) * 100).toFixed(0);
    console.log(`  ${type}: ${counts.passed}/${total} (${rate}%)`);
  });

  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    testResults
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`\n  Test: ${r.testName}`);
        console.log(`  Bet ID: ${r.betId}`);
        console.log(`  Expected: ${r.expectedStatus} ($${r.expectedPayout.toFixed(2)})`);
        console.log(`  Actual: ${r.actualStatus} ($${r.actualPayout.toFixed(2)})`);
        if (r.error) {
          console.log(`  Error: ${r.error}`);
        }
      });
  }

  console.log('\n' + '═'.repeat(80));

  if (passRate === '100.00') {
    console.log('\n🎉 ALL TESTS PASSED! Settlement system is fully operational.\n');
  } else {
    console.log(`\n⚠️  ${failedTests} test(s) failed. Review the failures above.\n`);
  }
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...\n');
  
  // Delete test bets
  await prisma.bet.deleteMany({
    where: {
      gameId: { in: testGameIds }
    }
  });

  // Delete test games
  await prisma.game.deleteMany({
    where: {
      id: { in: testGameIds }
    }
  });

  console.log('✅ Test data cleaned up\n');
}

/**
 * Main test execution
 */
async function runAllTests() {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('🧪 COMPREHENSIVE BET SETTLEMENT TEST SUITE');
    console.log('═'.repeat(80));

    // Step 1: Start fresh worker
    await startWorker();

    // Step 2: Get test user
    const user = await getTestUser();
    console.log(`Testing with user: ${user.username} (${user.id})\n`);

    // Step 3: Create test league and teams
    console.log('📋 Creating test league and teams...');
    const { league, teams } = await createTestLeagueAndTeams();
    console.log(`✅ Created league: ${league.name}`);
    console.log(`✅ Created ${teams.length} teams\n`);

    // Step 4: Create test games
    console.log('🎮 Creating test games...');
    const game1 = await createTestGame(league.id, teams[0].id, teams[1].id, 1);
    const game2 = await createTestGame(league.id, teams[2].id, teams[3].id, 2);
    const game3 = await createTestGame(league.id, teams[0].id, teams[2].id, 3);
    const game4 = await createTestGame(league.id, teams[1].id, teams[3].id, 4);
    console.log(`✅ Created 4 test games\n`);

    // Run all tests
    await testMoneylineBets(user, game1.id);
    await testSpreadBets(user, game2.id);
    await testTotalBets(user, game3.id);
    await testParlayBets(user, game4.id, game1.id);

    // Generate report
    generateTestReport();

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await cleanup();
    await stopWorker();
    await prisma.$disconnect();
  }
}

// Run tests
runAllTests();
