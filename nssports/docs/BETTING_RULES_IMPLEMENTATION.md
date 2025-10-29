# Betting Rules & Restrictions Implementation

## Overview

Professional sportsbook-level betting rules have been implemented to prevent invalid bets and ensure regulatory compliance. The system validates all bet selections both when adding to the bet slip and before final placement.

## Industry Standard Rules Implemented

### 1. **Same Game Parlay - Opposite Sides**
❌ **PROHIBITED**: Cannot parlay both teams to win in the same game
- Example: PHI Moneyline + WAS Moneyline (same game)
- Example: PHI Spread -3 + WAS Spread +3 (same game)
- Example: Game Total OVER 220.5 + UNDER 220.5 (same game)

✅ **ALLOWED**: Can parlay different games
- Example: PHI ML + LAL ML (different games)

### 2. **Same Player Props - Opposite Outcomes**
❌ **PROHIBITED**: Cannot parlay both sides of the same player prop
- Example: LeBron James OVER 25.5 points + UNDER 25.5 points
- Example: Steph Curry OVER 4.5 assists + UNDER 4.5 assists

### 3. **Multiple Props - Same Player in Same Game**
❌ **PROHIBITED**: Cannot parlay multiple props from same player in same game
- Example: LeBron James OVER 25.5 points + OVER 8.5 rebounds (same game)
- Reason: Too correlated

✅ **ALLOWED**: Multiple props from same player in different games
- Example: LeBron James points (LAL vs PHI) + LeBron James rebounds (LAL vs MIA)

### 4. **Correlated Parlays**
❌ **PROHIBITED**: Cannot combine highly correlated outcomes
- Example: Game Total OVER + Team Total OVER (same game)
- Reason: These outcomes are too correlated

### 5. **Minimum Parlay Requirements**
- **Minimum**: 2 selections required for parlay
- **Maximum**: 15 selections allowed in single parlay

### 6. **Stake Limits**
- **Minimum Stake**: $0.01
- **Maximum Stake**: $10,000 per bet
- **Maximum Payout**: $100,000 per bet

### 7. **Duplicate Bet Prevention**
❌ **PROHIBITED**: Cannot add the same bet twice to slip
- System automatically detects duplicates by bet ID

## Technical Implementation

### Files Created/Modified

1. **`src/lib/betting-rules.ts`** - NEW
   - Core validation logic
   - All rule checking functions
   - Violation error messages
   
2. **`src/context/BetSlipContext.tsx`** - MODIFIED
   - Validation on `addBet()`
   - Validation on `addPlayerPropBet()`
   - Validation on `addGamePropBet()`
   - User-friendly toast errors
   
3. **`src/components/features/mobile/MobileBetSlipPanel.tsx`** - MODIFIED
   - Validation before bet placement
   - Prevents invalid parlays from being submitted
   
4. **`src/components/panels/BetSlipPanel.tsx`** - MODIFIED
   - Validation before bet placement
   - Removed old basic `isParlayValid` function
   - Integrated comprehensive rule system

### Validation Flow

```
User clicks bet button
        ↓
BetSlipContext.addBet()
        ↓
validateBetAddition(existingBets, newBet, betType)
        ↓
Check all rules:
  - Duplicate check
  - Opposing sides (if parlay)
  - Same player props (if parlay)
  - Multiple player props (if parlay)
  - Correlated outcomes (if parlay)
        ↓
Violation found? → Toast error + Return early
No violation? → Add bet to slip + Success toast
```

### Validation Functions

#### `validateBetAddition(existingBets, newBet, betType)`
Validates if a new bet can be added to the slip
- Checks duplicates
- Checks parlay conflicts (if parlay mode)
- Returns `BettingRuleViolation | null`

#### `validateBetPlacement(bets, betType, stakes)`
Validates before final bet submission
- Checks stake limits
- Checks payout limits
- Checks parlay rules
- Returns `BettingRuleViolation | null`

