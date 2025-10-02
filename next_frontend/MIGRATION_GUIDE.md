# Migration Guide: Vite to Next.js

This document outlines the complete migration strategy and current progress.

## ✅ Phase 1: Foundation (COMPLETE)

### Architecture
- [x] Next.js 15.5.4 with App Router
- [x] TypeScript with strict type checking
- [x] Tailwind CSS v4 (CSS-based configuration)
- [x] ESLint configured
- [x] Production build passing

### Styling System
- [x] Global styles migrated (globals.css)
- [x] OKLCH color system replicated
- [x] Dark theme with blue accents
- [x] CSS custom properties for theming
- [x] Responsive breakpoints configured

### Font Optimization
- [x] Inter font via next/font/google
- [x] Automatic font optimization
- [x] Proper font-family fallbacks

### Static Assets
- [x] All logos copied to public/
- [x] NBA team logos (30 teams)
- [x] NFL team logos (32 teams)
- [x] PWA icons and manifest

### Type Definitions
- [x] bet.ts
- [x] game.ts
- [x] user.ts
- [x] index.ts (barrel export)

## 🚧 Phase 2: Component Migration (IN PROGRESS)

### Core UI Components (shadcn/ui style)

#### Completed ✅
- [x] button.tsx
- [x] card.tsx (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)

#### Remaining (Priority Order)
1. **Essential Form Components**
   - [ ] input.tsx
   - [ ] label.tsx
   - [ ] select.tsx
   - [ ] checkbox.tsx
   - [ ] radio-group.tsx
   - [ ] switch.tsx
   - [ ] textarea.tsx

2. **Layout Components**
   - [ ] separator.tsx
   - [ ] scroll-area.tsx
   - [ ] tabs.tsx
   - [ ] accordion.tsx
   - [ ] collapsible.tsx

3. **Overlay Components**
   - [ ] dialog.tsx
   - [ ] sheet.tsx (drawer)
   - [ ] popover.tsx
   - [ ] tooltip.tsx
   - [ ] hover-card.tsx
   - [ ] alert-dialog.tsx

4. **Navigation Components**
   - [ ] dropdown-menu.tsx
   - [ ] context-menu.tsx
   - [ ] menubar.tsx
   - [ ] navigation-menu.tsx
   - [ ] breadcrumb.tsx

5. **Data Display**
   - [ ] table.tsx
   - [ ] badge.tsx
   - [ ] avatar.tsx
   - [ ] progress.tsx
   - [ ] skeleton.tsx

6. **Advanced Components**
   - [ ] calendar.tsx
   - [ ] date-picker.tsx
   - [ ] carousel.tsx
   - [ ] chart.tsx
   - [ ] command.tsx (cmd+k)

### Custom Application Components

#### Completed ✅
- [x] Homepage with responsive stats and game listings

#### Remaining
1. **Game Components**
   - [ ] GameCard.tsx
   - [ ] ProfessionalGameRow.tsx
   - [ ] CompactMobileGameRow.tsx
   - [ ] OddsButton.tsx
   - [ ] TeamLogo.tsx
   - [ ] PlayerPropsSection.tsx

2. **Betting Components**
   - [ ] BetSlipModal.tsx
   - [ ] BetSlipItem.tsx
   - [ ] FloatingBetSlipButton.tsx
   - [ ] MobileBetSlipPanel.tsx

3. **Layout Components**
   - [ ] Header.tsx
   - [ ] BottomNav.tsx
   - [ ] SideNavPanel.tsx
   - [ ] ActionHubPanel.tsx

4. **Utility Components**
   - [ ] VirtualScrolling.tsx / SmoothScrollContainer
   - [ ] LiveGamesFilter.tsx
   - [ ] SkeletonLoader.tsx
   - [ ] ProgressiveLoader.tsx

## 🔄 Phase 3: State Management

### Context Providers (Client Components)
- [ ] BetSlipProvider / BetSlipContext
- [ ] UserProvider / UserContext
- [ ] NavigationProvider / NavigationContext
- [ ] BetsProvider / BetsContext
- [ ] BetHistoryProvider / BetHistoryContext

### Custom Hooks
- [ ] useApi.ts
- [ ] useIsMobile.ts
- [ ] useInfiniteScroll.ts
- [ ] useKV.ts
- [ ] usePlayerProps.ts
- [ ] useBetSlip.ts
- [ ] useNavigation.ts

### Services
- [ ] mockApi.ts (for game data)
- [ ] API service functions

## 📄 Phase 4: Page Routes

### Completed ✅
- [x] / (Homepage)
- [x] /games (placeholder)
- [x] /live (placeholder)
- [x] /my-bets (placeholder)
- [x] /account (placeholder)

### To Implement
- [ ] /games - Full game listing with filters
- [ ] /games/[gameId] - Individual game detail page
- [ ] /live - Live games with real-time updates
- [ ] /my-bets - User betting history
- [ ] /account - User account management

## 🎨 Phase 5: Animations & Interactions

### Dependencies to Add
- [ ] framer-motion (animations)
- [ ] @tanstack/react-query (data fetching)
- [ ] sonner (toast notifications)
- [ ] embla-carousel-react (carousels)

### Animation Patterns
- [ ] Page transitions
- [ ] Modal/dialog animations
- [ ] Hover effects
- [ ] Loading states
- [ ] Skeleton screens

## 🧪 Phase 6: Testing & Validation

### Build Quality
- [x] ESLint passing (0 errors)
- [x] TypeScript compilation successful
- [x] Production build successful
- [ ] No runtime errors
- [ ] No console warnings

