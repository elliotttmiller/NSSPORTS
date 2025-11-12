/**
 * Bet Settlement Dry-Run Test System
 * 
 * Comprehensive end-to-end testing of bet settlement logic WITHOUT database modifications.
 * Tests all bet types with real SDK data to verify accuracy and completeness.
 * 
 * WHAT THIS DOES:
 * 1. Fetches real finished games from SDK
 * 2. Creates mock bets for every bet type
 * 3. Runs settlement logic (grading algorithms)
 * 4. Validates results against expected outcomes
 * 5. Reports accuracy and any issues
 * 
 * WHAT THIS DOESN'T DO:
 * - No database writes
 * - No balance updates
 * - No bet status changes
 * 
 * Usage:
 *   npm run test:settlement-dry-run
 *   npm run test:settlement-dry-run -- --league NBA
 *   npm run test:settlement-dry-run -- --verbose
 */

import { getEvents } from '@/lib/sportsgameodds-sdk';
import { 
  gradeSpreadBet, 
  gradeMoneylineBet, 
  gradeTotalBet,
  gradePlayerPropBet,
  gradeGamePropBet,
  gradeParlayBet,
  type LegGradingResult
} from '@/services/bet-settlement';
import { fetchPlayerStats } from '@/lib/player-stats';
import type { ExtendedSDKEvent } from '@/lib/transformers/sportsgameodds-sdk';

// Test configuration
interface TestConfig {
  league?: string;
  verbose?: boolean;
  maxGames?: number;
}

interface TestResult {
  betType: string;
  testName: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
  errors: string[];
}

/**
 * Main test runner
 */
export async function runSettlementDryRun(config: TestConfig = {}): Promise<TestSummary> {
  console.log('='.repeat(80));
  console.log('🧪 BET SETTLEMENT DRY-RUN TEST SYSTEM');
  console.log('='.repeat(80));
  console.log(`Configuration:`, config);
  console.log('');

  const summary: TestSummary = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    results: [],
    errors: []
  };

  try {
    // Step 1: Fetch finished games from SDK
    console.log('📡 Step 1: Fetching finished games from SDK...');
    const finishedGames = await fetchFinishedGames(config.league, config.maxGames || 5);
    
    if (finishedGames.length === 0) {
      console.log('❌ No finished games found to test with');
      summary.errors.push('No finished games available');
      return summary;
    }

    console.log(`✅ Found ${finishedGames.length} finished games`);
    console.log('');

    // Step 2: Test each bet type
    console.log('🎯 Step 2: Testing bet types...');
    console.log('');

    for (const game of finishedGames) {
      const awayName = game.teams?.away?.names?.short || 'Away';
      const homeName = game.teams?.home?.names?.short || 'Home';
      console.log(`📊 Testing game: ${awayName} @ ${homeName}`);
      console.log(`   Final Score: ${game.scores?.away || 0} - ${game.scores?.home || 0}`);
      console.log('');

      // Test spread bets
      const spreadResults = await testSpreadBets(game, config);
      summary.results.push(...spreadResults);

      // Test moneyline bets
      const mlResults = await testMoneylineBets(game, config);
      summary.results.push(...mlResults);

      // Test total bets
      const totalResults = await testTotalBets(game, config);
      summary.results.push(...totalResults);

      // Test player props (if available)
      const playerPropResults = await testPlayerProps(game, config);
      summary.results.push(...playerPropResults);

      // Test game props
      const gamePropResults = await testGameProps(game, config);
      summary.results.push(...gamePropResults);

      // Test parlays
      const parlayResults = await testParlays(game, config);
      summary.results.push(...parlayResults);

      console.log('');
    }

    // Calculate summary
    summary.totalTests = summary.results.length;
    summary.passed = summary.results.filter(r => r.passed).length;
    summary.failed = summary.results.filter(r => !r.passed).length;

    // Print summary
    printSummary(summary);

  } catch (error) {
    console.error('❌ Fatal error during dry-run:', error);
    summary.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return summary;
}

/**
 * Fetch finished games from SDK
 */
async function fetchFinishedGames(league?: string, maxGames: number = 5): Promise<ExtendedSDKEvent[]> {
  try {
    const response = await getEvents({
      leagueID: league || 'NBA',
      finalized: true,
      limit: maxGames,
    });

    // Filter to games with scores  
    const gamesWithScores = response.data.filter((game) => {
      const extGame = game as unknown as ExtendedSDKEvent;
      return (
        extGame.scores?.home !== null &&
        extGame.scores?.home !== undefined &&
        extGame.scores?.away !== null &&
        extGame.scores?.away !== undefined
      );
    });

    // Cast to ExtendedSDKEvent[]
    return gamesWithScores as unknown as ExtendedSDKEvent[];
  } catch (error) {
    console.error('Error fetching finished games:', error);
    return [];
  }
}

