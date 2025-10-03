# Mobile UI Visual Guide

## Mobile Layout Structure

```
┌─────────────────────────────────────────┐
│           Header (Desktop)              │  ← Hidden on mobile
├─────────────────────────────────────────┤
│                                         │
│                                         │
│        Main Content Area                │
│     (Games, Bets, Account, etc.)        │
│                                         │
│     ┌─────────────────────────┐        │
│     │  CompactMobileGameRow   │        │  ← Mobile game cards
│     │  ┌────┬────┬────┬────┐  │        │
│     │  │Team│Sprd│Tot │ML  │  │        │
│     │  ├────┼────┼────┼────┤  │        │
│     │  │Away│ +3 │O220│+150│  │        │
│     │  │Home│ -3 │U220│-170│  │        │
│     │  └────┴────┴────┴────┘  │        │
│     └─────────────────────────┘        │
│                                         │
│     Bottom Padding (80px)               │  ← Space for BottomNav
│                                         │
├─────────────────────────────────────────┤
│     [Sports] [Live] [🏠] [Bets] [Acct]  │  ← BottomNav (z-40)
└─────────────────────────────────────────┘
                              ┌────┐
                              │ 📋 │         ← FloatingBetSlipButton (z-50)
                              │  3 │            (Draggable)
                              └────┘
```

## Mobile Bet Slip Panel (Opened)

```
When user taps floating button:

┌─────────────────────────────────────────┐
│        Background (dimmed)              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ╔═══════════════════════════════╗ │ │
│  │ ║ Bet Slip              [X]     ║ │ │  ← MobileBetSlipPanel (z-99)
│  │ ╠═══════════════════════════════╣ │ │
│  │ ║ [Straight]     [Parlay]       ║ │ │  ← Bet type toggle
│  │ ╠═══════════════════════════════╣ │ │
│  │ ║                               ║ │ │
│  │ ║ 📋 Lakers -3 @ Warriors       ║ │ │  ← Bet item
│  │ ║    Odds: -110                 ║ │ │
│  │ ║    ┌──────┬────────┬────────┐ ║ │ │
│  │ ║    │Stake │To Win  │Total   │ ║ │ │
│  │ ║    │ $10  │ $9.09  │$19.09  │ ║ │ │
│  │ ║    └──────┴────────┴────────┘ ║ │ │
│  │ ║                               ║ │ │
│  │ ║ 📋 Over 220.5 Total           ║ │ │
│  │ ║    Odds: -110                 ║ │ │
│  │ ║    ┌──────┬────────┬────────┐ ║ │ │
│  │ ║    │Stake │To Win  │Total   │ ║ │ │
│  │ ║    │ $20  │ $18.18 │$38.18  │ ║ │ │
│  │ ║    └──────┴────────┴────────┘ ║ │ │
│  │ ║                               ║ │ │
│  │ ╠═══════════════════════════════╣ │ │
│  │ ║ Total Stake: $30.00           ║ │ │  ← Footer
│  │ ║ Payout: $57.27                ║ │ │
│  │ ║                               ║ │ │
│  │ ║  [Clear]     [Place Bet]      ║ │ │
│  │ ╚═══════════════════════════════╝ │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Component Breakdown

### 1. FloatingBetSlipButton

```
┌────────┐
│   📋   │  ← Receipt icon (filled when open)
│   [3]  │  ← Bet count badge (top-right)
└────────┘

States:
- Default: Gray background, outline border
- Hover: Scales to 105%
- Dragging: Cursor changes to grabbing
- Active: Accent color background
```

### 2. BottomNav

```
┌──────────────────────────────────────────────┐
│                                              │
│  Sports   Live    🏠    Bets    Account     │
│                    ↑                         │
│              (Center Icon)                   │
│                                              │
└──────────────────────────────────────────────┘

Button States:
- Inactive: text-muted-foreground
- Active: bg-accent text-accent-foreground
- Hover: scale 1.02
- Tap: scale 0.98

Home Button:
- Larger size (48x48px)
- Rounded full
- Center position
- Icon with fill when active
```

### 3. CompactMobileGameRow

```
┌─────────────────────────────────────────────┐
│ NFL                          8:00 PM         │  ← Header
├─────────────────────────────────────────────┤
│                                             │
│ Teams     │ Spread  │ Total   │ ML          │  ← 4-column grid
│           │         │         │             │
│ 🏈 49ers  │  +3.5   │ O 45.5  │  +150      │  ← Away team
│           │  -110   │  -110   │            │
│           │         │         │             │
│ 🏈 Chiefs │  -3.5   │ U 45.5  │  -170      │  ← Home team
│           │  -110   │  -110   │            │
│                                             │
└─────────────────────────────────────────────┘
         ↓ (Tap to expand)
┌─────────────────────────────────────────────┐
│ Status: Scheduled   League: NFL            │  ← Expanded details
│ Venue: Arrowhead    Start: Dec 25          │
│                                             │
│      Tap anywhere to collapse               │
└─────────────────────────────────────────────┘

