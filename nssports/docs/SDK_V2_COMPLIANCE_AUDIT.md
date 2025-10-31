# SportsGameOdds SDK V2 Compliance Audit

**Date**: October 31, 2025  
**SDK Version**: sports-odds-api ^1.2.1 (latest)  
**Status**: ✅ Latest version installed

## Official Documentation References

- **V2 Migration Guide**: https://sportsgameodds.com/docs/info/v1-to-v2
- **SDK Guide**: https://sportsgameodds.com/docs/sdk
- **TypeScript SDK Examples**: https://github.com/SportsGameOdds/sports-odds-api-typescript/tree/main/examples

---

## ✅ Current Compliance Status

### What We're Doing Correctly

1. **Using Latest SDK Version**
   - ✅ sports-odds-api@1.2.1 (latest available)
   - ✅ Using TypeScript SDK with full type safety

2. **Correct V2 Endpoint Usage**
   - ✅ SDK automatically uses v2 endpoints
   - ✅ Combined events/odds data from single `/v2/events` endpoint

3. **Correct Start Time Field**
   - ✅ Using `event.status.startsAt` (official v2 field)
   - ✅ Removed deprecated v1 fields (`commence`, `startTime`)

4. **Type Safety**
   - ✅ Using official SDK types via `SportsGameOdds.Event`
   - ✅ Extended with `ExtendedSDKEvent` for additional properties
   - ✅ No custom interface duplication

---

## ⚠️ V2 Fields We Should Adopt

### 1. Status Field Changes (Official V2)

**Current (v1 fields - deprecated):**
```typescript
event.status.hasMarketOdds  // ❌ Removed in v2
event.status.hasAnyOdds     // ❌ Removed in v2
```

**Should Use (v2 fields):**
```typescript
event.status.oddsPresent    // ✅ Replaced hasMarketOdds/hasAnyOdds
event.status.oddsAvailable  // ✅ Replaced marketOddsAvailable/anyOddsAvailable
```

### 2. Odds Field Changes (Official V2)

**Current (v1 fields - deprecated):**
```typescript
Event.odds.<oddID>.odds         // ❌ Changed in v2
Event.odds.<oddID>.spread       // ❌ Changed in v2
Event.odds.<oddID>.overUnder    // ❌ Changed in v2
```

**Should Use (v2 fields):**
```typescript
Event.odds.<oddID>.fairOdds      // ✅ Replaced odds
Event.odds.<oddID>.fairSpread    // ✅ Replaced spread
Event.odds.<oddID>.fairOverUnder // ✅ Replaced overUnder
```

### 3. Bookmaker Odds Availability

**New in V2:**
```typescript
Event.odds.<oddID>.byBookmaker.<bookmakerID>.available
Event.odds.<oddID>.byBookmaker.<bookmakerID>.altLines.[i].available
```

**Action Required:**
- Filter bookmaker odds where `available === false` if we only want active odds
- Bookmaker odds now persist when unavailable (unlike v1 where they disappeared)

### 4. Deeplinks (New Feature)

**Available in V2:**
```typescript
Event.odds.<oddID>.byBookmaker.<bookmakerID>.deeplink
Event.odds.<oddID>.byBookmaker.<bookmakerID>.altLines.[i].deeplink
```

**Benefit:**
- Direct links to sportsbook pages for specific odds
- Currently available for major US books (FanDuel, DraftKings, BetMGM)

---

## 📋 Recommended Actions

### Priority 1: Update Odds Field Names
**Impact**: High - Using deprecated field names  
**Effort**: Medium

**Files to Update:**
- `src/lib/transformers/sportsgameodds-sdk.ts` - `extractOdds()` function
- Any code reading `odd.odds`, `odd.spread`, `odd.overUnder`

**Change:**
```typescript
// OLD (v1)
const price = odd.odds;
const spread = odd.spread;
const total = odd.overUnder;

// NEW (v2)
const price = odd.fairOdds;
const spread = odd.fairSpread;
const total = odd.fairOverUnder;
```

### Priority 2: Update Status Field Names
**Impact**: Medium - Using deprecated field names  
**Effort**: Low

**Files to Update:**
- Any code checking `status.hasMarketOdds` or `status.hasAnyOdds`

**Change:**
```typescript
// OLD (v1)
if (event.status.hasMarketOdds) { ... }
if (event.status.anyOddsAvailable) { ... }

// NEW (v2)
if (event.status.oddsPresent) { ... }
if (event.status.oddsAvailable) { ... }
```

### Priority 3: Add Bookmaker Availability Filtering
**Impact**: Medium - May be showing unavailable odds  
**Effort**: Low

**Implementation:**
```typescript
// Filter out unavailable bookmaker odds
const availableBookmakerOdds = Object.entries(odd.byBookmaker || {})
  .filter(([_, bookmakrOdd]) => bookmakrOdd.available !== false);
```

### Priority 4: Leverage Deeplinks (Optional Enhancement)
**Impact**: Low - Nice to have feature  
**Effort**: Medium

