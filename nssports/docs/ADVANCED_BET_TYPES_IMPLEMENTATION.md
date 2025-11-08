# Advanced Bet Types Implementation Guide

## Overview

This document provides a comprehensive guide for completing the implementation of advanced bet types in NSSPORTS. The foundation has been laid with type definitions, validation rules, and initial API routes.

## Completed ✅

### 1. Type Definitions (`src/types/advanced-bets.ts`)
- **Round Robin Types**: Complete type definitions for round robin bets including parlay generation
- **If Bet Types**: Conditional betting with "if win only" and "if win or tie" support
- **Reverse Bet Types**: Both win reverse and action reverse with sequence generation
- **Bet It All Types**: Progressive chain betting with all-or-nothing settlement
- **Utility Functions**: 
  - `generateCombinations()` - k-combinations algorithm for round robin
  - `generateReverseSequences()` - permutation generator for reverse bets
  - `calculateRoundRobinParlays()` - count calculator

### 2. Validation Rules (`src/lib/betting-rules.ts`)
- **validateRoundRobinBet()**: Validates 3-8 selections, parlay size validation
- **validateIfBet()**: Validates 2-5 legs for conditional bets
- **validateReverseBet()**: Validates 2-4 selections for reverse bets
- **validateBetItAll()**: Validates 2-6 legs with odds validation
- Updated existing validation functions to support new bet types

### 3. Context Updates
- **BetSlipContext**: Extended to support all new bet types
- **BetHistoryContext**: Updated to place new bet types
- **useBetActions**: Hook updated for new bet type placement

### 4. API Routes (Partial)
- **Round Robin API** (`src/app/api/round-robin/route.ts`): ✅ Complete
  - POST endpoint for placing round robin bets
  - k-combinations generation
  - Parlay calculation and balance deduction
  - Comprehensive error handling
  
- **If Bets API** (`src/app/api/if-bets/route.ts`): ✅ Complete
  - POST endpoint for conditional bets
  - Progressive stake calculation
  - Condition validation (if win only, if win or tie)

## Remaining Implementation Tasks

### 1. API Routes (Remaining)

#### A. Reverse Bets API (`src/app/api/reverse-bets/route.ts`)
**Priority: High**

```typescript
/**
 * Reverse Bet Placement API
 * 
 * Creates if bets in both directions:
 * - For 2 selections: A→B and B→A (2 sequences)
 * - For 3 selections: 6 sequences (all permutations)
 * 
 * Win Reverse: Trigger only on wins
 * Action Reverse: Trigger on wins, pushes, or cancellations
 */

// Key Implementation Points:
// 1. Use generateReverseSequences() to create all permutations
// 2. Calculate stake per sequence (total stake / num sequences)
// 3. Store all sequences in bet.legs as JSON
// 4. Set betType to 'reverse'
// 5. Include reverseBetType ('win_reverse' or 'action_reverse') in metadata

POST /api/reverse-bets
Body: {
  selections: Bet[],
  type: "win_reverse" | "action_reverse",
  stakePerSequence: number
}
```

#### B. Bet It All API (`src/app/api/bet-it-all/route.ts`)
**Priority: High**

```typescript
/**
 * Bet It All (Progressive Chain) API
 * 
 * All winnings from each bet are automatically placed on the next bet.
 * All-or-nothing settlement - one loss resets to zero.
 * 
 * Industry standard: 2-6 legs maximum
 */

// Key Implementation Points:
// 1. Validate chain order (2-6 legs)
// 2. Calculate progressive payouts for each leg
// 3. Store chain sequence in bet.legs as JSON
// 4. Only deduct initial stake from balance
// 5. Track progressive stake in metadata
// 6. First leg is 'active', rest are 'pending'

POST /api/bet-it-all
Body: {
  legs: Bet[],
  initialStake: number,
  allOrNothing: boolean  // default true
}
```

#### C. Update My Bets API (`src/app/api/my-bets/route.ts`)
**Priority: High**

The existing my-bets API needs updates to properly display and settle advanced bet types:

```typescript
// In GET handler - add special formatting for advanced bet types:
if (bet.betType === 'round_robin') {
  // Parse legs JSON to show parlay breakdown
  const metadata = JSON.parse(bet.legs);
  // Format display with number of parlays, types (by 2's, by 3's)
}

if (bet.betType === 'if_bet') {
  // Show conditional chain with current active leg
  // Display condition (if win only vs if win or tie)
}

if (bet.betType === 'reverse') {
  // Show all sequences with individual status
  // Display type (win reverse vs action reverse)
}

if (bet.betType === 'bet_it_all') {
  // Show progressive chain with running stake
  // Highlight current active leg
}
```

