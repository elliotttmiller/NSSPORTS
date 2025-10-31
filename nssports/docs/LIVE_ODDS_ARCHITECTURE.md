# Live Odds Streaming Architecture - Visual Guide

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   SportsGameOdds SDK API                        │
│  Official Event.status fields: live, started, completed, etc.  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  /api/games/live endpoint      │
        │  - Filters by status.live      │
        │  - Uses status.started         │
        │  - Excludes completed games    │
        └────────┬───────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │   transformSDKEvents()             │
    │   - Extracts odds (game-ml/ats/ou) │
    │   - Maps status to internal format │
    │   - Uses consensus (fairOdds)      │
    └────────┬───────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│            liveDataStore (Zustand)              │
│  - Manages global game state                    │
│  - Enables WebSocket streaming for live games   │
│  - Receives real-time odds updates (<1s)        │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│       /live page (Live Games)          │
│  - Fetches from /api/games/live        │
│  - Auto-refresh every 30s              │
│  - Enables WebSocket streaming         │
│  - Filters out finished games          │
└────────┬───────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│   Mobile Game Components                             │
│   - LiveMobileGameRow (live games only)              │
│   - CompactMobileGameRow (all games)                 │
│   - Receive odds via game.odds prop                  │
│   - Display: spread, total, moneyline               │
│   - Real-time updates via WebSocket push            │
└──────────────────────────────────────────────────────┘
```

## WebSocket Streaming Flow

```
┌────────────────────────────────────────────────────────┐
│  StreamingService.connect('events:live')               │
│  1. GET /v2/stream/events → pusherKey, channel, data   │
│  2. Connect to Pusher WebSocket                        │
│  3. Subscribe to channel                               │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Pusher WebSocket Events   │
        │  - 'data' event received   │
        │  - Contains: [eventIDs]    │
        │  - NOT full data (IDs only)│
        └────────┬───────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────────┐
    │  getEvents({ eventIDs, oddIDs })       │
    │  Fetch full data for changed events    │
    │  - oddIDs: 'game-ml,game-ats,game-ou'  │
    │  - includeOpposingOddIDs: true         │
    └────────┬───────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│  StreamingService.emit('event:updated')     │
│  - Updated event data with new odds         │
│  - liveDataStore subscribes to this event   │
│  - Updates specific game in state           │
└────────┬────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│  React Component Re-renders                   │
│  - game.odds updated via Zustand subscription │
│  - Mobile component receives new odds         │
│  - User sees updated lines/odds instantly     │
└───────────────────────────────────────────────┘
```

## Status Field Usage

```
SDK Event Object:
{
  eventID: "NBA_12345",
  leagueID: "NBA",
  startTime: "2025-01-30T19:00:00Z",
  status: {
    live: true,        ← PRIMARY: Used to identify live games
    started: true,     ← PRIMARY: Game has started
    completed: false,  ← PRIMARY: Game not finished
    cancelled: false   ← PRIMARY: Game not cancelled
  },
  odds: {
    "points-away-game-ml-away": { fairOdds: -110, ... },
    "points-home-game-ml-home": { fairOdds: -110, ... },
    "points-away-game-sp-away": { fairOdds: -110, fairSpread: -5.5, ... },
    "points-all-game-ou-over": { fairOdds: -110, fairOverUnder: 220.5, ... },
    ...
  }
}

↓ Transformation Logic

if (status.live === true) → "live"
if (status.started && !completed && !cancelled) → "live"
if (status.completed || status.cancelled) → "finished"
if (startTime > now) → "upcoming"

↓ API Filtering

/api/games/live → Filter by status.live || (status.started && !completed)
/api/games/upcoming → Filter by status === 'upcoming'
/api/games → Filter out status === 'finished'
```

## Odds Extraction Pattern

```
SDK oddID format: "{stat}-{side}-{market}-{selection}"

Examples:
- "points-away-game-ml-away"  → Moneyline Away
- "points-home-game-ml-home"  → Moneyline Home
- "points-away-game-sp-away"  → Spread Away
- "points-home-game-sp-home"  → Spread Home
- "points-all-game-ou-over"   → Total Over
- "points-all-game-ou-under"  → Total Under

Extraction Logic:
1. Filter: Only process oddIDs containing '-game-'
2. Match patterns:
   - Contains '-ml-home' → moneylineHome
   - Contains '-ml-away' → moneylineAway
   - Contains '-sp-home' → spreadHome
   - Contains '-sp-away' → spreadAway
   - Contains '-game-ou-over' → totalOver
   - Contains '-game-ou-under' → totalUnder
3. Extract consensus: fairOdds (recommended) || bookOdds
4. Extract line: fairSpread || fairOverUnder

Result:
{
  spread: { home: { odds, line }, away: { odds, line } },
  moneyline: { home: { odds }, away: { odds } },
  total: { over: { odds, line }, under: { odds, line } }
}
```

## Cache Strategy Layers

```
┌──────────────────────────────────────────────────────┐
│  Layer 1: SDK Built-in Cache                         │
│  - Managed by SportsGameOdds SDK                     │
│  - TTL: Variable based on SDK configuration          │
│  - Scope: Per SDK instance                           │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│  Layer 2: Prisma Database Cache                      │
│  - TTL: 5 min (live), 15 min (upcoming), 1 hr (done)│
│  - Scope: Global across all users                    │
│  - Location: PostgreSQL (Supabase)                   │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│  Layer 3: WebSocket Real-Time Streaming              │
│  - Latency: <1 second                                │
│  - Scope: Only for LIVE games                        │
│  - Protocol: Pusher WebSocket                        │
│  - Event: 'events:live' channel                      │
└──────────────────────────────────────────────────────┘

