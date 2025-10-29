# NSSPORTS Betting Workflow Debugging Guide

## Overview
This document provides a comprehensive guide to the fixes applied to resolve single bet submission failures and blank bet card displays.

## Root Causes Identified

### Issue 1: Poor Error Reporting
**Problem**: When single bets failed to place, users only saw a generic "Failed to place bet. Please try again." message, with no indication of the actual error.

**Impact**: Made debugging impossible and frustrated users who couldn't understand why their bets weren't being placed.

**Fix**: Updated error handling to display specific error messages from Server Actions.

### Issue 2: Missing Game Data Display
**Problem**: Bet cards were rendering as empty shells when game data (team names) were missing or undefined.

**Impact**: Users saw blank cards with no context about their bets, making the bet history page appear broken.

**Fix**: Added fallback text and conditional rendering to handle missing game data gracefully.

## Changes Made

### 1. Server Actions (src/app/actions/bets.ts)

#### placeSingleBetAction
- Added logging at entry point with full bet data
- Added logging after authentication check
- Added detailed validation error messages (shows which field failed and why)
- Added logging of validated data
- Added logging when game is not found
- Added logging when game is finished
- Added logging before and after database creation
- Added odds rounding (Math.round) to ensure integer values for Prisma
- Enhanced catch block to include bet data in error log

#### placeParlayBetAction
- Added similar logging at all key points
- Added detailed validation error messages
- Added odds rounding for consistency
- Enhanced error handling with context

### 2. BetSlipPanel (src/components/panels/BetSlipPanel.tsx)

**Before**:
```typescript
} catch {
  toast.error("Failed to place bet. Please try again.");
}
```

**After**:
```typescript
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : "Failed to place bet. Please try again.";
  toast.error(errorMessage);
}
```

**Impact**: Users now see the actual error (e.g., "Game not found", "Invalid bet data: stake: must be positive") instead of a generic message.

### 3. BetCard Components (src/components/bets/BetCard.tsx)

#### BetCardSingle
**Before**:
```typescript
<div className="text-sm text-muted-foreground leading-tight">
  {game?.awayTeam?.shortName} @ {game?.homeTeam?.shortName}
</div>
```

**After**:
```typescript
<div className="text-sm text-muted-foreground leading-tight">
  {game?.awayTeam?.shortName && game?.homeTeam?.shortName
    ? `${game.awayTeam.shortName} @ ${game.homeTeam.shortName}`
    : "Game details unavailable"}
</div>
```

**Impact**: Cards no longer show blank "@ " strings when game data is missing.

#### BetCardParlay
**Before**:
```typescript
{(leg.game?.awayTeam?.shortName || leg.game?.homeTeam?.shortName) && (
  <div className="text-xs text-muted-foreground leading-tight">
    {leg.game?.awayTeam?.shortName ?? "AWAY"} @ {leg.game?.homeTeam?.shortName ?? "HOME"}
  </div>
)}
```

**After**:
```typescript
{(leg.game?.awayTeam?.shortName && leg.game?.homeTeam?.shortName) ? (
  <div className="text-xs text-muted-foreground leading-tight">
    {leg.game.awayTeam.shortName} @ {leg.game.homeTeam.shortName}
  </div>
) : null}
```

**Impact**: Parlay legs only show game info when complete, preventing partial displays like "AWAY @ HOME".

### 4. Test Suite (src/app/actions/bets.test.ts)

Created comprehensive tests for:
- ✅ Successful single bet placement
- ✅ Authentication failures
- ✅ Validation failures (negative stake)
- ✅ Validation failures (zero stake)
- ✅ Game not found scenarios
- ✅ Finished game scenarios
- ✅ Float odds rounding

## Common Failure Scenarios and Debugging

### Scenario 1: "Game not found" Error
**Cause**: The game ID in the bet doesn't exist in the database.

**Debug Steps**:
1. Check console logs for: `[placeSingleBetAction] Game not found: <gameId>`
2. Verify the game exists: `SELECT * FROM games WHERE id = '<gameId>'`
3. Check if games are being properly seeded or synced from the Odds API

**Fix**: Ensure games are created in the database before allowing bets on them.

### Scenario 2: "Invalid bet data" Error
**Cause**: The bet data doesn't pass Zod validation.

**Debug Steps**:
1. Check console logs for specific validation errors
2. Look for messages like: `stake: must be positive` or `selection: Invalid enum value`
3. Review the logged bet data to see what was sent

**Common Causes**:
- Stake is 0 or negative
- Selection is not one of: "home", "away", "over", "under"
- Odds is not a number
- PotentialPayout is 0 or negative

**Fix**: Ensure the BetSlipContext is calculating values correctly.

### Scenario 3: "You must be logged in to place bets" Error
**Cause**: User session is invalid or expired.

**Debug Steps**:
1. Check console logs for: `[placeSingleBetAction] No authenticated user`
2. Verify the auth session is working: Check if `await auth()` returns a valid session
3. Check if the user exists in the database

**Fix**: Ensure NextAuth is properly configured and the user is logged in.