### 2. Grading and Settlement Logic

#### A. Conditional Bet Queue System
**Priority: Critical**

Create a grading service that processes conditional bets:

```typescript
// src/lib/grading/conditional-bets.ts

/**
 * Process conditional bets when games settle
 * 
 * Flow:
 * 1. Game settles → trigger grading
 * 2. Find all if_bets, reverse bets, bet_it_all with this game
 * 3. Check current leg status
 * 4. If condition met, activate next leg
 * 5. If condition not met, settle entire bet as loss
 */

export async function gradeConditionalBet(betId: string) {
  const bet = await prisma.bet.findUnique({ where: { id: betId } });
  const metadata = JSON.parse(bet.legs);
  
  // For If Bets
  if (bet.betType === 'if_bet') {
    const currentLeg = metadata.legs.find(l => l.status === 'active');
    const legGame = await getGameStatus(currentLeg.gameId);
    
    if (legGame.status === 'finished') {
      const legResult = calculateLegResult(currentLeg, legGame);
      
      if (legResult === 'won') {
        // Activate next leg or settle if last leg
        activateNextLeg(bet, metadata);
      } else if (legResult === 'pushed' && metadata.condition === 'if_win_or_tie') {
        // Continue to next leg
        activateNextLeg(bet, metadata);
      } else {
        // Settle as loss
        settleBet(bet, 'lost', 0);
      }
    }
  }
  
  // Similar logic for reverse and bet_it_all
}

async function activateNextLeg(bet, metadata) {
  const currentLegIndex = metadata.legs.findIndex(l => l.status === 'active');
  const nextLegIndex = currentLegIndex + 1;
  
  if (nextLegIndex < metadata.legs.length) {
    // Update next leg to active
    metadata.legs[nextLegIndex].status = 'active';
    await prisma.bet.update({
      where: { id: bet.id },
      data: { legs: JSON.stringify(metadata) }
    });
  } else {
    // Last leg won - settle entire bet
    settleBet(bet, 'won', bet.potentialPayout);
  }
}
```

#### B. Round Robin Grading
**Priority: High**

```typescript
// src/lib/grading/round-robin.ts

/**
 * Grade Round Robin bets
 * 
 * Each parlay is independent - calculate payout for each winning parlay
 */

export async function gradeRoundRobin(betId: string) {
  const bet = await prisma.bet.findUnique({ where: { id: betId } });
  const metadata = JSON.parse(bet.legs);
  
  let totalPayout = 0;
  let parlaysWon = 0;
  let parlaysLost = 0;
  let parlaysPending = 0;
  
  for (const parlay of metadata.parlays) {
    // Check all legs of this parlay
    const parlayLegs = parlay.legIndexes.map(i => metadata.selections[i]);
    const parlayResult = await gradeParlayLegs(parlayLegs);
    
    if (parlayResult === 'won') {
      totalPayout += parlay.potentialPayout;
      parlaysWon++;
    } else if (parlayResult === 'lost') {
      parlaysLost++;
    } else {
      parlaysPending++;
    }
  }
  
  // If all parlays settled, settle the round robin
  if (parlaysPending === 0) {
    await settleBet(bet, totalPayout > 0 ? 'won' : 'lost', totalPayout);
  }
}
```

### 3. Frontend - Page Routes

#### A. Round Robin Page (`src/app/round-robin/page.tsx`)
**Priority: Medium**

```tsx
/**
 * Round Robin Bet Builder Page
 * 
 * Features:
 * - Selection list (3-8 picks required)
 * - Parlay type checkboxes (by 2's, by 3's, etc.)
 * - Live calculation of number of parlays
 * - Stake per parlay input
 * - Total stake display
 * - Preview all generated parlays
 */

export default function RoundRobinPage() {
  const { betSlip } = useBetSlip();
  const [selectedTypes, setSelectedTypes] = useState<RoundRobinType[]>([]);
  const [stakePerParlay, setStakePerParlay] = useState(10);
  
  // Calculate parlays
  const numParlays = selectedTypes.reduce((sum, type) => {
    const config = ROUND_ROBIN_CONFIGS[type];
    return sum + calculateRoundRobinParlays(betSlip.bets.length, config.parlaySize);
  }, 0);
  
  const totalStake = numParlays * stakePerParlay;
  
  return (
    <div>
      <h1>Round Robin Builder</h1>
      
      {/* Selection list */}
      <SelectionsList bets={betSlip.bets} />
      
      {/* Parlay type selector */}
      <ParlayTypeSelector 
        selections={betSlip.bets.length}
        selected={selectedTypes}
        onChange={setSelectedTypes}
      />
      
      {/* Stake input */}
      <StakeInput value={stakePerParlay} onChange={setStakePerParlay} />
      
      {/* Summary */}
      <Summary 
        numParlays={numParlays}
        totalStake={totalStake}
        potentialPayout={calculateTotalPotentialPayout()}
      />
      
      {/* Place bet button */}
      <PlaceBetButton onClick={placeRoundRobin} />
    </div>
  );
}
```