#### `validateParlayBets(bets)`
Comprehensive parlay validation
- Minimum 2 legs
- Maximum 15 legs
- No opposing sides
- No same player conflicts
- No multiple props same player
- No correlated outcomes

## User Experience

### When Rule is Violated

**Error Toast Appears:**
```
❌ Cannot parlay both teams to win in the same game

OPPOSING_SIDES
```

**Toast Features:**
- Clear, professional error message
- Rule name for reference
- 4-second duration for important placement errors
- Automatic dismissal

### When Bet Added Successfully (Parlay Mode)

**Success Toast:**
```
✅ Bet added to parlay
```

### Custom Mode Behavior

Custom mode allows mixing single bets and parlays:
- Single bets: No restrictions between them
- Parlay group: All parlay rules apply
- Validation treats custom parlay group same as parlay mode

## Testing Scenarios

### Test Case 1: Same Game Moneylines
1. Add PHI ML to parlay
2. Try to add WAS ML from same game
3. ❌ Should show error: "Cannot parlay both teams to win in the same game"

### Test Case 2: Same Game Totals
1. Add Game Total OVER 220.5 to parlay
2. Try to add Game Total UNDER 220.5 for same game
3. ❌ Should show error: "Cannot parlay both over and under in the same game"

### Test Case 3: Same Player Props
1. Add LeBron James OVER 25.5 points to parlay
2. Try to add LeBron James UNDER 25.5 points
3. ❌ Should show error: "Cannot parlay both over and under for LeBron James's points"

### Test Case 4: Multiple Player Props
1. Add LeBron James OVER 25.5 points to parlay
2. Try to add LeBron James OVER 8.5 rebounds (same game)
3. ❌ Should show error: "Cannot parlay multiple props for LeBron James in the same game"

### Test Case 5: Valid Cross-Game Parlay
1. Add PHI ML (PHI @ WAS)
2. Add LAL ML (LAL @ DEN)
3. Add Steph Curry OVER 4.5 assists (GSW @ BOS)
4. ✅ All bets should be added successfully

### Test Case 6: Stake Validation
1. Add valid bets to parlay
2. Set stake to $0.00
3. Try to place bet
4. ❌ Should show error: "Minimum stake is $0.01"

### Test Case 7: Duplicate Prevention
1. Add PHI ML to slip
2. Click same PHI ML button again
3. ❌ Should show error: "This bet is already in your slip"

## Regulatory Compliance

These rules align with major US sportsbooks:
- **DraftKings**: Same game parlay restrictions
- **FanDuel**: Correlated outcome prevention
- **BetMGM**: Player prop restrictions
- **Caesars**: Stake and payout limits

## Future Enhancements

### Potential Additional Rules
1. **Time-based restrictions**: No live betting within X minutes of game start
2. **Account limits**: Per-user daily/weekly limits
3. **Specific sport rules**: NBA vs NFL specific restrictions
4. **Promo restrictions**: Special rules for bonus bets
5. **Geo-fencing**: State-specific regulations
6. **Responsible gaming**: Loss limits, session timeouts

### Configuration Options
Future implementation could include:
```typescript
interface BettingRulesConfig {
  minParlayLegs: number;
  maxParlayLegs: number;
  minStake: number;
  maxStake: number;
  maxPayout: number;
  allowSameGameParlays: boolean;
  allowMultiplePlayerProps: boolean;
  allowCorrelatedOutcomes: boolean;
}
```

## Maintenance

### Adding New Rules
1. Create validation function in `betting-rules.ts`
2. Add rule check to `validateParlayBets()` or `validateBetPlacement()`
3. Define clear error message
4. Add test cases
5. Update this documentation

### Modifying Existing Rules
1. Update validation logic in `betting-rules.ts`
2. Update error messages if needed
3. Test all affected scenarios
4. Update documentation

## Support

For rule violations or questions:
- Check error toast for specific rule name
- Reference this documentation for rule explanation
- Test in single bet mode first to isolate issues
- Verify all bets are from different games (for parlays)

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0  
**Status**: ✅ Fully Implemented and Production Ready
