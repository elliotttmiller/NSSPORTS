# Custom Betslip - Code Examples

## Example 1: Basic Usage - Toggle Bets

```typescript
// User adds 3 bets to betslip
addBet(game1, 'spread', 'home', -110, -2.5);
addBet(game2, 'moneyline', 'away', 120);
addBet(game3, 'total', 'over', -110, 220.5);

// User switches to custom mode
setBetType('custom');

// State at this point:
// {
//   bets: [bet1, bet2, bet3],
//   betType: 'custom',
//   customStraightBets: [],
//   customParlayBets: [],
//   customStakes: {},
//   totalStake: 0,
//   totalPayout: 0
// }

// User designates bet1 as straight
toggleCustomStraight(bet1.id);

// State changes to:
// {
//   customStraightBets: [bet1.id],
//   customStakes: { [bet1.id]: 10 }, // Default stake
//   totalStake: 10,
//   totalPayout: 19.09 // Calculated based on -110 odds
// }

// User updates stake for bet1
updateCustomStake(bet1.id, 50);

// State changes to:
// {
//   customStakes: { [bet1.id]: 50 },
//   totalStake: 50,
//   totalPayout: 95.45
// }

// User adds bet2 and bet3 to parlay
toggleCustomParlay(bet2.id);
toggleCustomParlay(bet3.id);

// State changes to:
// {
//   customStraightBets: [bet1.id],
//   customParlayBets: [bet2.id, bet3.id],
//   customStakes: { 
//     [bet1.id]: 50,
//     'parlay': 10 // Default parlay stake
//   },
//   totalStake: 60,
//   totalPayout: 95.45 + 26.4 = 121.85
// }

// User updates parlay stake
updateCustomStake('parlay', 25);

// Final state:
// {
//   customStraightBets: [bet1.id],
//   customParlayBets: [bet2.id, bet3.id],
//   customStakes: { 
//     [bet1.id]: 50,
//     'parlay': 25
//   },
//   totalStake: 75,
//   totalPayout: 95.45 + 66.0 = 161.45
// }
```

## Example 2: Mutual Exclusivity

```typescript
// User has a bet in straight mode
toggleCustomStraight(bet1.id);
// customStraightBets: [bet1.id]
// customParlayBets: []

// User changes mind and adds it to parlay
toggleCustomParlay(bet1.id);
// customStraightBets: []  ← Automatically removed
// customParlayBets: [bet1.id]  ← Added here

// User changes mind again
toggleCustomStraight(bet1.id);
// customStraightBets: [bet1.id]  ← Added back
// customParlayBets: []  ← Automatically removed
```

## Example 3: Bet Removal

```typescript
// User has configured custom bets
// customStraightBets: [bet1.id]
// customParlayBets: [bet2.id, bet3.id]

// User removes bet2
removeBet(bet2.id);

// State automatically cleans up:
// customStraightBets: [bet1.id]
// customParlayBets: [bet3.id]  ← bet2 removed
// customStakes: { [bet1.id]: 50 }  ← bet2 stake removed
```

## Example 4: Placing Custom Bets

```typescript
// Desktop: handlePlaceBet()
// Mobile: handlePlaceBets()

const handlePlaceBet = async () => {
  if (betSlip.betType === 'custom') {
    const straightBets = betSlip.customStraightBets || [];
    const parlayBets = betSlip.customParlayBets || [];
    const stakes = betSlip.customStakes || {};
    
    // Place each straight bet
    for (const betId of straightBets) {
      const bet = betSlip.bets.find(b => b.id === betId);
      const stake = stakes[betId] || 0;
      
      if (bet && stake > 0) {
        await addPlacedBet([bet], 'single', stake, ...);
        // ✅ API Call 1: POST /api/my-bets (straight bet)
      }
    }
    
    // Place parlay if exists
    if (parlayBets.length > 0) {
      const parlayStake = stakes['parlay'] || 0;
      if (parlayStake > 0) {
        const bets = betSlip.bets.filter(b => parlayBets.includes(b.id));
        await addPlacedBet(bets, 'parlay', parlayStake, ...);
        // ✅ API Call 2: POST /api/my-bets (parlay)
      }
    }
    
    // Show success message
    toast.success('All bets placed!');
  }
};
```

## Example 5: Calculation Logic