#### B. If Bets Page (`src/app/if-bets/page.tsx`)
**Priority: Medium**

```tsx
/**
 * If Bet (Conditional Bet) Builder Page
 * 
 * Features:
 * - Sequential leg list with drag-to-reorder
 * - Condition selector (if win only vs if win or tie)
 * - Progressive stake calculation display
 * - Visual chain/flow indicator
 * - Initial stake input
 */

export default function IfBetsPage() {
  const { betSlip } = useBetSlip();
  const [condition, setCondition] = useState<IfBetCondition>('if_win_only');
  const [initialStake, setInitialStake] = useState(10);
  const [legOrder, setLegOrder] = useState<string[]>([]);
  
  // Calculate progressive payouts
  const progressivePayouts = calculateProgressivePayouts(
    betSlip.bets.filter(b => legOrder.includes(b.id)),
    initialStake
  );
  
  return (
    <div>
      <h1>If Bet Builder</h1>
      
      {/* Condition selector */}
      <ConditionSelector value={condition} onChange={setCondition} />
      
      {/* Leg sequence with drag-drop */}
      <LegSequence 
        legs={betSlip.bets}
        order={legOrder}
        onReorder={setLegOrder}
        progressivePayouts={progressivePayouts}
      />
      
      {/* Initial stake */}
      <StakeInput value={initialStake} onChange={setInitialStake} />
      
      {/* Visual flow */}
      <ConditionalFlowDiagram 
        legs={betSlip.bets}
        condition={condition}
      />
      
      {/* Place bet button */}
      <PlaceBetButton onClick={placeIfBet} />
    </div>
  );
}
```

#### C. Reverse Bets Page (`src/app/reverse-bets/page.tsx`)
**Priority: Medium**

#### D. Bet It All Page (`src/app/bet-it-all/page.tsx`)
**Priority: Medium**

### 4. UI Components

#### Desktop Components Needed:
- **RoundRobinParlaySelector.tsx**: Checkbox list for parlay types
- **IfBetConditionSelector.tsx**: Toggle for win only vs win or tie
- **ReverseBetTypeSelector.tsx**: Toggle for win reverse vs action reverse
- **BetItAllChainVisualizer.tsx**: Progressive chain display
- **ParlayPreviewList.tsx**: Show all generated parlays
- **ConditionalFlowDiagram.tsx**: Visual representation of if bet flow

#### Mobile Components Needed:
- **MobileRoundRobinBuilder.tsx**: Touch-friendly round robin interface
- **MobileIfBetBuilder.tsx**: Sequential leg builder with swipe
- **MobileReverseBetBuilder.tsx**: Reverse bet configuration
- **MobileBetItAllBuilder.tsx**: Chain builder interface

### 5. Database Migrations

The current schema supports storing advanced bet types in the `legs` JSON field, but you may want to create dedicated tables for better querying:

```sql
-- Optional: Dedicated table for conditional bet legs
CREATE TABLE conditional_bet_legs (
  id TEXT PRIMARY KEY,
  bet_id TEXT REFERENCES bets(id),
  leg_order INT NOT NULL,
  game_id TEXT REFERENCES games(id),
  bet_type TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds INT NOT NULL,
  line FLOAT,
  status TEXT NOT NULL DEFAULT 'pending',
  triggered_at TIMESTAMP,
  settled_at TIMESTAMP
);

-- Optional: Dedicated table for round robin parlays
CREATE TABLE round_robin_parlays (
  id TEXT PRIMARY KEY,
  bet_id TEXT REFERENCES bets(id),
  parlay_type TEXT NOT NULL,
  leg_indexes INT[] NOT NULL,
  odds INT NOT NULL,
  stake FLOAT NOT NULL,
  potential_payout FLOAT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);
```

