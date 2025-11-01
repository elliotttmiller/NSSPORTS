# Metric Card Component System

## Overview
Standardized, sleek, horizontal metric card components used throughout the admin dashboard for consistent UI/UX.

## Design Specifications

### Visual Style
- **Container**: `p-2.5` padding, sleek borders (`border-border/50`)
- **Layout**: Horizontal flex layout with icon, value, label
- **Icon**: 36x36px (`w-9 h-9`) with rounded background
- **Typography**: 
  - Value: `text-lg font-bold` 
  - Label: `text-xs text-muted-foreground/70`
- **Interactions**: Hover shadow, touch-optimized with active scale

### Color System
```tsx
// Primary Accent (Green)
iconColor="text-accent"
bgColor="bg-accent/10"

// Success/Positive (Emerald)
iconColor="text-emerald-600"
bgColor="bg-emerald-500/10"

// Error/Destructive (Red)
iconColor="text-red-600"
bgColor="bg-red-500/10"

// Warning (Amber)
iconColor="text-amber-600"
bgColor="bg-amber-500/10"

// Neutral
iconColor="text-foreground"
bgColor="bg-foreground/5"
```

### Trend Indicators
- `trend="up"` - Emerald, TrendingUp icon
- `trend="down"` - Red, TrendingDown icon
- `trend="live"` - Accent, Activity icon with pulse animation

## Components

### MetricCard
Single metric display with icon, value, label, and optional trend indicator.

```tsx
<MetricCard
  icon={Users}
  label="Total Active Players"
  value="2,450"
  iconColor="text-accent"
  bgColor="bg-accent/10"
  trend="up"
/>
```

### MetricCardSection
Section wrapper with title header and responsive grid.

```tsx
<MetricCardSection title="Platform Activity">
  <MetricCard ... />
  <MetricCard ... />
  <MetricCard ... />
  <MetricCard ... />
</MetricCardSection>
```

### SystemHealthItem
Compact horizontal metric for system health indicators.

```tsx
<SystemHealthItem
  label="Platform Uptime"
  value="99.98%"
  status="good"
/>
```

## Implementation Status

### ✅ Implemented Pages
- **Dashboard** (`/admin/dashboard`) - All metric sections
- **Balances** (`/admin/balances`) - Financial summary cards
- **Agents** (`/admin/agents`) - Agent overview metrics
- **Reports** (`/admin/reports`) - All report type sections:
  - Financial Overview
  - Agent Performance Analytics
  - Player Activity
  - System Health
- **Security** (`/admin/security`) - Security overview metrics

### 🔄 Partial Implementation
- **Reconciliation** (`/admin/reconciliation`) - Uses custom inline styles

### Grid Configurations
- **4-column**: Default for dashboard sections (Platform Activity, Agent Performance, Financial Summary)
- **3-column**: Used for report summaries (players, system, financial reports)
- **2-column**: Used for system health grids

## Usage Guidelines

### When to Use MetricCard
- Displaying key performance indicators (KPIs)
- Dashboard overview sections
- Summary statistics
- Real-time metrics

### Color Selection
1. **Primary green** (`accent`) - Main platform metrics, user counts
2. **Emerald** - Positive metrics, success states, growth
3. **Red** - Negative metrics, alerts, decreases
4. **Amber** - Warnings, moderate states
5. **Neutral** - General information, totals

### Trend Indicators
- Use `trend="up"` for positive growth/increases
- Use `trend="down"` for decreases/negative changes
- Use `trend="live"` for real-time/active metrics
- Omit trend for static informational metrics

## Responsive Behavior
- **Mobile** (`< 640px`): 1 column grid, full width cards
- **Tablet** (`640px - 1024px`): 2 column grid
- **Desktop** (`> 1024px`): 4 column grid

## Accessibility
- All icons have semantic meaning
- Values are prominently displayed
- Labels provide context
- Touch targets optimized for mobile (active scale feedback)
- Color is not the only indicator (icons + text)

## Performance
- Lightweight component (~3KB)
- No heavy dependencies
- Minimal re-renders
- Touch-optimized animations
