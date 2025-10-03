# Mobile UI Components

This directory contains mobile-specific UI components for the NSsports application, ported from the vite_frontend application and adapted for Next.js.

## Components

### FloatingBetSlipButton
A draggable floating button that opens the mobile bet slip panel.

**Features:**
- Drag-and-drop functionality with position persistence using localStorage
- Shows bet count badge
- Animates on open/close
- Auto-positions to safe area (accounts for bottom nav)
- Only visible on mobile devices

**Usage:**
```tsx
<FloatingBetSlipButton />
```

### MobileBetSlipPanel
A full-featured slide-up panel for managing bets on mobile devices.

**Features:**
- Slide-up animation with spring physics
- Single bet and parlay support
- Stake management with real-time payout calculations
- Clear all bets functionality
- Responsive design with proper spacing
- Empty state messaging

**Usage:**
```tsx
<MobileBetSlipPanel />
```

### BottomNav
Mobile navigation bar with primary navigation options.

**Features:**
- Fixed position at bottom of screen
- Active state indicators
- Smooth animations using framer-motion
- Touch-friendly button sizes
- Badge indicators for bets count

**Navigation Options:**
- Sports: Toggle sports/league selector
- Live: Navigate to live games
- Home: Navigate to home page (center icon)
- Bets: Navigate to my bets page
- Account: Navigate to account page

**Usage:**
```tsx
<BottomNav />
```

## Integration

All mobile components are automatically included in the `ThreePanelLayout` component when on mobile devices:

```tsx
{isMobile && (
  <>
    <FloatingBetSlipButton />
    <MobileBetSlipPanel />
    <BottomNav />
  </>
)}
```

## Hooks Used

### useKV
Custom hook for localStorage management that's compatible with Next.js SSR.

```tsx
const [value, setValue] = useKV<Type>("storage-key", defaultValue);
```

### useIsMobile
Detects if the current viewport is mobile-sized (max-width: 768px).

```tsx
const isMobile = useIsMobile();
```

## Context Integration

The mobile components integrate with the following contexts:
- `NavigationContext`: For managing mobile panel state and bet slip open state
- `BetSlipContext`: For managing bet slip state and operations

## Styling

All components use Tailwind CSS for styling with the following key features:
- Responsive design with mobile-first approach
- Dark mode support via CSS variables
- Smooth animations using framer-motion
- Consistent spacing and sizing

## Key Differences from Vite Frontend

1. **Next.js Compatibility**: All components use `"use client"` directive
2. **Navigation**: Uses Next.js `useRouter` and `usePathname` instead of react-router
3. **SSR Safe**: All client-side only features are properly guarded
4. **Context Structure**: Adapted to work with existing nssports context structure

## Mobile-Specific Features

- Bottom navigation bar (80px height) with safe area padding
- Floating bet slip button with drag-and-drop
- Slide-up bet slip panel (85vh max height)
- Touch-friendly button sizes (min 44px)
- Proper z-index layering for overlays
- Smooth animations optimized for mobile devices
