# Custom Betslip UI Structure

## Desktop Layout

```
┌─────────────────────────────────────────────────┐
│ Bet Slip                        [Clear All]     │
├─────────────────────────────────────────────────┤
│ [Single Bets] [Parlay (2)] [Custom]             │ ← Tab Buttons
├─────────────────────────────────────────────────┤
│ Select which bets to place as straight or parlay│
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ BOS @ LAL - Spread LAL -2.5    [-110]   [X] │ │
│ │                                              │ │
│ │ □ Straight  □ Add to Parlay                 │ │
│ │                                              │ │
│ │ If Straight is checked:                     │ │
│ │   Stake: $ [50]                             │ │
│ │   To win: $45.45                            │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ GSW @ BKN - Moneyline BKN    [+120]     [X] │ │
│ │                                              │ │
│ │ □ Straight  □ Add to Parlay                 │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ ⚡ Parlay (2 legs)               [+264]     │ │ ← Parlay Section
│ │                                              │ │
│ │ 1️⃣ BOS @ LAL - Spread LAL -2.5    [-110]   │ │
│ │ 2️⃣ GSW @ BKN - Moneyline BKN     [+120]    │ │
│ │                                              │ │
│ │ Parlay Stake: $ [25]                        │ │
│ │ Potential payout: $66.00                    │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Total Stake: $75.00                             │
│ Potential Payout: $111.45                       │
│ Profit: $36.45                                  │
│                                                  │
│ [       Place Bets        ]                     │
└─────────────────────────────────────────────────┘
```

## Mobile Layout

```
┌────────────────────────────┐
│    Bet Slip          [X]   │
├────────────────────────────┤
│ [Straight][Parlay][Custom] │ ← 3 Tabs
├────────────────────────────┤
│                            │
│ ┌────────────────────────┐ │
│ │ LAL -2.5        [-110] │ │
│ │ BOS @ LAL              │ │
│ │                        │ │
│ │ □ Straight  □ Parlay   │ │
│ │                        │ │
│ │ Stake  To Win   Total  │ │
│ │ [50]   $45.45   $95.45 │ │
│ │                   [🗑]  │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │ BKN ML          [+120] │ │
│ │ GSW @ BKN              │ │
│ │                        │ │
│ │ □ Straight  □ Parlay   │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │⚡Parlay (2 legs) [+264]│ │
│ │                        │ │
│ │ 1️⃣ LAL -2.5    [-110]  │ │
│ │    BOS @ LAL           │ │
│ │                        │ │
│ │ 2️⃣ BKN ML      [+120]  │ │
│ │    GSW @ BKN           │ │
│ │                        │ │
│ │ Stake  To Win   Total  │ │
│ │ [25]   $41.00   $66.00 │ │
│ └────────────────────────┘ │
├────────────────────────────┤
│ Total: $75.00              │
│ Payout: $111.45            │
│                            │
│ [Clear]  [  Place Bet  ]   │
└────────────────────────────┘
```

## User Flow

### Scenario: User wants 1 straight bet + 1 parlay

1. User adds 3 bets to betslip
2. Clicks "Custom" tab
3. Checks "Straight" for Bet #1
   - Enters stake of $50
4. Checks "Add to Parlay" for Bet #2 and #3
   - Parlay section appears
   - Enters parlay stake of $25
5. Reviews totals:
   - Total Stake: $75
   - Total Payout: $111.45
6. Clicks "Place Bets"
7. System makes 2 API calls:
   - Call 1: Place straight bet ($50)
   - Call 2: Place parlay bet ($25)
8. User sees success message

## Key UI Principles Applied

### Unambiguous Interface
- ✅ Checkboxes clearly labeled "Straight" and "Add to Parlay"
- ✅ Visual distinction: Parlay section has accent border and background
- ✅ Each bet shows what type it is

### Independent Calculations
- ✅ Each straight bet shows its own "To win" calculation
- ✅ Parlay shows combined calculation
- ✅ Total shows sum of all bets

### Responsive Design
- ✅ Desktop: Side-by-side layout for stake inputs
- ✅ Mobile: Stacked layout with clear labels
- ✅ Touch-friendly controls (larger checkboxes and buttons)

### State Integrity
- ✅ Switching tabs preserves custom mode state
- ✅ Cannot be both straight and parlay (mutual exclusivity)
- ✅ Removing bet also removes from custom arrays