```typescript
const calculateBetSlipTotals = (bets, betType, straightBets, parlayBets, stakes) => {
  if (betType === 'custom') {
    let totalStake = 0;
    let totalPayout = 0;
    
    // Calculate straight bets
    straightBets?.forEach(betId => {
      const stake = stakes?.[betId] || 0;
      const bet = bets.find(b => b.id === betId);
      if (bet && stake > 0) {
        totalStake += stake;
        
        // Convert odds to decimal
        const decimalOdds = bet.odds > 0 
          ? (bet.odds / 100) + 1 
          : (100 / Math.abs(bet.odds)) + 1;
        
        const payout = stake * decimalOdds;
        totalPayout += payout;
      }
    });
    
    // Calculate parlay
    if (parlayBets && parlayBets.length > 0) {
      const parlayStake = stakes?.['parlay'] || 0;
      if (parlayStake > 0) {
        totalStake += parlayStake;
        
        let combinedOdds = 1;
        parlayBets.forEach(betId => {
          const bet = bets.find(b => b.id === betId);
          if (bet) {
            const decimalOdds = bet.odds > 0 
              ? (bet.odds / 100) + 1 
              : (100 / Math.abs(bet.odds)) + 1;
            combinedOdds *= decimalOdds;
          }
        });
        
        const parlayPayout = parlayStake * combinedOdds;
        totalPayout += parlayPayout;
      }
    }
    
    return { totalStake, totalPayout, totalOdds: 0 };
  }
};
```

## Example 6: Real-World Scenario

```typescript
// User scenario: "I want to make 2 straight bets and 1 three-leg parlay"

// Step 1: Add 5 bets to betslip
addBet(nbaGame1, 'spread', 'home', -110, -2.5);    // bet1
addBet(nbaGame2, 'moneyline', 'away', 120);        // bet2
addBet(nflGame1, 'total', 'over', -110, 47.5);     // bet3
addBet(nflGame2, 'spread', 'home', -105, -3);      // bet4
addBet(nflGame3, 'moneyline', 'home', -140);       // bet5

// Step 2: Switch to Custom mode
setBetType('custom');

// Step 3: Configure bet types
// Straight bet 1: NBA Game 1 spread
toggleCustomStraight(bet1.id);
updateCustomStake(bet1.id, 100);

// Straight bet 2: NBA Game 2 moneyline
toggleCustomStraight(bet2.id);
updateCustomStake(bet2.id, 50);

// Parlay: NFL Games (3 legs)
toggleCustomParlay(bet3.id);
toggleCustomParlay(bet4.id);
toggleCustomParlay(bet5.id);
updateCustomStake('parlay', 25);

// Final state:
// {
//   customStraightBets: [bet1.id, bet2.id],
//   customParlayBets: [bet3.id, bet4.id, bet5.id],
//   customStakes: {
//     [bet1.id]: 100,    // NBA Game 1: $100 to win $90.91
//     [bet2.id]: 50,     // NBA Game 2: $50 to win $60
//     'parlay': 25       // NFL Parlay: $25 to win ~$184
//   },
//   totalStake: 175,
//   totalPayout: ~$509.91
// }

// Step 4: Place bets
handlePlaceBet();
// → API Call 1: POST /api/my-bets (NBA Game 1 straight)
// → API Call 2: POST /api/my-bets (NBA Game 2 straight)
// → API Call 3: POST /api/my-bets (NFL 3-leg parlay)
// → Success: "All bets placed! (3 bets)"
```

## Component Structure

```typescript
// Desktop Flow
BetSlipPanel
  ├─ Tab Buttons: [Single] [Parlay] [Custom]
  └─ When Custom selected:
      └─ CustomBetSlipContent
          ├─ For each bet:
          │   ├─ BetCardSingle (displays bet info)
          │   ├─ Checkbox: Straight
          │   ├─ Checkbox: Add to Parlay
          │   └─ If Straight: Stake Input
          └─ If parlayBets.length > 0:
              └─ Parlay Section
                  ├─ List of parlay legs
                  └─ Parlay stake input

// Mobile Flow
MobileBetSlipPanel
  ├─ Tab Buttons: [Straight] [Parlay] [Custom]
  └─ When Custom selected:
      └─ MobileCustomBetSlipContent
          ├─ For each bet:
          │   ├─ Bet info card
          │   ├─ Checkboxes (Straight/Parlay)
          │   ├─ If Straight: Stake/ToWin/Total inputs
          │   └─ Delete button
          └─ If parlayBets.length > 0:
              └─ Parlay Card
                  ├─ Parlay legs list
                  └─ Stake/ToWin/Total inputs
```

## Error Handling

```typescript
// Example with error handling
const handlePlaceBet = async () => {
  let successCount = 0;
  let failCount = 0;
  const errors = [];
  
  // Place straight bets
  for (const betId of customStraightBets) {
    try {
      await addPlacedBet(...);
      successCount++;
    } catch (error) {
      failCount++;
      errors.push(`Failed: ${bet.game.awayTeam.shortName} @ ${bet.game.homeTeam.shortName}`);
    }
  }
  
  // Place parlay
  if (customParlayBets.length > 0) {
    try {
      await addPlacedBet(...);
      successCount++;
    } catch (error) {
      failCount++;
      errors.push("Failed: Parlay bet");
    }
  }
  
  // User feedback
  if (failCount === 0) {
    toast.success(`All bets placed! (${successCount} bets)`);
  } else if (successCount > 0) {
    toast.warning(`${successCount} placed, ${failCount} failed`, {
      description: errors.join(", ")
    });
  } else {
    toast.error("Failed to place bets", {
      description: errors.join(", ")
    });
  }
};
```
