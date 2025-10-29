# SportsGameOdds API Request Optimization Guide

## Current Issues
1. ❌ Fetching ALL odds data even when only main lines needed
2. ❌ Requesting player props and game props in initial load (not viewed)
3. ❌ No lazy loading - fetching data user may never see
4. ❌ Aggressive cache but still over-fetching on first load

## Optimization Strategy

### 1. **Tiered Data Fetching** ⭐ PRIMARY OPTIMIZATION

#### Tier 1: Essential (Always Fetch)
```typescript
// Main game betting lines only
oddIDs: 'game-ml,game-ats,game-ou'
```
- Moneyline (game-ml)
- Against The Spread (game-ats) 
- Over/Under (game-ou)
- **~60-80% payload reduction**

#### Tier 2: On-Demand (Lazy Load)
```typescript
// Only fetch when props tab is opened
oddIDs: 'points-*-game-ou,rebounds-*-game-ou,assists-*-game-ou'
```
- Player props (when user expands game card → Player Props tab)
- Game props (when user expands game card → Game Props tab)
- **Fetch ONLY for visible game, not all games**

#### Tier 3: Real-Time Updates (WebSocket)
```typescript
// Stream only main lines for live games
stream.events({ feed: 'events:live', oddIDs: 'game-ml,game-ats,game-ou' })
```
- Live odds updates
- Only for games actually displayed on screen

### 2. **Smart Cache Strategy**

#### Current: Aggressive Cache (30s-5min)
```typescript
// hybrid-cache.ts
TTL_LIVE_GAME = 30 seconds
TTL_UPCOMING_GAME = 5 minutes
TTL_SETTLED_GAME = 1 hour
```

#### Optimized: Context-Aware TTL
```typescript
// Main lines: Frequent updates needed
MAIN_LINES_TTL = {
  live: 15s,      // Live games change fast
  upcoming: 5min, // Pre-game lines stable
  settled: 1hr    // Historical data
}

// Props: Less frequent updates
PROPS_TTL = {
  live: 30s,      // Props update slower
  upcoming: 10min,// Pre-game props very stable
  settled: 1hr    // Historical
}
```

### 3. **Request Batching & Deduplication**

#### Current Implementation ✅
```typescript
// rate-limiter.ts
- Deduplicates identical requests within 100ms
- Hourly request tracking
- Priority queue for critical requests
```

#### Enhancement Needed
```typescript
// Batch multiple game requests into single API call
// Instead of: /api/player-props?gameId=123, /api/player-props?gameId=456
// Do: /api/player-props?gameIds=123,456,789
```

### 4. **Component-Level Optimization**

#### Current: Eager Loading ❌
```typescript
// ProfessionalGameRow.tsx
const { data: playerProps } = usePlayerProps(game.id); // Always fetches
const { data: gameProps } = useGameProps(game.id);     // Always fetches
```

#### Optimized: Lazy Loading ✅
```typescript
// ProfessionalGameRow.tsx
const [activeTab, setActiveTab] = useState<'player' | 'game'>('player');

const { data: playerProps } = usePlayerProps(
  game.id,
  activeTab === 'player' && expanded // Only when tab active AND card expanded
);

const { data: gameProps } = useGameProps(
  game.id,
  activeTab === 'game' && expanded  // Only when tab active AND card expanded
);
```

### 5. **API Endpoint Optimization**

#### Current Endpoints
```
GET /api/matches?sport=basketball_nba
├── Fetches: ALL odds (main lines + all props)
└── Problem: Over-fetching unused data

GET /api/player-props?gameId=123
├── Fetches: ALL player props for game
└── Problem: User may never view

GET /api/game-props?gameId=123
├── Fetches: ALL game props
└── Problem: User may never view
```

#### Optimized Endpoints
```
GET /api/matches?sport=basketball_nba&lines=main
├── Fetches: ONLY main lines (ml, ats, ou)
└── 60-80% smaller payload

GET /api/matches?sport=basketball_nba&lines=all
├── Fetches: Everything (for admin/testing)
└── Opt-in only

GET /api/player-props?gameIds=123,456,789
├── Batch fetch multiple games
└── Only when props panel opened

GET /api/game-props?gameIds=123,456,789
├── Batch fetch multiple games  
└── Only when props panel opened
```

## Implementation Plan

### Phase 1: Immediate Wins (Today) ✅
- [x] Remove debug log spam
- [ ] Add `lines=main` query parameter to /api/matches
- [ ] Filter oddIDs in API call: `'game-ml,game-ats,game-ou'`
- [ ] Verify ~60-80% payload reduction

### Phase 2: On-Demand Props (This Week)
- [ ] Modify usePlayerProps to accept `enabled` parameter
- [ ] Modify useGameProps to accept `enabled` parameter
- [ ] Update game card components to lazy load props
- [ ] Add loading states for props tabs

### Phase 3: Batch Requests (Next Sprint)
- [ ] Implement batch endpoints for props
- [ ] Modify hooks to batch requests
- [ ] Add request coalescing (combine multiple requests)

### Phase 4: WebSocket Streaming (Future)
- [ ] Implement WebSocket for live game updates
- [ ] Stream only main lines for visible games
- [ ] Fallback to polling if WebSocket fails

## Expected Results

### Payload Reduction
```
Before: ~2.5MB per /api/matches call
After:  ~600KB per /api/matches call
Savings: 76% reduction
```

### API Request Reduction
```
Before: 
- 1 /api/matches (all data)
- 20 /api/player-props calls (eager)
- 20 /api/game-props calls (eager)
Total: 41 requests on page load

After:
- 1 /api/matches (main lines only)
- 0-3 /api/player-props (lazy, only if expanded)
- 0-3 /api/game-props (lazy, only if expanded)
Total: 1-7 requests on page load
Savings: 83-98% reduction
```

### Cost Savings (SportsGameOdds API)
```
Current: ~500 API calls/day × 30 days = 15,000 calls/month
Optimized: ~100 API calls/day × 30 days = 3,000 calls/month
Savings: 80% reduction = $$$
```

## Monitoring & Metrics

Track these metrics in production:
1. Average payload size per request
2. Total API calls per user session
3. Cache hit rate
4. Time to first render (main lines)
5. Time to props data (when expanded)
6. Failed requests rate
7. Hourly API usage

## References

- [SportsGameOdds SDK Docs](https://sportsgameodds.com/docs/sdk)
- [Odds Filtering Guide](https://sportsgameodds.com/docs/guides/response-speed)
- [Rate Limiting Best Practices](https://sportsgameodds.com/docs/guides/rate-limiting)
- [WebSocket Streaming](https://sportsgameodds.com/docs/guides/realtime-streaming-api)