### Scenario 4: "Cannot place bet on finished game" Error
**Cause**: Attempting to place a bet on a game that has already ended.

**Debug Steps**:
1. Check console logs for: `[placeSingleBetAction] Game already finished: <gameId>`
2. Verify the game status: `SELECT id, status FROM games WHERE id = '<gameId>'`
3. Check if the game status is being updated correctly

**Fix**: Either prevent UI from allowing bets on finished games, or update game statuses properly.

### Scenario 5: Blank Bet Cards
**Cause**: Bet was created successfully but game data is missing from the response.

**Debug Steps**:
1. Check the bet in the database: `SELECT * FROM bets WHERE id = '<betId>'`
2. Verify the game relation: `SELECT b.*, g.* FROM bets b LEFT JOIN games g ON b.gameId = g.id WHERE b.id = '<betId>'`
3. Check the API response from `/api/my-bets`

**Current Behavior**: Cards now show "Game details unavailable" instead of being blank.

**Long-term Fix**: Ensure game data is always included when fetching bets.

## Data Flow

### Single Bet Placement Flow:
```
1. User adds bet to betslip (BetSlipContext)
   ├─ Default stake: 10
   ├─ potentialPayout calculated from stake and odds
   └─ Bet stored in betSlip.bets array

2. User clicks "Place Bets" (BetSlipPanel)
   ├─ Calls addPlacedBet() from BetHistoryContext
   └─ Passes: bets array, "single", totalStake, totalPayout, totalOdds

3. BetHistoryContext
   ├─ Calls usePlaceBetWithActions mutation
   └─ Passes same parameters

4. usePlaceBetWithActions (hooks/useBetActions.ts)
   ├─ Loops through each bet
   ├─ For each bet, calls placeSingleBetAction with:
   │  ├─ gameId: bet.gameId
   │  ├─ betType: bet.betType
   │  ├─ selection: bet.selection
   │  ├─ odds: bet.odds
   │  ├─ line: bet.line ?? null
   │  ├─ stake: bet.stake || totalStake
   │  └─ potentialPayout: bet.potentialPayout || totalPayout
   └─ If any bet fails, throws error

5. placeSingleBetAction (app/actions/bets.ts)
   ├─ Validates user authentication
   ├─ Validates bet data with Zod
   ├─ Verifies game exists and is not finished
   ├─ Creates bet in database
   ├─ Revalidates paths
   └─ Returns success or error

6. On success:
   ├─ React Query invalidates bet history cache
   ├─ Bet history is refetched from /api/my-bets
   ├─ New bets appear in the UI
   └─ Success toast is shown

7. On error:
   ├─ Error is thrown and caught by BetSlipPanel
   ├─ Error message is displayed in toast
   └─ User sees specific error (e.g., "Game not found")
```

## Testing Checklist

### Manual Testing
- [ ] Can place a single bet successfully
- [ ] Success toast shows "Bet placed successfully!"
- [ ] Bet appears immediately in the betslip with correct details
- [ ] After placing, bet history refreshes and shows the new bet
- [ ] Bet card displays with correct team names
- [ ] Bet card displays with correct odds and stake
- [ ] Can place multiple single bets at once
- [ ] Parlay bets still work correctly
- [ ] Custom bet mode still works correctly

### Error Scenarios to Test
- [ ] Try to place bet with stake = 0 → Shows "Invalid bet data: stake: must be positive"
- [ ] Try to place bet on non-existent game → Shows "Game not found"
- [ ] Try to place bet on finished game → Shows "Cannot place bet on finished game"
- [ ] Try to place bet while logged out → Shows "You must be logged in to place bets"

### Bet Card Display
- [ ] Bet cards show team names when available
- [ ] Bet cards show "Game details unavailable" when game data is missing
- [ ] Bet cards still show odds, stake, and payout regardless of game data
- [ ] Parlay legs display correctly
- [ ] Parlay legs hide game info when incomplete

## Next Steps

1. **Deploy and Monitor**: Deploy these changes to a staging environment and monitor the logs for any new errors.

2. **Identify Root Cause**: With the improved logging, the specific error causing single bet failures should now be visible in the console.

3. **Database Investigation**: If "Game not found" errors appear:
   - Check if games are being properly created/synced
   - Verify game IDs match between the Odds API and database
   - Consider adding a background job to sync games regularly

4. **Schema Validation**: If "Invalid bet data" errors appear:
   - Review the exact validation error in the logs
   - Check if the BetSlipContext is setting values correctly
   - Verify type conversions between client and server

5. **Long-term Improvements**:
   - Add database migration to ensure game data integrity
   - Add UI validation to prevent invalid bets before submission
   - Add retry logic for transient failures
   - Add monitoring/alerting for bet placement failures

## Conclusion

The fixes applied provide:
1. **Better Visibility**: Specific error messages help identify issues quickly
2. **Better UX**: Users understand why their bets fail
3. **Better Debugging**: Comprehensive logs make troubleshooting easier
4. **Better Reliability**: Graceful handling of missing data prevents UI breakage

These changes establish a foundation for identifying and fixing the root cause of single bet failures, which will be revealed through the improved error reporting.
