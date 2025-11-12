# Bet Settlement Dry-Run Test System

## Overview

Comprehensive end-to-end testing framework for the bet settlement system that validates all bet types WITHOUT making any database modifications. This provides confidence that settlement logic works correctly before production deployment.

## Features

### ✅ Complete Bet Type Coverage
- **Spread Bets**: Tests home/away spreads with various lines
- **Moneyline Bets**: Tests home/away moneyline outcomes
- **Total Bets**: Tests over/under with lines around actual scores
- **Player Props**: Tests player performance props with SDK data
- **Game Props**: Tests team totals and quarter/period props
- **Parlays**: Tests multi-leg parlays with various win/loss/push scenarios

### ✅ Real SDK Data
- Fetches actual finished games from SportsGameOdds SDK
- Uses real scores and player stats
- Validates against actual game outcomes

### ✅ No Database Modifications
- Zero database writes
- No balance updates
- No bet status changes
- Completely safe for production environment

### ✅ Detailed Reporting
- Pass/fail status for each test
- Expected vs actual outcomes
- Error tracking and diagnostics
- Summary statistics

## Usage

### Basic Test Run
```bash
npm run test:settlement
```

### Verbose Mode (Detailed Output)
```bash
npm run test:settlement:verbose
```

### Custom League
```bash
tsx src/scripts/test-settlement-dry-run.ts --league NFL
```

### Limit Number of Games
```bash
tsx src/scripts/test-settlement-dry-run.ts --max-games 3
```

### All Options Combined
```bash
tsx src/scripts/test-settlement-dry-run.ts --league NBA --verbose --max-games 5
```

## Test Coverage

### Spread Tests (14 per game)
- Tests home team with 7 different lines: -10.5, -5.5, -2.5, 0, +2.5, +5.5, +10.5
- Tests away team with inverse lines
- Validates cover/loss/push outcomes

### Moneyline Tests (2 per game)
- Home team win/loss/tie scenarios
- Away team win/loss/tie scenarios

### Total Tests (14 per game)
- Tests 7 different lines around actual total
- Over bets: validates when actual > line
- Under bets: validates when actual < line
- Push scenarios when actual = line

### Player Prop Tests (Variable)
- Fetches actual player stats from SDK
- Tests over/under for multiple stat types
- Tests with lines above, at, and below actual performance
- Automatically skips if SDK doesn't provide stats

### Game Prop Tests (6+ per game)
- Team total over/under for both teams
- Quarter/period props (auto-pushes if data unavailable)
- Validates expected behavior when period data missing

### Parlay Tests (6 scenarios)
- 2-leg parlay with both wins
- 2-leg parlay with one loss (should lose)
- 2-leg parlay with one push (should reduce)
- 3-leg parlay with all wins
- 3-leg parlay with one push (should reduce)
- All legs push scenario

## Output Format

### Summary Report
```
================================================================================
🧪 BET SETTLEMENT DRY-RUN TEST SYSTEM
================================================================================
Configuration: { league: 'NBA', verbose: false, maxGames: 5 }

📡 Step 1: Fetching finished games from SDK...
✅ Found 5 finished games

🎯 Step 2: Testing bet types...

📊 Testing game: LAL @ BOS
   Final Score: 98 - 105

   ✓ Spread bets: 14/14 passed
   ✓ Moneyline bets: 2/2 passed
   ✓ Total bets: 14/14 passed
   ✓ Player props: 12/12 passed
   ✓ Game props: 6/6 passed
   ✓ Parlays: 6/6 passed

📊 FINAL SUMMARY
================================================================================
Total Tests: 268
✅ Passed: 268 (100.0%)
❌ Failed: 0 (0.0%)

🎉 ALL TESTS PASSED!
```

### Verbose Mode Output
Shows detailed results for each individual test:
```
📊 Spread Bets
  ✓ Home -10.5 (expected: lost, actual: lost)
  ✓ Home -5.5 (expected: won, actual: won)
  ✓ Home -2.5 (expected: won, actual: won)
  ...
```

## Understanding Results

### ✅ Passed Tests
- Grading algorithm returned expected outcome
- Logic is working correctly
- Settlement would be accurate

### ❌ Failed Tests
- Unexpected outcome detected
- **INVESTIGATE IMMEDIATELY**
- Indicates bug in grading logic or data extraction