### Responsive Testing
- [x] Mobile (375px) - Validated
- [x] Tablet (768px) - Validated
- [x] Desktop (1440px) - Validated
- [ ] Ultra-wide (2560px)
- [ ] Small mobile (320px)

### Performance
- [ ] Lighthouse score >95
- [ ] Zero CLS (Cumulative Layout Shift)
- [ ] Fast page transitions
- [ ] Optimized images with next/image

### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] ARIA labels
- [ ] Focus indicators
- [ ] Color contrast compliance

## 📋 Migration Checklist by File

### From vite_frontend/src/components/

```
UI Components (shadcn/ui):
├── ✅ button.tsx (migrated - simplified)
├── ✅ card.tsx (migrated - simplified)
├── ⏳ accordion.tsx
├── ⏳ alert-dialog.tsx
├── ⏳ alert.tsx
├── ⏳ aspect-ratio.tsx
├── ⏳ avatar.tsx
├── ⏳ badge.tsx
├── ⏳ breadcrumb.tsx
├── ⏳ calendar.tsx
├── ⏳ carousel.tsx
├── ⏳ chart.tsx
├── ⏳ checkbox.tsx
├── ⏳ collapsible.tsx
├── ⏳ command.tsx
├── ⏳ context-menu.tsx
├── ⏳ dialog.tsx
├── ⏳ drawer.tsx
├── ⏳ dropdown-menu.tsx
├── ⏳ form.tsx
├── ⏳ hover-card.tsx
├── ⏳ input-otp.tsx
├── ⏳ input.tsx
├── ⏳ label.tsx
├── ⏳ menubar.tsx
├── ⏳ navigation-menu.tsx
├── ⏳ pagination.tsx
├── ⏳ popover.tsx
├── ⏳ progress.tsx
├── ⏳ radio-group.tsx
├── ⏳ resizable.tsx
├── ⏳ scroll-area.tsx
├── ⏳ select.tsx
├── ⏳ separator.tsx
├── ⏳ sheet.tsx
├── ⏳ skeleton.tsx
├── ⏳ slider.tsx
├── ⏳ sonner.tsx
├── ⏳ switch.tsx
├── ⏳ table.tsx
├── ⏳ tabs.tsx
├── ⏳ textarea.tsx
├── ⏳ toast.tsx
├── ⏳ toggle-group.tsx
├── ⏳ toggle.tsx
└── ⏳ tooltip.tsx

Custom Components:
├── ⏳ BetSlipItem.tsx
├── ⏳ BetSlipModal.tsx
├── ⏳ BottomNav.tsx
├── ⏳ CompactMobileGameRow.tsx
├── ⏳ FloatingBetSlipButton.tsx
├── ⏳ GameCard.tsx
├── ⏳ Header.tsx
├── ⏳ LiveGamesFilter.tsx
├── ⏳ MobileBetSlipPanel.tsx
├── ⏳ OddsButton.tsx
├── ⏳ PlayerPropsSection.tsx
├── ⏳ ProfessionalGameRow.tsx
├── ⏳ ProgressiveLoader.tsx
├── ⏳ SidebarToggle.tsx
├── ⏳ SkeletonLoader.tsx
├── ⏳ TeamLogo.tsx
└── ⏳ VirtualScrolling.tsx
```

## 🎯 Quick Start Guide for Continued Migration

### 1. Install Additional Dependencies
```bash
cd next_frontend
npm install framer-motion @tanstack/react-query sonner
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select @radix-ui/react-tabs
# ... add more as needed
```

### 2. Copy a Component
```bash
# Example: Migrating the Input component
cp ../vite_frontend/src/components/ui/input.tsx ./src/components/ui/
```

### 3. Adapt for Next.js
- Remove any Vite-specific imports
- Ensure all interactive components have `"use client"` directive
- Use `next/link` instead of `react-router-dom`
- Use `next/image` for images

### 4. Test the Component
```bash
npm run build  # Verify no TypeScript errors
npm run lint   # Verify no ESLint errors
npm run dev    # Test in browser
```

## 📊 Current Progress

**Overall Completion: ~15%**

- Foundation: 100% ✅
- Components: ~5% (2 of ~60)
- State Management: 0%
- Pages: 20% (placeholders exist)
- Animations: 0%
- Testing: 50% (basic validation complete)

## 🚀 Recommended Next Steps

1. **Immediate (1-2 hours)**
   - Migrate essential form components (Input, Label, Select)
   - Add BetSlipContext for state management
   - Implement GameCard component

2. **Short-term (3-5 hours)**
   - Complete remaining UI components
   - Implement all context providers
   - Build out game listing page

3. **Medium-term (1-2 days)**
   - Add framer-motion animations
   - Implement all page routes
   - Add React Query for data fetching

4. **Long-term (3-5 days)**
   - Complete feature parity
   - Performance optimization
   - Comprehensive testing
   - Documentation

## 💡 Tips for Migration

1. **Server Components by Default**: Only add `"use client"` when necessary
2. **Image Optimization**: Replace `<img>` with `<Image>` from next/image
3. **Font Optimization**: Already done with Inter font via next/font
4. **Code Splitting**: Next.js does this automatically
5. **API Routes**: Use Next.js Route Handlers in app/api/
6. **Environment Variables**: Use NEXT_PUBLIC_ prefix for client-side vars

## 📚 Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Framer Motion Docs](https://www.framer.com/motion/)