/**
 * Test spread bets
 */
async function testSpreadBets(game: ExtendedSDKEvent, config: TestConfig): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test lines to try
  const testLines = [-10.5, -5.5, -2.5, 0, 2.5, 5.5, 10.5];
  
  for (const line of testLines) {
    // Test home team spread  
    const homeScore = game.scores?.home ?? 0;
    const awayScore = game.scores?.away ?? 0;
    
    const homeResult = gradeSpreadBet({
      selection: 'home',
      line,
      homeScore,
      awayScore
    });

    const homeExpected = determineSpreadOutcome(
      homeScore,
      awayScore,
      line,
      'home'
    );

    results.push({
      betType: 'spread',
      testName: `Home ${line > 0 ? '+' : ''}${line}`,
      passed: homeResult.status === homeExpected,
      expected: homeExpected,
      actual: homeResult.status,
      details: homeResult.reason
    });

    // Test away team spread
    const awayResult = gradeSpreadBet({
      selection: 'away',
      line: -line, // Away line is opposite
      homeScore,
      awayScore
    });

    const awayExpected = determineSpreadOutcome(
      homeScore,
      awayScore,
      -line,
      'away'
    );

    results.push({
      betType: 'spread',
      testName: `Away ${-line > 0 ? '+' : ''}${-line}`,
      passed: awayResult.status === awayExpected,
      expected: awayExpected,
      actual: awayResult.status,
      details: awayResult.reason
    });
  }

  if (config.verbose) {
    printResults('Spread Bets', results);
  }

  return results;
}

/**
 * Test moneyline bets
 */
async function testMoneylineBets(game: ExtendedSDKEvent, config: TestConfig): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  const homeScore = game.scores?.home ?? 0;
  const awayScore = game.scores?.away ?? 0;

  // Test home moneyline
  const homeResult = gradeMoneylineBet({
    selection: 'home',
    homeScore,
    awayScore
  });

  const homeExpected = homeScore > awayScore ? 'won' : 
                       homeScore < awayScore ? 'lost' : 'push';

  results.push({
    betType: 'moneyline',
    testName: 'Home ML',
    passed: homeResult.status === homeExpected,
    expected: homeExpected,
    actual: homeResult.status,
    details: homeResult.reason
  });

  // Test away moneyline
  const awayResult = gradeMoneylineBet({
    selection: 'away',
    homeScore,
    awayScore
  });

  const awayExpected = awayScore > homeScore ? 'won' : 
                       awayScore < homeScore ? 'lost' : 'push';

  results.push({
    betType: 'moneyline',
    testName: 'Away ML',
    passed: awayResult.status === awayExpected,
    expected: awayExpected,
    actual: awayResult.status,
    details: awayResult.reason
  });

  if (config.verbose) {
    printResults('Moneyline Bets', results);
  }

  return results;
}

/**
 * Test total bets
 */
async function testTotalBets(game: ExtendedSDKEvent, config: TestConfig): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  const homeScore = game.scores?.home ?? 0;
  const awayScore = game.scores?.away ?? 0;
  const actualTotal = homeScore + awayScore;
  
  // Test lines around the actual total
  const testLines = [
    actualTotal - 20.5,
    actualTotal - 10.5,
    actualTotal - 0.5,
    actualTotal, // Push scenario
    actualTotal + 0.5,
    actualTotal + 10.5,
    actualTotal + 20.5
  ];

  for (const line of testLines) {
    // Test over
    const overResult = gradeTotalBet({
      selection: 'over',
      line,
      homeScore,
      awayScore
    });

    const overExpected = actualTotal === line ? 'push' :
                        actualTotal > line ? 'won' : 'lost';

    results.push({
      betType: 'total',
      testName: `Over ${line}`,
      passed: overResult.status === overExpected,
      expected: overExpected,
      actual: overResult.status,
      details: overResult.reason
    });

    // Test under
    const underResult = gradeTotalBet({
      selection: 'under',
      line,
      homeScore,
      awayScore
    });

    const underExpected = actualTotal === line ? 'push' :
                         actualTotal < line ? 'won' : 'lost';

    results.push({
      betType: 'total',
      testName: `Under ${line}`,
      passed: underResult.status === underExpected,
      expected: underExpected,
      actual: underResult.status,
      details: underResult.reason
    });
  }

  if (config.verbose) {
    printResults('Total Bets', results);
  }

  return results;
}

/**
 * Test player props
 */