### 6. Testing

#### Unit Tests:
- **k-combinations algorithm** (`generateCombinations`)
- **Permutation generation** (`generateReverseSequences`)
- **Round robin parlay count** (`calculateRoundRobinParlays`)
- **Validation rules** for each bet type
- **Odds calculation** functions

#### Integration Tests:
- **Round robin placement** with various selection counts
- **If bet conditional logic** (win only vs win or tie)
- **Reverse bet sequence generation**
- **Bet it all progressive stake calculation**
- **Balance deduction and restoration**

#### E2E Tests:
- **Complete user flow** for each bet type
- **Bet placement to settlement**
- **Multi-bet combinations**

### 7. Documentation

#### User Guides:
- **Round Robin Betting Guide**: Explain how it works, examples
- **If Bet Guide**: Conditional betting explained
- **Reverse Bet Guide**: Both directions explained
- **Bet It All Guide**: Progressive betting strategy

#### API Documentation:
- **OpenAPI/Swagger** specs for each endpoint
- **Request/response examples**
- **Error code documentation**

#### Algorithm Documentation:
- **k-combinations explanation** with examples
- **Conditional bet grading flow**
- **Progressive stake calculation**

## Implementation Priority

### Phase 1 (Critical - Complete First):
1. ✅ Type definitions
2. ✅ Validation rules
3. ✅ Round Robin API
4. ✅ If Bets API
5. ⏳ Reverse Bets API
6. ⏳ Bet It All API
7. ⏳ Update My Bets API for display

### Phase 2 (High Priority):
8. ⏳ Grading/settlement logic for all types
9. ⏳ Round Robin page
10. ⏳ If Bets page

### Phase 3 (Medium Priority):
11. ⏳ Reverse Bets page
12. ⏳ Bet It All page
13. ⏳ Desktop UI components
14. ⏳ Mobile UI components

### Phase 4 (Polish):
15. ⏳ Testing suite
16. ⏳ Documentation
17. ⏳ Performance optimization

## Code Examples

### Placing a Round Robin Bet (Frontend)

```typescript
import { useMutation } from '@tanstack/react-query';

const placeRoundRobin = useMutation({
  mutationFn: async (data: {
    selections: Bet[];
    roundRobinTypes: RoundRobinType[];
    stakePerParlay: number;
  }) => {
    const response = await fetch('/api/round-robin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }
    
    return response.json();
  },
  onSuccess: (data) => {
    toast.success(`Round Robin placed! ${data.bet.numParlays} parlays created`);
    clearBetSlip();
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

### Grading an If Bet (Backend)

```typescript
// Called by a cron job or game settlement webhook
export async function gradeIfBets(gameId: string) {
  const activeIfBets = await prisma.bet.findMany({
    where: {
      betType: 'if_bet',
      status: 'pending',
    },
  });
  
  for (const bet of activeIfBets) {
    const metadata = JSON.parse(bet.legs as string);
    const activeLeg = metadata.legs.find((l: any) => l.status === 'active');
    
    if (activeLeg && activeLeg.gameId === gameId) {
      await gradeConditionalBet(bet.id);
    }
  }
}
```

## Tips for Implementation

1. **Start with tests**: Write tests for utility functions first
2. **Use existing patterns**: Follow the teaser implementation as a model
3. **Progressive enhancement**: Get basic functionality working first
4. **Error handling**: Be comprehensive with error messages
5. **Logging**: Add detailed logging for debugging
6. **Performance**: Consider caching for parlay generation
7. **User feedback**: Toast notifications for every action
8. **Mobile first**: Ensure touch-friendly interfaces

## Resources

### External References:
- **Round Robin**: DraftKings, FanDuel parlay builders
- **If Bets**: Boyd's Bets conditional betting guide
- **Reverse Bets**: Action Network reverse bet calculator
- **Bet It All**: Progressive betting strategy guides

### Internal Code References:
- **Teaser Implementation**: `src/app/teasers/page.tsx`
- **Parlay Logic**: `src/context/BetSlipContext.tsx`
- **Bet Grading**: `src/app/api/my-bets/route.ts`

## Conclusion

This implementation guide provides a complete roadmap for finishing the advanced bet types feature. The foundation is solid with type definitions, validation, and initial API routes complete. Following this guide will result in a production-ready implementation of industry-standard advanced betting features.
