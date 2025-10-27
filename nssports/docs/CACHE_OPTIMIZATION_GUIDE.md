# Cache Optimization & API Workflow Guide

## Current Situation Analysis

### What's Working
✅ SportsGameOdds SDK is fetching 27 events successfully (11 NBA + 14 NFL + 2 NHL)  
✅ Events are transforming correctly with SDK v2 structure  
✅ Start time extraction from `event.status.startsAt` works  
✅ Team name extraction from `team.names.long` works  

### What's Broken
❌ **Foreign Key Constraint Violations** - Teams must be created before games reference them  
❌ **Hybrid Cache Complexity** - Multiple caching layers causing confusion  
❌ **Data Display Issues** - Games not appearing on frontend despite successful API calls  

---

## Problem: Overcomplicated Caching Architecture

Your current system has **3 different caching layers** competing with each other:

### Layer 1: Prisma Database Cache (`hybrid-cache.ts`)
- Stores raw SDK events in database
- TTL: 30 seconds
- Issues:
  - Foreign key constraints (teams must exist before games)
  - Transformation happens BEFORE storage (complex)
  - Cache misses still common

### Layer 2: In-Memory Cache (`/api/matches/route.ts`)
```typescript
const eventCache = new Map<string, { data: unknown[]; timestamp: number }>();
```
- Stores transformed events in memory
- TTL: 60 seconds
- Issues:
  - Lost on server restart
  - Not shared across serverless functions
  - Duplicate of Prisma cache

### Layer 3: Next.js Data Cache (Attempted)
```
items over 2MB can not be cached
```
- Failed due to size limits
- Adding complexity with no benefit

---

## Solution: Simplify to Single-Source Architecture

### Recommended Approach: **Direct SDK + Optional Prisma Storage**

```
┌─────────────┐
│   Frontend  │
└─────┬───────┘
      │
      ▼
┌─────────────────────┐
│   API Routes        │
│  (/api/matches)     │
└─────┬───────────────┘
      │
      ▼
┌─────────────────────┐
│  SportsGameOdds SDK │ ◄── SINGLE SOURCE OF TRUTH
│  (Real-time data)   │
└─────┬───────────────┘
      │
      ▼
┌─────────────────────┐
│  Transform to       │
│  Internal Format    │
└─────┬───────────────┘
      │
      ├──► Return to Frontend (PRIMARY PATH)
      │
      └──► Store in Prisma (OPTIONAL - for user bets only)
```

### Key Principles

1. **SDK is the ONLY source for odds/games** - No caching of game data
2. **Prisma stores ONLY user data** - Bets, accounts, preferences
3. **Frontend caching** - Use React Query/SWR for UI-level caching
4. **No database caching of odds** - Always fetch fresh from SDK

---

## Option A: Remove Hybrid Cache Entirely (RECOMMENDED)

This is the **cleanest and most reliable** approach.

### Benefits
- ✅ Always fresh, real-time odds
- ✅ No cache invalidation complexity
- ✅ No foreign key constraint issues
- ✅ Simpler codebase
- ✅ Matches "The Odds API" workflow you had before

### Changes Required

**1. Remove Prisma caching from API routes:**

```typescript
// ❌ OLD (hybrid-cache.ts)
const { data: events } = await getEventsWithCache(options);

// ✅ NEW (direct SDK)
const { data: events } = await getEvents(options);
const transformed = transformSDKEvents(events);
return transformed;
```

**2. Keep Prisma ONLY for user data:**
- Bets placed by users
- User accounts & balances
- Bet history & settlements

**3. Use frontend caching (React Query):**

```typescript
// In frontend components
const { data: games } = useQuery({
  queryKey: ['games', leagueId],
  queryFn: () => fetch(`/api/matches?sport=${leagueId}`).then(r => r.json()),
  refetchInterval: 30000, // Refetch every 30 seconds
  staleTime: 15000, // Consider stale after 15 seconds
});
```

---

## Option B: Fix Hybrid Cache (IF YOU INSIST ON CACHING)

If you really want database caching, here's how to fix it properly:

### Step 1: Upsert Teams Before Games

Already implemented in latest changes:

```typescript
// Upsert teams first
await prisma.team.upsert({
  where: { id: transformed.homeTeam.id },
  update: { name, shortName, logo },
  create: { id, name, shortName, logo, leagueId }
});

// Then upsert game
await prisma.game.upsert({
  where: { id: transformed.id },
  create: { homeTeamId, awayTeamId, ... }
});
```

### Step 2: Remove In-Memory Cache

Delete this from `/api/matches/route.ts`:
```typescript
const eventCache = new Map<...>(); // DELETE THIS
```

### Step 3: Set Realistic TTLs

```typescript
const CACHE_TTL = {
  events: 10, // 10 seconds (odds change fast)
  playerProps: 15, // 15 seconds
  gameProps: 15, // 15 seconds
};
```

---

## Option C: Revert to The Odds API Workflow

Your old `THE_ODDS_API_KEY` workflow was simpler and worked. Here's how to restore it:

### Step 1: Switch API Routes Back

```typescript
// src/app/api/matches/route.ts
import { getOdds } from "@/lib/the-odds-api"; // OLD
import { transformOddsApiEvents } from "@/lib/transformers/odds-api"; // OLD

export async function GET(request: NextRequest) {
  const { sport } = QuerySchema.parse({
    sport: request.nextUrl.searchParams.get("sport"),
  });
  
  // Fetch directly from The Odds API (no caching)
  const events = await getOdds(sport, {
    regions: "us",
    markets: "h2h,spreads,totals",
  });
  
  // Transform and return
  const games = transformOddsApiEvents(events);
  return successResponse(games);
}
```

### Step 2: Remove Hybrid Cache Imports

```typescript
// DELETE these imports
import { getEventsWithCache } from "@/lib/hybrid-cache";
import { getEvents } from "@/lib/sportsgameodds-sdk";
```

### Step 3: Verify Environment Variable

```bash
# .env.local
THE_ODDS_API_KEY="your-key-here"
```

### Step 4: Test

```bash
node test-odds-api.mjs
```

---

## Immediate Action Plan

### Choice 1: Quick Fix (Get Working Now)

```bash
# 1. Refresh browser to test latest changes (teams upsert before games)
# 2. Check if games appear on homepage
# 3. If still issues, proceed to Choice 2
```

### Choice 2: Clean Slate (Recommended)

```bash
# 1. Remove hybrid-cache.ts usage from all API routes
# 2. Call SDK directly in each route
# 3. Remove Prisma game/team caching
# 4. Keep Prisma for bets/users only
# 5. Add React Query to frontend for caching
```

### Choice 3: Revert to Working State

```bash
# 1. Switch back to The Odds API
# 2. Remove SportsGameOdds SDK imports
# 3. Use old transformers (odds-api.ts)
# 4. Test with test-odds-api.mjs
```

---

## Performance Optimization (After Fixing Core Issues)

Once you have a working baseline, optimize with:

### 1. Frontend Caching (React Query)
```typescript
// Automatic background refetching
// Deduplication of identical requests
// Intelligent cache invalidation
```

### 2. API Route Caching (Simple In-Memory)
```typescript
// Single 15-second cache per endpoint
// No database overhead
// Auto-expires
```

### 3. CDN Caching (Next.js Edge)
```typescript
export const revalidate = 15; // Cache at edge for 15s
```

---

## Testing Your Fix

### Test 1: API Response
```bash
curl http://localhost:3000/api/matches?sport=basketball_nba
# Should return games with odds immediately
```

### Test 2: Frontend Display
```
1. Open http://localhost:3000
2. Games should appear within 2 seconds
3. Odds should be visible
4. No console errors
```

### Test 3: Bet Placement
```
1. Click on a game
2. Select bet type (moneyline/spread/total)
3. Enter stake
4. Place bet
5. Verify bet appears in "My Bets"
```

---

## Conclusion

**My Recommendation:** Go with **Option A (Remove Hybrid Cache)** 

Why?
- ✅ Simplest to implement
- ✅ Most reliable (no cache bugs)
- ✅ Matches your old working workflow
- ✅ Easier to debug
- ✅ Fresh odds always

The current hybrid cache is adding complexity without significant benefit. Sports betting odds change every few seconds, so caching for 30+ seconds defeats the purpose of "real-time" odds anyway.

Let me know which option you want to pursue and I'll help implement it!