async function testPlayerProps(game: ExtendedSDKEvent, config: TestConfig): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    console.log('   🏃 Testing player props...');
    
    if (!game.eventID) {
      results.push({
        betType: 'player_prop',
        testName: 'Event ID check',
        passed: false,
        expected: 'Valid event ID',
        actual: 'Missing event ID',
        details: 'Cannot fetch player stats without event ID'
      });
      return results;
    }
    
    // Fetch player stats from SDK
    const statsData = await fetchPlayerStats(game.eventID, 'ANY_PLAYER'); // Will get all players
    
    if (!statsData || Object.keys(statsData).length === 0) {
      results.push({
        betType: 'player_prop',
        testName: 'Player stats availability',
        passed: false,
        expected: 'Stats available',
        actual: 'No stats returned',
        details: 'SDK did not return player stats for this game'
      });
      return results;
    }

    // Test with actual player stats
    const statTypes = Object.keys(statsData);
    for (const statType of statTypes.slice(0, 3)) { // Test first 3 stat types
      const actualValue = statsData[statType];
      const testLines = [actualValue - 5.5, actualValue, actualValue + 5.5];

      for (const line of testLines) {
        // Test over
        const overResult = gradePlayerPropBet({
          selection: 'over',
          line,
          playerId: 'TEST_PLAYER',
          statType
        }, statsData);

        const overExpected = actualValue === line ? 'push' :
                           actualValue > line ? 'won' : 'lost';

        results.push({
          betType: 'player_prop',
          testName: `${statType} Over ${line}`,
          passed: overResult.status === overExpected,
          expected: overExpected,
          actual: overResult.status,
          details: `Actual: ${actualValue}`
        });

        // Test under
        const underResult = gradePlayerPropBet({
          selection: 'under',
          line,
          playerId: 'TEST_PLAYER',
          statType
        }, statsData);

        const underExpected = actualValue === line ? 'push' :
                             actualValue < line ? 'won' : 'lost';

        results.push({
          betType: 'player_prop',
          testName: `${statType} Under ${line}`,
          passed: underResult.status === underExpected,
          expected: underExpected,
          actual: underResult.status,
          details: `Actual: ${actualValue}`
        });
      }
    }

  } catch (error) {
    results.push({
      betType: 'player_prop',
      testName: 'Player prop test',
      passed: false,
      expected: 'Success',
      actual: 'Error',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  if (config.verbose) {
    printResults('Player Props', results);
  }

  return results;
}

/**
 * Test game props
 */
async function testGameProps(game: ExtendedSDKEvent, config: TestConfig): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    console.log('   🎮 Testing game props...');

    // Test team totals
    const homeScore = game.scores?.home ?? 0;
    const awayScore = game.scores?.away ?? 0;

    const testLines = [
      homeScore - 10.5,
      homeScore,
      homeScore + 10.5
    ];

    for (const line of testLines) {
      // Home team total over
      const homeOverResult = gradeGamePropBet({
        propType: 'team_total_home_over',
        selection: 'home_over',
        line,
        homeScore,
        awayScore
      });

      const homeOverExpected = homeScore === line ? 'push' :
                              homeScore > line ? 'won' : 'lost';

      results.push({
        betType: 'game_prop',
        testName: `Home Total Over ${line}`,
        passed: homeOverResult.status === homeOverExpected,
        expected: homeOverExpected,
        actual: homeOverResult.status,
        details: `Actual: ${homeScore}`
      });

      // Home team total under
      const homeUnderResult = gradeGamePropBet({
        propType: 'team_total_home_under',
        selection: 'home_under',
        line,
        homeScore,
        awayScore
      });

      const homeUnderExpected = homeScore === line ? 'push' :
                               homeScore < line ? 'won' : 'lost';

      results.push({
        betType: 'game_prop',
        testName: `Home Total Under ${line}`,
        passed: homeUnderResult.status === homeUnderExpected,
        expected: homeUnderExpected,
        actual: homeUnderResult.status,
        details: `Actual: ${homeScore}`
      });
    }

    // Test quarter props (will auto-push if no data)
    const q1Result = gradeGamePropBet({
      propType: '1q_team_total_home_over',
      selection: 'home_over',
      line: 25.5,
      homeScore,
      awayScore
    }, null); // No period data

    results.push({
      betType: 'game_prop',
      testName: 'Q1 prop without period data',
      passed: q1Result.status === 'push',
      expected: 'push',
      actual: q1Result.status,
      details: 'Should auto-push when period data unavailable'
    });

  } catch (error) {
    results.push({
      betType: 'game_prop',
      testName: 'Game prop test',
      passed: false,
      expected: 'Success',
      actual: 'Error',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  if (config.verbose) {
    printResults('Game Props', results);
  }

  return results;
}

/**
 * Test parlays
 */
async function testParlays(game: ExtendedSDKEvent, config: TestConfig): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    console.log('   🎰 Testing parlays...');

    // Create test parlay scenarios
    const scenarios: Array<{
      name: string;
      legs: LegGradingResult[];
      expected: string;
    }> = [
      {
        name: '2-leg parlay (both win)',
        legs: [
          { legId: '1', status: 'won', reason: 'Leg 1 won' },
          { legId: '2', status: 'won', reason: 'Leg 2 won' }
        ],
        expected: 'won'
      },
      {
        name: '2-leg parlay (one loss)',
        legs: [
          { legId: '1', status: 'won', reason: 'Leg 1 won' },
          { legId: '2', status: 'lost', reason: 'Leg 2 lost' }
        ],
        expected: 'lost'
      },
      {
        name: '2-leg parlay (one push)',
        legs: [
          { legId: '1', status: 'won', reason: 'Leg 1 won' },
          { legId: '2', status: 'push', reason: 'Leg 2 pushed' }
        ],
        expected: 'won' // Push reduces parlay
      },
      {
        name: '3-leg parlay (all win)',
        legs: [
          { legId: '1', status: 'won', reason: 'Leg 1 won' },
          { legId: '2', status: 'won', reason: 'Leg 2 won' },
          { legId: '3', status: 'won', reason: 'Leg 3 won' }
        ],
        expected: 'won'
      },
      {
        name: '3-leg parlay (one push, rest win)',
        legs: [
          { legId: '1', status: 'won', reason: 'Leg 1 won' },
          { legId: '2', status: 'push', reason: 'Leg 2 pushed' },
          { legId: '3', status: 'won', reason: 'Leg 3 won' }
        ],
        expected: 'won'
      },
      {
        name: 'All legs push',
        legs: [
          { legId: '1', status: 'push', reason: 'Leg 1 pushed' },
          { legId: '2', status: 'push', reason: 'Leg 2 pushed' }
        ],
        expected: 'push'
      }
    ];

    for (const scenario of scenarios) {
      const parlayResult = gradeParlayBet(scenario.legs);

      results.push({
        betType: 'parlay',
        testName: scenario.name,
        passed: parlayResult.status === scenario.expected,
        expected: scenario.expected,
        actual: parlayResult.status,
        details: parlayResult.reason
      });
    }

  } catch (error) {
    results.push({
      betType: 'parlay',
      testName: 'Parlay test',
      passed: false,
      expected: 'Success',
      actual: 'Error',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  if (config.verbose) {
    printResults('Parlays', results);
  }

  return results;
}

/**
 * Helper: Determine expected spread outcome
 */
function determineSpreadOutcome(
  homeScore: number,
  awayScore: number,
  line: number,
  selection: 'home' | 'away'
): 'won' | 'lost' | 'push' {
  const adjustedHome = homeScore + line;
  const diff = adjustedHome - awayScore;

  if (diff === 0) return 'push';
  
  if (selection === 'home') {
    return diff > 0 ? 'won' : 'lost';
  } else {
    return diff < 0 ? 'won' : 'lost';
  }
}

/**
 * Print test results for a section
 */
function printResults(section: string, results: TestResult[]) {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n   ${section}: ${passed}/${results.length} passed`);
  
  if (failed > 0) {
    console.log('   ❌ Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`      - ${r.testName}: Expected ${r.expected}, got ${r.actual}`);
      if (r.details) console.log(`        ${r.details}`);
    });
  }
}

/**
 * Print final summary
 */
function printSummary(summary: TestSummary) {
  console.log('');
  console.log('='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`✅ Passed: ${summary.passed} (${((summary.passed / summary.totalTests) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${summary.failed} (${((summary.failed / summary.totalTests) * 100).toFixed(1)}%)`);
  console.log('');

  if (summary.errors.length > 0) {
    console.log('❌ Errors:');
    summary.errors.forEach(err => console.log(`   - ${err}`));
    console.log('');
  }

  // Group results by bet type
  const byType = summary.results.reduce((acc, r) => {
    if (!acc[r.betType]) acc[r.betType] = [];
    acc[r.betType].push(r);
    return acc;
  }, {} as Record<string, TestResult[]>);

  console.log('Results by Bet Type:');
  Object.entries(byType).forEach(([type, results]) => {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const pct = ((passed / total) * 100).toFixed(1);
    const icon = passed === total ? '✅' : passed > total * 0.9 ? '⚠️' : '❌';
    console.log(`   ${icon} ${type.padEnd(20)} ${passed}/${total} (${pct}%)`);
  });

  console.log('');
  console.log('='.repeat(80));
  
  if (summary.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Settlement system is working perfectly.');
  } else {
    console.log('⚠️ Some tests failed. Review the details above.');
  }
  console.log('='.repeat(80));
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const config: TestConfig = {};

  // Parse CLI arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--league' && args[i + 1]) {
      config.league = args[i + 1];
      i++;
    } else if (args[i] === '--verbose') {
      config.verbose = true;
    } else if (args[i] === '--max-games' && args[i + 1]) {
      config.maxGames = parseInt(args[i + 1], 10);
      i++;
    }
  }

  const summary = await runSettlementDryRun(config);

  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export type { TestConfig, TestSummary, TestResult };