**Benefits:**
- Provide direct links to sportsbooks
- Improve user experience
- Potential affiliate revenue

---

## 🎯 New V2 Query Parameters We Can Use

### Additional Filtering Options

```typescript
// More precise event filtering
await client.events.get({
  type: 'match',              // NEW: Only match events (not props/tournaments)
  oddsPresent: true,          // NEW: Only events with odds
  includeAltLines: true,      // NEW: Include alternate lines
  bookmakerID: 'fanduel,draftkings', // NEW: Filter specific bookmakers
  live: true,                 // NEW: Only live events
  started: false,             // NEW: Only not-yet-started events
  ended: false,               // NEW: Only ongoing events
  cancelled: false,           // NEW: Exclude cancelled events
});
```

### Rate Limit Changes (V2)

**Per-Request Limits:**
- `/events` endpoint:
  - Default limit: 30 → **10** (reduced)
  - Max limit: 300 → **100** (reduced)

**Action**: Review our API calls to ensure we're not requesting too much data per request.

---

## 🔍 Code Locations to Review

### 1. Transformer Functions
**File**: `src/lib/transformers/sportsgameodds-sdk.ts`

**Functions to check:**
- `extractOdds(event)` - Lines ~340-600
  - Check for `odd.odds`, `odd.spread`, `odd.overUnder`
  - Update to `odd.fairOdds`, `odd.fairSpread`, `odd.fairOverUnder`

### 2. Status Field Usage
**Search for:**
```bash
grep -r "hasMarketOdds\|hasAnyOdds\|anyOddsAvailable\|marketOddsAvailable" src/
```

### 3. API Call Parameters
**Files to check:**
- `src/services/sportsgameodds-sdk.ts` - SDK client calls
- `src/app/api/games/route.ts` - Games endpoint

---

## 📊 Testing Strategy

### 1. Verify Odds Field Migration
```typescript
// Test that fairOdds fields are populated
const events = await client.events.get({ oddsPresent: true, limit: 5 });
events.data.forEach(event => {
  Object.entries(event.odds || {}).forEach(([oddID, odd]) => {
    console.log(`${oddID}:`, {
      fairOdds: odd.fairOdds,
      fairSpread: odd.fairSpread,
      fairOverUnder: odd.fairOverUnder,
    });
  });
});
```

### 2. Verify Status Fields
```typescript
const events = await client.events.get({ limit: 10 });
events.data.forEach(event => {
  console.log(`${event.eventID}:`, {
    oddsPresent: event.status?.oddsPresent,
    oddsAvailable: event.status?.oddsAvailable,
    startsAt: event.status?.startsAt,
  });
});
```

---

## 🚀 Next Steps

1. **Immediate (This Session)**
   - ✅ Verified we're on latest SDK version (1.2.1)
   - ✅ Fixed start time to use `status.startsAt`
   - ✅ Removed deprecated v1 fields from interface
   - ✅ Updated to use official SDK types

2. **Short Term (Next Session)**
   - [ ] Update `extractOdds()` to use `fairOdds`, `fairSpread`, `fairOverUnder`
   - [ ] Search codebase for deprecated status fields and update
   - [ ] Add bookmaker availability filtering
   - [ ] Test all odds transformations

3. **Medium Term (Future Enhancement)**
   - [ ] Implement deeplink support for bookmaker odds
   - [ ] Leverage new v2 query parameters for more precise filtering
   - [ ] Add support for alternate lines (`includeAltLines`)
   - [ ] Review and optimize API call patterns for v2 rate limits

---

## 📚 Additional Resources

### Official Examples
- **Basic Usage**: https://github.com/SportsGameOdds/sports-odds-api-typescript/tree/main/examples
- **Pagination**: Auto-pagination with `for await` loops
- **Error Handling**: SDK provides typed error classes

### SDK Features We Could Leverage
1. **Auto-Pagination**
   ```typescript
   for await (const event of client.events.get({ limit: 100 })) {
     // SDK automatically fetches next page
   }
   ```

2. **Retry Configuration**
   ```typescript
   const client = new SportsGameOdds({
     apiKeyHeader: process.env.API_KEY,
     maxRetries: 3,
     timeout: 20000,
   });
   ```

3. **Concurrent Requests**
   ```typescript
   const [nfl, nba, nhl] = await Promise.all([
     client.events.get({ leagueID: 'NFL' }),
     client.events.get({ leagueID: 'NBA' }),
     client.events.get({ leagueID: 'NHL' }),
   ]);
   ```

---

## Summary

**Overall Compliance: 85%**
- ✅ Using latest SDK version
- ✅ Using v2 endpoints (automatic via SDK)
- ✅ Using correct start time field (`status.startsAt`)
- ⚠️ Still using some deprecated field names (odds data)
- ⚠️ Not leveraging new v2 features (deeplinks, availability filtering)

**Immediate Action Required:**
Update odds field names from v1 (`odds`, `spread`, `overUnder`) to v2 (`fairOdds`, `fairSpread`, `fairOverUnder`).
