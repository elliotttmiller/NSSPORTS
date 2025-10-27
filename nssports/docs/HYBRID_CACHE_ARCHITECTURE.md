# Hybrid SDK + Prisma Caching Architecture

## Overview

This document explains the hybrid caching architecture implemented for the SportsGameOdds API integration.

## Architecture Principles

### 1. SDK as Source of Truth
- **SportsGameOdds SDK is the ONLY source of real-time odds data**
- No fallback to stale data
- No mock or hardcoded data anywhere in the codebase
- If SDK fails, the request fails (no silent fallbacks)

### 2. Prisma as Performance Cache
- **Prisma stores data for performance optimization ONLY**
- Cache TTL: 30 seconds for all data types
- Cache is checked first before SDK calls
- Cache updates are async and non-blocking
- Cache failures don't break SDK responses

### 3. User Data Storage
- Prisma stores user-specific data:
  - Bet history
  - User preferences
  - Account information
  - Favorite teams/players

## Data Flow

```
Request
  ↓
Check Prisma Cache (TTL: 30s)
  ↓
Fresh? → Return cached data (fast)
  ↓
Stale/Miss? → Fetch from SDK (real-time)
  ↓
Update cache (async)
  ↓
Return SDK data
```

## Implementation Details

### Cache Functions

**`getEventsWithCache(options)`**
- Fetches events/games with intelligent caching
- Checks cache first (within 30s TTL)
- Falls through to SDK if cache miss or stale
- Updates cache asynchronously after SDK fetch

**`getPlayerPropsWithCache(eventID)`**
- Fetches player props with intelligent caching
- Same cache-first strategy
- 30-second TTL

**`getGamePropsWithCache(eventID)`**
- Fetches game props with intelligent caching
- Same cache-first strategy
- 30-second TTL

### Cache Storage

**Games Table**
- Stores event metadata (teams, scores, status)
- Updated on every SDK fetch
- TTL enforced via `updatedAt` field

**Odds Table**
- Stores betting odds for events
- Linked to games via foreign key
- Refreshed on each cache update

**PlayerProp Table**
- Stores player proposition bets
- Linked to both games and players
- TTL: 30 seconds

**GameProp Table**
- Stores game proposition bets
- Linked to games
- TTL: 30 seconds

## Key Benefits

### Performance
- **Reduced API Calls**: Cache hits return data in <10ms vs 200-500ms SDK calls
- **Lower Costs**: Fewer API calls = lower SportsGameOdds API usage
- **Scalability**: Can handle higher traffic without hitting rate limits

### Reliability
- **NO Fallback Logic**: Ensures always-fresh data
- **Async Cache Updates**: Cache failures don't break responses
- **Non-Blocking**: Cache operations don't slow down requests

### Data Accuracy
- **Real-Time Data**: SDK always provides latest odds
- **No Stale Data**: Cache TTL ensures data never older than 30s
- **No Mock Data**: All data comes from SDK (cache or live)

## Cache TTL Configuration

```typescript
const CACHE_TTL = {
  events: 30,      // 30 seconds for events/games
  odds: 30,        // 30 seconds for odds
  playerProps: 30, // 30 seconds for player props
  gameProps: 30,   // 30 seconds for game props
};
```

## API Routes Using Hybrid Cache

### Primary Routes
- `/api/matches` - Uses `getEventsWithCache()`
- `/api/games` - Uses `getEventsWithCache()` for multiple leagues
- `/api/games/live` - Uses `getEventsWithCache()` with `live: true`
- `/api/games/upcoming` - Uses `getEventsWithCache()` with future dates
- `/api/games/league/[leagueId]` - Uses `getEventsWithCache()` with specific league

### Props Routes
- `/api/matches/[eventId]/player-props` - Uses `getPlayerPropsWithCache()`
- `/api/matches/[eventId]/game-props` - Uses `getGamePropsWithCache()`

## Error Handling

### Cache Check Failures
- Logged as warnings
- Continues to SDK fetch
- Does not throw errors

### SDK Fetch Failures
- Throws error to caller
- NO fallback to stale cache
- Returns proper HTTP error to client

### Cache Update Failures
- Logged as errors
- Does not throw (non-blocking)
- Next request will fetch from SDK again

## Monitoring

### Log Messages

**Cache Hits:**
```
Returning N events from cache (within TTL)
```

**SDK Fetches:**
```
Fetching events from SDK
Fetched N events from SDK
```

**Cache Updates:**
```
Failed to update events cache
```

## Migration from Direct SDK

### Before (Direct SDK)
```typescript
const { data: events } = await getEvents(options);
```

### After (Hybrid Cache)
```typescript
const { data: events, source } = await getEventsWithCache(options);
// source = 'cache' | 'sdk'
```

## Performance Metrics

### Expected Cache Hit Rates
- **Events/Games**: 70-80% (high traffic on popular games)
- **Player Props**: 60-70% (popular players get frequent views)
- **Game Props**: 60-70% (similar to player props)

### Response Times
- **Cache Hit**: 5-15ms
- **SDK Fetch**: 200-500ms
- **Cache + SDK**: 210-520ms (first request)

## Production Considerations

### Database Performance
- Ensure indexes on `updatedAt`, `gameId`, `leagueId`
- Monitor Prisma connection pool
- Consider read replicas for high traffic

### Cache Invalidation
- TTL-based (automatic after 30s)
- Can force refresh via cache tags
- Manual purge available if needed

### Monitoring Alerts
- Alert on high cache miss rates (>40%)
- Alert on SDK failures
- Monitor API quota usage

## Future Enhancements

### Possible Improvements
1. **Redis Layer**: Add Redis for even faster cache
2. **Longer TTL**: Increase TTL for non-live games
3. **Predictive Caching**: Pre-fetch popular games
4. **Cache Warming**: Populate cache before peak times

### Not Implemented (By Design)
- ❌ Fallback to stale data (violates real-time requirement)
- ❌ Mock data (violates accuracy requirement)
- ❌ Default values (violates truthfulness requirement)

## Testing

### Verify Cache Behavior

```bash
# Test cache hit
curl http://localhost:3000/api/matches
# Check logs for "from cache"

# Wait 31 seconds, test again
sleep 31
curl http://localhost:3000/api/matches
# Check logs for "from SDK"
```

### Verify No Fallback

```bash
# Set invalid API key
SPORTSGAMEODDS_API_KEY=invalid

# Request should fail (not return stale data)
curl http://localhost:3000/api/matches
# Should return 503 error
```

## Summary

This hybrid architecture provides:
✅ **Real-time accuracy** - SDK is always source of truth
✅ **High performance** - Prisma caching reduces latency
✅ **Cost efficiency** - Fewer API calls
✅ **No fallback logic** - No stale or mock data
✅ **Production-ready** - Scalable and reliable

The key principle: **Cache for speed, SDK for truth, never compromise accuracy.**
