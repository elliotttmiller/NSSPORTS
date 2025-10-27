# ODDS-FOCUSED Implementation - SportsGameOdds SDK

## Overview

Our implementation is **strictly optimized for real-time betting odds and lines** - we do NOT track live scores, game stats, or play-by-play data.

## ✅ What We Fetch & Stream

### Main Betting Lines
- **Moneyline** (ml): Straight-up winner odds
- **Spread** (sp): Point spread odds
- **Total** (ou): Over/Under odds

### Player Props
- Player points odds
- Player rebounds odds
- Player assists odds
- Player 3-pointers made odds
- Any other player performance markets

### Game Props
- Team total points odds
- Quarter/half lines odds
- First to score odds
- Margin of victory odds

### Multi-Sportsbook Data
- Odds from multiple bookmakers (DraftKings, FanDuel, BetMGM, etc.)
- Consensus/best available odds
- Line movement tracking

## ❌ What We DON'T Track

- ❌ Live scores (current game state)
- ❌ Period/quarter information
- ❌ Game clock/time remaining
- ❌ Play-by-play activity
- ❌ Team/player statistics during games

## Official SDK Integration

### Client Configuration
```typescript
// src/lib/sportsgameodds-sdk.ts
const client = new SportsGameOdds({
  apiKeyHeader: process.env.SPORTSGAMEODDS_API_KEY,
  timeout: 20000,
  maxRetries: 3
});
```

### Odds-Focused Query Parameters

```typescript
await client.events.get({
  leagueID: 'NBA',           // Uppercase league IDs
  oddsAvailable: true,       // Only events with active betting markets
  oddID: 'ml,sp,ou',        // Filter specific bet types (payload reduction)
  bookmakerID: 'draftkings', // Filter specific sportsbooks
  includeOpposingOdds: true, // Get both sides of markets
  finalized: false,          // Exclude finished games
  live: true                 // Games with changing odds
});
```

### Real-Time Odds Streaming (AllStar Plan)

```typescript
// Stream live odds updates via WebSocket
const streamInfo = await client.stream.events({ 
  feed: 'events:live'  // All live games with changing odds
});

// Or stream upcoming games for a specific league
const streamInfo = await client.stream.events({ 
  feed: 'events:upcoming',
  leagueID: 'NBA'
});
```

## Supported Leagues (Primary Focus)

### Tier 1: Core Leagues
- **NBA** - National Basketball Association
- **NFL** - National Football League  
- **NHL** - National Hockey League

### Tier 2: Additional Support
- **MLB** - Major League Baseball
- **NCAAB** - College Basketball
- **NCAAF** - College Football

All league IDs use **UPPERCASE** format per official specification.

## Data Transformation Flow

```
SDK Event → Transform Odds → Internal Game Format
    ↓              ↓              ↓
eventID      event.odds     game.odds
leagueID     byBookmaker    { spread, moneyline, total }
teams        bookOdds       Multi-book aggregation
commence     markets        Prop odds extraction
```

## Key Files

### SDK Integration
- `src/lib/sportsgameodds-sdk.ts` - Official SDK client wrapper
- `src/lib/streaming-service.ts` - WebSocket odds streaming
- `src/lib/transformers/sportsgameodds-sdk.ts` - Odds data transformation

### API Routes
- `src/app/api/games/route.ts` - Games with odds endpoint
- `src/app/api/games/live/route.ts` - Live games with changing odds
- `src/app/api/games/upcoming/route.ts` - Upcoming games odds

### Utilities
- `src/lib/utils/odds-filtering.ts` - Odds presets and filtering
- `src/lib/utils/pagination-handler.ts` - Cursor-based pagination
- `src/lib/rate-limiter.ts` - Token bucket rate limiting

## Performance Optimizations

### Odds Filtering (50-90% Payload Reduction)
```typescript
// Instead of fetching ALL odds markets
await client.events.get({ leagueID: 'NBA' });

// Fetch only main lines (huge payload reduction)
await client.events.get({ 
  leagueID: 'NBA',
  oddID: 'ml,sp,ou'  // Only moneyline, spread, total
});
```

### Rate Limiting
- Dev: 10 requests/min, 200 requests/hour
- Prod: 30 requests/min, 1000 requests/hour
- Token bucket algorithm with request deduplication

### Caching
- 120-second TTL for odds data
- Prisma database caching
- In-memory cache for hot paths

## Official Documentation References

### Core Docs
- **SDK Reference**: https://github.com/SportsGameOdds/sports-odds-api-typescript
- **Odds Filtering**: https://sportsgameodds.com/docs/guides/odds-filtering
- **Streaming API**: https://sportsgameodds.com/docs/guides/realtime-streaming-api
- **Markets Reference**: https://sportsgameodds.com/docs/data-types/markets

### Data Types
- **Leagues**: https://sportsgameodds.com/docs/data-types/leagues
- **Bet Types**: https://sportsgameodds.com/docs/data-types/bet-types
- **Sides**: https://sportsgameodds.com/docs/data-types/sides
- **Bookmakers**: https://sportsgameodds.com/docs/data-types/bookmakers

## Testing

### Test Games API
```bash
# Fetch NBA games with odds
curl "http://localhost:3000/api/games?league=NBA&limit=10"

# Fetch live games with changing odds
curl "http://localhost:3000/api/games/live?league=NFL"

# Fetch upcoming games odds
curl "http://localhost:3000/api/games/upcoming?league=NHL"
```

### Test Streaming
```bash
# Connect to live odds stream (requires AllStar plan)
# See: src/lib/streaming-service.ts for implementation
```

## Environment Configuration

```bash
# .env
SPORTSGAMEODDS_API_KEY=your_api_key_here
SPORTSGAMEODDS_STREAMING_ENABLED=true

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE_DEV=10
RATE_LIMIT_HOURLY_LIMIT_DEV=200

# Cache
CACHE_TTL_EVENTS=120
CACHE_TTL_ODDS=120

# Streaming (AllStar Plan)
STREAMING_AUTO_RECONNECT=true
STREAMING_MAX_RECONNECT_ATTEMPTS=5
```

## Next Steps

### Immediate
1. ✅ TypeScript errors resolved
2. ✅ League ID synchronization fixed (uppercase NBA, NFL, NHL)
3. ✅ Odds-focused comments and documentation updated

### Short-Term
1. Integrate odds filtering utilities into SDK calls
2. Test streaming API with AllStar plan
3. Add player props odds extraction
4. Implement multi-sportsbook odds comparison

### Long-Term
1. Add game props odds support
2. Implement line movement tracking
3. Build odds comparison features
4. Add positive EV calculation

## Summary

Our implementation is **laser-focused on betting odds and lines**:
- We fetch odds data from SportsGameOdds SDK
- We stream real-time odds changes via WebSocket
- We transform odds into our internal format
- We DO NOT track live scores or game stats
- We optimize for odds payload size and performance

This keeps our system lean, fast, and purpose-built for betting applications.