Odds Button States:
- Default: outline variant
- Selected: accent bg with ring-2 ring-accent/20
- Hover: scale 1.03
- Tap: scale 0.97
```

### 4. MobileBetSlipPanel Layout

```
┌─────────────────────────────────────────────┐
│  Bet Slip [3]                         [X]   │  ← Header (48px)
├─────────────────────────────────────────────┤
│  [Straight]           [Parlay (2+ bets)]    │  ← Tabs (40px)
├─────────────────────────────────────────────┤
│                                             │
│  ╔═══════════════════════════════════════╗ │  ← Bet Card
│  ║ Lakers -3.5                    -110   ║ │
│  ║ Lakers @ Warriors                     ║ │
│  ║ ─────────────────────────────────────  ║ │
│  ║ Stake    To Win         Total         ║ │
│  ║ [$10]    $9.09          $19.09     [🗑]║ │
│  ╚═══════════════════════════════════════╝ │
│                                             │
│  ╔═══════════════════════════════════════╗ │
│  ║ Over 220.5                     -110   ║ │
│  ║ Warriors vs Lakers                    ║ │
│  ║ ─────────────────────────────────────  ║ │
│  ║ Stake    To Win         Total         ║ │
│  ║ [$20]    $18.18         $38.18     [🗑]║ │
│  ╚═══════════════════════════════════════╝ │
│                                             │
│  (Scrollable content area)                  │
│                                             │
├─────────────────────────────────────────────┤
│  Total Stake: $30.00  Payout: $57.27       │  ← Footer
│  [Clear]              [Place Bet]           │
└─────────────────────────────────────────────┘

Height: 85vh max
Animation: Slide up with spring physics
```

## Animation Details

### Panel Slide-Up Animation
```typescript
initial={{ y: "100%" }}     // Start off-screen (bottom)
animate={{ y: 0 }}           // Slide to position
exit={{ y: "100%" }}         // Slide off-screen
transition={{
  type: "spring",
  stiffness: 300,            // High stiffness for quick response
  damping: 30                // Damping for smooth settle
}}
```

### Button Interactions
```typescript
whileHover={{ scale: 1.03 }}   // Slight grow on hover
whileTap={{ scale: 0.97 }}     // Slight shrink on tap
```

### Staggered List Animation
```typescript
delay: index * 0.05            // 50ms delay between items
duration: 0.3                  // 300ms animation duration
```

## Color Scheme (Using Tailwind)

```
Background:
- Panel: bg-background/95 (95% opacity with backdrop blur)
- Card: bg-card
- Button: bg-accent (active), bg-secondary (hover)

Text:
- Primary: text-foreground
- Secondary: text-muted-foreground
- Accent: text-accent-foreground

Borders:
- Default: border-border
- Accent: border-accent/20

Shadows:
- Floating button: shadow-lg
- Bet slip panel: shadow-2xl
- Active buttons: shadow-lg
```

## Responsive Behavior

```
Screen Width     Mobile Components
< 768px          ✅ All mobile components active
768px - 1023px   ⚠️ Transitional (mobile components)
>= 1024px        ❌ Desktop layout (no mobile components)
```

## Touch Target Sizes

Following iOS/Android guidelines:
- Minimum touch target: 44x44px
- BottomNav buttons: 48px min-width
- Odds buttons: 28px height (h-7)
- Floating button: 44-72px (responsive)
- Panel close button: 32x32px (h-8 w-8)

## Z-Index Layering

```
Layer    Component                Purpose
─────────────────────────────────────────────
0        Main content             Base layer
10       Desktop sidebars         Desktop only
30       Sidebar toggles          Desktop only
40       BottomNav                Mobile nav bar
50       FloatingBetSlipButton    Above nav
99       MobileBetSlipPanel       Top overlay
```

## Performance Considerations

1. **Lazy Loading**: Components only render when `isMobile === true`
2. **Memoization**: `CompactMobileGameRow` uses `React.memo`
3. **Efficient Animations**: Using `transform` and `opacity` (GPU accelerated)
4. **LocalStorage**: Debounced saves for position persistence
5. **Event Delegation**: Efficient click handlers with stopPropagation

## Accessibility Features

- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ Semantic HTML elements
- ✅ Screen reader friendly text
- ✅ Touch target sizes meet guidelines

## Testing Checklist

### Visual Testing
- [ ] Components render at mobile breakpoint
- [ ] Animations are smooth (60fps)
- [ ] No layout shifts or jumps
- [ ] Proper spacing and alignment
- [ ] Colors match design system

### Functional Testing
- [ ] Floating button is draggable
- [ ] Position persists after reload
- [ ] Panel opens/closes smoothly
- [ ] Bets can be added/removed
- [ ] Stakes update payouts correctly
- [ ] Navigation works correctly
- [ ] Active states show properly

### Edge Cases
- [ ] Empty bet slip state
- [ ] 10+ bets in slip
- [ ] Very long team names
- [ ] Different screen sizes
- [ ] Landscape orientation
- [ ] Slow network conditions