### Common Failure Reasons
1. **Score Extraction Issues**: Scores not properly captured from SDK
2. **Algorithm Logic Errors**: Incorrect win/loss/push determination
3. **Metadata Parsing**: Player/game prop metadata not extracted correctly
4. **SDK Data Missing**: Player stats or period scores unavailable

## When to Run

### ✅ Before Production Deployment
- After any changes to settlement logic
- After SDK integration updates
- Before major feature releases

### ✅ During Development
- When implementing new bet types
- When modifying grading algorithms
- When updating score capture logic

### ✅ For Debugging
- When investigating settlement issues
- When validating SDK data availability
- When testing new game types or leagues

## Integration with CI/CD

Can be added to automated testing pipeline:

```yaml
# Example GitHub Actions
- name: Test Bet Settlement
  run: npm run test:settlement
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    SPORTSGAMEODDS_API_KEY: ${{ secrets.SPORTSGAMEODDS_API_KEY }}
```

## Important Notes

### 🔒 Safety Guarantees
- **NO database writes**: Uses grading functions directly without database layer
- **NO balance updates**: Does not call account balance modification functions
- **NO bet mutations**: Does not change any bet statuses in database
- **READ-ONLY**: Only queries SDK and reads database for test data

### 📊 Real Data Validation
- Uses actual finished games from SDK
- Tests with real scores and stats
- Validates against actual outcomes
- Provides confidence in production behavior

### ⚡ Performance
- Typically completes in 10-30 seconds
- Depends on number of games tested
- Can be limited with `--max-games` flag

## Troubleshooting

### No Finished Games Found
```bash
❌ No finished games found to test with
```

**Solutions:**
- Change league: `--league NFL` or `--league NHL`
- Wait for games to finish (check league schedule)
- Verify SDK API key is valid

### Player Stats Unavailable
```bash
⚠️ Player stats availability: FAILED
Details: SDK did not return player stats for this game
```

**Expected Behavior:**
- Some games may not have player stats in SDK yet
- Period scores may take time to populate
- Test will continue with other bet types

### All Tests Failing
```bash
❌ Failed: 268/268 (100.0%)
```

**CRITICAL - Investigate Immediately:**
1. Check if scores are being captured correctly
2. Verify SDK connection and authentication
3. Review recent changes to settlement logic
4. Check database schema for changes

## Related Documentation

- [BET_SETTLEMENT_AUDIT_REPORT.md](./BET_SETTLEMENT_AUDIT_REPORT.md) - Complete system audit
- [BET_SETTLEMENT_SYSTEM.md](./BET_SETTLEMENT_SYSTEM.md) - Architecture overview
- [GAME_PROPS_IMPLEMENTATION.md](./GAME_PROPS_IMPLEMENTATION.md) - Game props details
- [PLAYER_STATS_INTEGRATION.md](./BET_SETTLEMENT_AUDIT_REPORT.md#player-stats-integration) - Player prop details

## Technical Details

### File Location
```
src/scripts/test-settlement-dry-run.ts
```

### Dependencies
- `@/lib/sportsgameodds-sdk`: SDK integration for fetching games
- `@/services/bet-settlement`: Core grading algorithms
- `@/lib/player-stats`: Player performance data
- `@/lib/period-scores`: Quarter/period scores
- `@/lib/transformers/sportsgameodds-sdk`: Type definitions

### Test Data Flow
```
1. Fetch finished games from SDK (with scores)
2. For each game:
   a. Create mock bets with various scenarios
   b. Run grading algorithms
   c. Compare actual vs expected outcomes
   d. Record pass/fail status
3. Generate summary report
```

### Grading Functions Tested
- `gradeSpreadBet()`
- `gradeMoneylineBet()`
- `gradeTotalBet()`
- `gradePlayerPropBet()`
- `gradeGamePropBet()`
- `gradeParlayBet()`

## Success Criteria

### ✅ System Ready for Production When:
1. **100% Pass Rate**: All tests passing across multiple games
2. **Multiple Leagues**: Tests pass for NBA, NFL, NHL
3. **All Bet Types**: Spread, ML, total, player props, game props, parlays all working
4. **Real Data**: Using actual finished games with real SDK data
5. **Consistent Results**: Multiple test runs produce same outcomes

### ⚠️ DO NOT DEPLOY If:
- Any tests failing consistently
- Scores not being captured correctly
- SDK data not available
- Grading logic producing unexpected results

---

**Last Updated:** 2025-01-03  
**Status:** ✅ Complete (0 TypeScript errors)  
**Test Coverage:** All bet types  
**Safety:** No database modifications
