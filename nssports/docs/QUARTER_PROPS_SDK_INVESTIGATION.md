# Quarter/Period Props - SDK Investigation Guide

**Date:** November 12, 2025  
**Status:** Framework complete, awaiting SDK data structure confirmation

---

## Quick Summary

✅ **Complete Implementation:** 333-line library + full settlement integration  
🔍 **Missing Piece:** Need to confirm SDK's exact field name/structure for period scores  
⏱️ **Time to Activate:** 5-10 minutes once SDK structure is verified  

---

## Step 1: Run SDK Diagnostic

Use the built-in diagnostic tool to inspect what the SDK actually returns:

```typescript
// File: src/lib/period-scores.ts
import { diagnosticPeriodDataCheck } from '@/lib/period-scores';

// Run on a FINISHED game (any league: NBA, NFL, NHL)
// You need an actual finished game ID from your database
await diagnosticPeriodDataCheck("ACTUAL_FINISHED_GAME_ID");
```

**How to get a finished game ID:**
```sql
-- Query your database for a recently finished game
SELECT id, status, "homeScore", "awayScore", "startTime"
FROM "Game"
WHERE status = 'finished'
  AND "homeScore" IS NOT NULL
ORDER BY "startTime" DESC
LIMIT 1;
```

---

## Step 2: Analyze the Output

The diagnostic will log everything about the event structure. Look for:

### Check 1: Top-level Fields
```
[diagnosticPeriodDataCheck] Top-level fields in event: {
  fields: [
    'eventID',
    'leagueID',
    'status',
    'scores',
    'teams',
    'odds',
    'periods',      // ← LOOK FOR THIS
    'periodScores', // ← OR THIS
    'quarters',     // ← OR THIS
    'results',
    ...
  ]
}
```

### Check 2: Field Contents
If you see `periods`, `periodScores`, or `quarters`, the diagnostic will show:
```
[diagnosticPeriodDataCheck] ✅ Found field: event.periods
[diagnosticPeriodDataCheck] Type: object
[diagnosticPeriodDataCheck] Keys in event.periods: {
  keys: ['1q', '2q', '3q', '4q']  // ← Period identifiers
}
[diagnosticPeriodDataCheck] Sample (event.periods.1q): {
  home: 28,  // ← Home team score in Q1
  away: 25   // ← Away team score in Q1
}
```

---

## Step 3: Verify Library Compatibility

Our `fetchPeriodScores()` function checks THREE possible structures automatically:

### Structure 1: event.periods (most likely)
```typescript
{
  periods: {
    "1q": { home: 28, away: 25 },
    "2q": { home: 30, away: 27 },
    "3q": { home: 26, away: 23 },
    "4q": { home: 26, away: 20 }
  }
}
```
✅ **Supported by default** - no changes needed

### Structure 2: event.results (like player stats)
```typescript
{
  results: {
    "1q": { home: 28, away: 25 },
    "2q": { home: 30, away: 27 }
  }
}
```
✅ **Supported by default** - no changes needed

### Structure 3: Split keys
```typescript
{
  results: {
    "1q_home": 28,
    "1q_away": 25,
    "2q_home": 30,
    "2q_away": 27
  }
}
```
✅ **Supported by default** - no changes needed

---

## Step 4: Activate (If Structure Matches)

If the diagnostic shows ANY of the above structures, quarter/period props will work automatically!

**Test it:**
```typescript
import { fetchPeriodScores, getPeriodScore } from '@/lib/period-scores';

// Fetch all period scores
const allPeriods = await fetchPeriodScores("GAME_ID");
console.log('All periods:', allPeriods);
// Expected: { "1q": { home: 28, away: 25 }, "2q": ..., "3q": ..., "4q": ... }

// Fetch specific period
const q1Score = await getPeriodScore("GAME_ID", "1q");
console.log('Q1 score:', q1Score);
// Expected: { home: 28, away: 25 }
```

**If test passes:** ✅ Quarter/period props are immediately operational!

---

## Step 5: Update If Needed

If SDK uses a DIFFERENT structure, update `src/lib/period-scores.ts`:

### Example: SDK uses event.linescore
```typescript
// Add to fetchPeriodScores() function (around line 115)

// ATTEMPT 4: Check for event.linescore field
if (event.linescore && typeof event.linescore === 'object') {
  const periodScores: PeriodScores = {};
  
  // Adapt parsing to match SDK's actual structure
  Object.entries(event.linescore).forEach(([periodID, data]: [string, any]) => {
    periodScores[periodID] = {
      home: Number(data.home || 0),
      away: Number(data.away || 0),
    };
  });
  
  if (Object.keys(periodScores).length > 0) {
    logger.info(`Successfully parsed periods from event.linescore`);
    return periodScores;
  }
}
```

---

## Expected Period IDs by Sport

Per official SDK docs: https://sportsgameodds.com/docs/data-types/periods

### Basketball (NBA, NCAAB)
- Quarters: `1q`, `2q`, `3q`, `4q`
- Halves: `1h`, `2h`
- Full Game: `game`

### Football (NFL, NCAAF)
- Quarters: `1q`, `2q`, `3q`, `4q`
- Halves: `1h`, `2h`
- Full Game: `game`

### Hockey (NHL)
- Periods: `1p`, `2p`, `3p`
- Regulation: `reg`
- Overtime: `ot`
- Shootout: `so`

### Baseball (MLB)
- Innings: `1i`, `2i`, `3i`, `4i`, `5i`, `6i`, `7i`, `8i`, `9i`
- First 5 Innings: `1h` (formerly `1ix5`)
- First 7 Innings: `1ix7`

---

## Current Behavior (Before Activation)

**Quarter/Period props currently auto-push:**
- Bet placed: $10 on "Lakers Q1 over 28.5"
- Game finishes: Lakers score 31 in Q1
- Settlement result: **PUSH** (stake returned)
- Reason: "Period data unavailable"

**This is safe:** Users get refunds, no risk of incorrect settlements.

---

## Once Activated

**Quarter/Period props will settle correctly:**
- Bet placed: $10 on "Lakers Q1 over 28.5"
- Game finishes: Lakers score 31 in Q1
- Period scores fetched: `{ "1q": { home: 31, away: 27 } }`
- Settlement result: **WON** ✅
- Reason: "Period: 31, over 28.5"
- Payout: $10 × odds

---

## FAQ

### Q: What if SDK doesn't provide period scores at all?
**A:** Quarter/period props will continue to auto-push (refund stakes). This is safe and expected. You can either:
1. Keep offering the bets (users get refunds)
2. Disable quarter/period props in your UI until SDK adds the data
3. Contact SportsGameOdds support to request period score data

### Q: Do I need to update my database schema?
**A:** No! Period scores are fetched on-demand from the SDK during settlement. No database changes needed.

### Q: Will this affect team total props?
**A:** No! Team total props use full game scores (`game.homeScore`/`game.awayScore`) which already work perfectly.

### Q: What about parlays with quarter props?
**A:** Already implemented! The parlay leg grading calls `getPeriodScore()` automatically for period props.

### Q: Can I test without a finished game?
**A:** No, period scores are only available for finished games (like player stats). You need to wait for a real game to finish, then run the diagnostic.

---

## Troubleshooting

### Diagnostic shows "Game not found"
- Check the game ID is correct
- Ensure the game is in your database
- Verify the game is actually finished (`status = 'finished'`)

### Diagnostic shows no period fields
- SDK may not provide period scores yet
- Contact SportsGameOdds support for timeline
- Quarter/period props will safely auto-push until available

### Period scores parse but settlement still pushes
- Check `gameProp.periodID` is set in bet metadata
- Verify period ID format matches SDK (e.g., "1q" not "Q1")
- Check logs for "Fetching period X scores" messages

---

## Contact

Need help? Check these resources:
- SDK Docs: https://sportsgameodds.com/docs/sdk
- Period IDs: https://sportsgameodds.com/docs/data-types/periods
- Support: support@sportsgameodds.com
- Discord: https://discord.gg/sportsgameodds

---

**Status:** Ready to investigate! Run the diagnostic and you'll know in minutes if quarter props can activate. 🚀
