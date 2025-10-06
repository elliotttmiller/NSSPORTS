# Live Data Store Architecture

## Overview

This document describes the centralized live data store architecture implemented according to **The Ubiquitous Data Doctrine**.

## The Ubiquitous Data Doctrine

### Protocol I: Single Source of Truth
- **Implementation**: `useLiveDataStore` (Zustand) is the single authoritative source for live sports data
- **Rule**: Components MUST NOT make direct API calls for match/odds data
- **Enforcement**: All components read from the centralized store using selectors

### Protocol II: Efficient State Hydration
- **Implementation**: Data is fetched once at a high level (e.g., homepage, /live page)
- **Rule**: No "request waterfalls" - multiple components on the same page do not trigger redundant API fetches
- **Enforcement**: Store tracks loading state and prevents duplicate fetches

### Protocol III: Granular State Consumption
- **Implementation**: Components use selectors to subscribe only to the data they need
- **Rule**: Components must be surgically precise in their data consumption
- **Enforcement**: Use provided selector functions like `selectMatchById`, `selectLiveMatches`

### Protocol IV: Universal UI State Handling
- **Implementation**: Every component displays loading, error, and empty states
- **Rule**: No unhandled states in the UI
- **Enforcement**: Components use `selectIsLoading`, `selectError` from the store

## Store Structure

```typescript
interface LiveDataState {
  // Data
  matches: Game[];
  
  // Status tracking
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  lastFetch: number | null;
  
  // Actions
  fetchMatches: (sportKey?: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}
```

## Usage Examples

### Fetching Data (High-Level Component)

```typescript
import { useLiveDataStore } from '@/store';

function MyPage() {
  const fetchMatches = useLiveDataStore((state) => state.fetchMatches);
  
  useEffect(() => {
    // Fetch once on mount - Protocol II
    fetchMatches('basketball_nba');
  }, [fetchMatches]);
  
  // ...
}
```

### Consuming Data (Any Component)

```typescript
import { useLiveDataStore, selectLiveMatches, selectIsLoading } from '@/store';

function GamesList() {
  // Protocol III: Granular state consumption
  const matches = useLiveDataStore(selectLiveMatches);
  const isLoading = useLiveDataStore(selectIsLoading);
  const error = useLiveDataStore(selectError);
  
  // Protocol IV: Universal UI state handling
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (matches.length === 0) return <EmptyState />;
  
  return <div>{/* render matches */}</div>;
}
```

### Getting a Specific Match

```typescript
import { useLiveMatch } from '@/hooks/useLiveMatch';

function BetSlipItem({ matchId }: { matchId: string }) {
  // Protocol III: Subscribe only to specific match
  const match = useLiveMatch(matchId);
  
  if (!match) return null;
  
  return <div>{/* render match details */}</div>;
}
```

## Available Selectors

### Core Selectors
- `selectAllMatches(state)` - Get all matches
- `selectMatchById(id)` - Get a specific match by ID
- `selectIsLoading(state)` - Check if data is loading
- `selectError(state)` - Get current error state
- `selectIsSuccess(state)` - Check if fetch was successful
- `selectIsInitialized(state)` - Check if store has been initialized

### Filtered Selectors
- `selectLiveMatches(state)` - Get only live matches
- `selectUpcomingMatches(state)` - Get only upcoming matches
- `selectMatchesByStatus(status)` - Get matches by status

## Custom Hooks

### useLiveMatch(matchId)
Get a specific match by ID with automatic re-rendering on updates.

```typescript
const match = useLiveMatch('game-123');
```

### useLiveMatches()
Get all matches from the store.

```typescript
const allMatches = useLiveMatches();
```

### useIsMatchesLoading()
Check if the store is currently loading.

```typescript
const isLoading = useIsMatchesLoading();
```

### useMatchesError()
Get any error from the store.

```typescript
const error = useMatchesError();
```

## Migration Guide

### Old Pattern (Deprecated)
```typescript
// ❌ DON'T: Direct API call in component
import { getLiveGames } from '@/services/api';

function MyComponent() {
  const [games, setGames] = useState([]);
  
  useEffect(() => {
    getLiveGames().then(setGames);
  }, []);
  
  // ...
}
```

### New Pattern (Recommended)
```typescript
// ✅ DO: Use centralized store
import { useLiveDataStore, selectLiveMatches } from '@/store';

function MyComponent() {
  const matches = useLiveDataStore(selectLiveMatches);
  const isLoading = useLiveDataStore(selectIsLoading);
  
  // No need for local state or effects for data fetching
  // Data is fetched at a higher level
  
  // ...
}
```

## Data Flow

```
┌─────────────────────────────────────────────────┐
│  Top-Level Component (Homepage, /live page)     │
│  - Calls fetchMatches() on mount                │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         Live Data Store (Zustand)               │
│  - Fetches from /api/matches endpoint           │
│  - Caches data                                  │
│  - Manages loading/error states                │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         Child Components                        │
│  - Subscribe via selectors                      │
│  - Re-render only when their data changes       │
│  - GameRow, BetSlip, Modals, etc.              │
└─────────────────────────────────────────────────┘
```

## Benefits

1. **Single Source of Truth**: All components read from the same store
2. **No Duplicate Fetches**: Data is fetched once and shared
3. **Efficient Re-rendering**: Components only re-render when their specific data changes
4. **Consistent State**: All components see the same data at the same time
5. **Better Error Handling**: Errors are handled centrally
6. **Improved Performance**: Reduced API calls and optimized re-renders

## Backend Integration

The store integrates with the existing BFF (Backend for Frontend) layer:

- **Endpoint**: `/api/matches?sport={sportKey}`
- **Caching**: Server-side caching (60 seconds)
- **Data Source**: The Odds API (via secure BFF proxy)
- **Sports Supported**: `basketball_nba`, `americanfootball_nfl`, `icehockey_nhl`

## Future Enhancements

- [ ] Add polling/auto-refresh for live games
- [ ] Implement WebSocket support for real-time updates
- [ ] Add support for multiple sports simultaneously
- [ ] Implement optimistic updates for better UX
- [ ] Add offline support with service workers
- [ ] Implement data persistence with IndexedDB

---

**Status**: ✅ Production Ready  
**Last Updated**: January 2025  
**Version**: 1.0.0