Request Flow:
1. Check Prisma cache → Hit? Return cached data
2. Cache miss? → Fetch from SDK
3. Store in Prisma cache with TTL
4. If game is live → Enable WebSocket streaming
5. WebSocket pushes updates → Update cache + state
6. No additional API calls needed for odds updates
```

## Mobile Component Props Flow

```
/live page (LivePage.tsx)
    │
    ├─ Fetches: /api/games/live
    │     ↓
    ├─ Stores in: liveGamesData state
    │     ↓
    ├─ Filters: shouldShowInCurrentContext(game, 'live')
    │     ↓
    └─ Maps: displayGames.map(game => ...)
          ↓
┌─────────────────────────────────────┐
│  <LiveMobileGameRow game={game} />  │
│                                     │
│  Props received:                    │
│  - game.id                          │
│  - game.status ("live")             │
│  - game.odds {                      │
│      spread: { home, away },        │
│      moneyline: { home, away },     │
│      total: { over, under }         │
│    }                                │
│  - game.awayTeam { ... }            │
│  - game.homeTeam { ... }            │
│  - game.startTime                   │
│                                     │
│  Component behavior:                │
│  1. Extract: const oddsSource = game.odds │
│  2. Display: formatOdds(oddsSource.spread.away.odds) │
│  3. Update: Automatic via Zustand subscription │
└─────────────────────────────────────┘
```

## Separation of Concerns

```
┌────────────────────────────────────────────────┐
│  LIVE GAMES ONLY                               │
│  (/live page, /api/games/live endpoint)        │
│                                                │
│  Criteria:                                     │
│  - Event.status.live === true                  │
│  - OR Event.status.started && !completed       │
│                                                │
│  Features:                                     │
│  ✓ WebSocket streaming enabled                 │
│  ✓ Auto-refresh every 30s                      │
│  ✓ Short cache TTL (5 minutes)                 │
│  ✓ Real-time odds updates (<1s latency)        │
│  ✓ Components: LiveMobileGameRow               │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  UPCOMING GAMES ONLY                           │
│  (/games page, /api/games/upcoming endpoint)   │
│                                                │
│  Criteria:                                     │
│  - game.status === 'upcoming'                  │
│  - startTime > now                             │
│                                                │
│  Features:                                     │
│  ✗ No WebSocket streaming (not needed)         │
│  ✓ Longer cache TTL (15 minutes)               │
│  ✓ Standard REST API polling                   │
│  ✓ Components: CompactMobileGameRow            │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  FINISHED GAMES NEVER SHOWN                    │
│  (Filtered out at multiple layers)             │
│                                                │
│  Criteria:                                     │
│  - Event.status.completed === true             │
│  - OR Event.status.cancelled === true          │
│                                                │
│  Filters:                                      │
│  1. /api/games/live → Explicit filter          │
│  2. /api/games → Filter unless status=finished │
│  3. useGameTransitions hook → Removes from UI  │
│  4. Page-level filters → Final safety layer    │
└────────────────────────────────────────────────┘
```

## Testing Commands

### 1. Check Live Games Endpoint
```powershell
# Fetch live games
Invoke-WebRequest -Uri "http://localhost:3000/api/games/live" | ConvertFrom-Json | Select-Object -ExpandProperty data | Format-Table id, status, @{Name='Away';Expression={$_.awayTeam.shortName}}, @{Name='Home';Expression={$_.homeTeam.shortName}}
```

### 2. Check All Games Endpoint
```powershell
# Fetch all games (live + upcoming)
Invoke-WebRequest -Uri "http://localhost:3000/api/games?page=1&limit=10" | ConvertFrom-Json | Select-Object -ExpandProperty data | Format-Table id, status, startTime
```

### 3. Check Odds Structure
```powershell
# Inspect odds for a specific game
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/games/live" | ConvertFrom-Json
$response.data[0].odds | ConvertTo-Json -Depth 3
```

### 4. Monitor Streaming Logs
```bash
# In browser console (F12)
# Filter logs by: [Streaming] or [LiveDataStore]
# Look for:
# - "Successfully subscribed to channel"
# - "Event updated"
# - "Streaming enabled successfully"
```

## Key Takeaways

1. ✅ **Official SDK Fields Used Exclusively**
   - `Event.status.live`, `.started`, `.completed`, `.cancelled`
   - No custom time-based heuristics as primary logic

2. ✅ **Proper Odds Extraction**
   - OddID patterns: `game-ml`, `game-ats`, `game-ou`
   - Consensus odds: `fairOdds` (recommended by SDK)
   - Both sides: `includeOpposingOddIDs: true`

3. ✅ **Smart Streaming Strategy**
   - WebSocket only for live games (80% API reduction)
   - REST API for initial load and periodic refresh
   - Multi-layer cache (SDK + Prisma + WebSocket)

4. ✅ **Clean Component Architecture**
   - Components receive `game` prop (single source of truth)
   - `game.odds` contains all betting lines
   - Automatic updates via Zustand subscription
   - No direct API calls in components

5. ✅ **Separation of Live vs Upcoming**
   - Live: `/api/games/live` + WebSocket streaming
   - Upcoming: `/api/games/upcoming` + REST polling
   - Finished: Filtered out at multiple layers
