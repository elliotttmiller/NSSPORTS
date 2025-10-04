# Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     React Components                          │  │
│  │                                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐  │  │
│  │  │  My Bets    │  │  Bet Slip   │  │  Games List        │  │  │
│  │  │  Page       │  │  Panel      │  │                    │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────┬──────────┘  │  │
│  │         │                 │                    │             │  │
│  └─────────┼─────────────────┼────────────────────┼─────────────┘  │
│            │                 │                    │                 │
│  ┌─────────▼─────────────────▼────────────────────▼─────────────┐  │
│  │                   React Query Layer                           │  │
│  │                                                               │  │
│  │  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐  │  │
│  │  │ useBetHistory  │  │  usePlaceBet    │  │  useGames    │  │  │
│  │  │ Query          │  │  Mutation       │  │  Query       │  │  │
│  │  └────────┬───────┘  └────────┬────────┘  └──────┬───────┘  │  │
│  │           │                   │                    │          │  │
│  │  ┌────────▼───────────────────▼────────────────────▼───────┐  │  │
│  │  │              Query Client                               │  │  │
│  │  │  - Caching (30s stale time)                            │  │  │
│  │  │  - Automatic refetching                                │  │  │
│  │  │  - Optimistic updates                                  │  │  │
│  │  └─────────────────────┬──────────────────────────────────┘  │  │
│  └────────────────────────┼─────────────────────────────────────┘  │
│                           │                                         │
│  ┌────────────────────────▼─────────────────────────────────────┐  │
│  │                    Context Providers                          │  │
│  │                                                               │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │  │
│  │  │ BetHistory       │  │ BetSlip          │  │ Navigation │ │  │
│  │  │ Context          │  │ Context          │  │ Context    │ │  │
│  │  └──────────────────┘  └──────────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTP Requests (fetch)
                               │ - Headers: Content-Type, Idempotency-Key
                               │
┌──────────────────────────────▼───────────────────────────────────────┐
│                         NEXT.JS SERVER                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Middleware Layer                            │  │
│  │  - CORS handling                                               │  │
│  │  - Request logging (ready)                                     │  │
│  │  - Rate limiting (ready)                                       │  │
│  └──────────────────────────┬─────────────────────────────────────┘  │
│                             │                                         │
│  ┌──────────────────────────▼─────────────────────────────────────┐  │
│  │                      API Routes                                │  │
│  │                    /app/api/*                                  │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  GET  /api/my-bets                                       │ │  │
│  │  │  POST /api/my-bets                                       │ │  │
│  │  │  ├─ Zod validation                                       │ │  │
│  │  │  ├─ Idempotency check                                    │ │  │
│  │  │  ├─ Transaction handling                                 │ │  │
│  │  │  └─ Error handling                                       │ │  │
│  │  └──────────────────────────┬───────────────────────────────┘ │  │
│  │                             │                                  │  │
│  │  ┌──────────────────────────┼───────────────────────────────┐ │  │
│  │  │  GET  /api/games         │                               │ │  │
│  │  │  GET  /api/games/live    │                               │ │  │
│  │  │  GET  /api/sports        │                               │ │  │
│  │  └──────────────────────────┼───────────────────────────────┘ │  │
│  └────────────────────────────┼──────────────────────────────────┘  │
│                               │                                      │
│  ┌────────────────────────────▼──────────────────────────────────┐  │
│  │                     Utility Layer                             │  │
│  │                                                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │  │
│  │  │  logger.ts   │  │ apiResponse  │  │  prisma.ts        │  │  │
│  │  │              │  │  .ts         │  │  (singleton)      │  │  │
│  │  │ - Structured │  │              │  │                   │  │  │
│  │  │   logging    │  │ - Success    │  │ - Connection      │  │  │
│  │  │ - Levels     │  │   response   │  │   pooling         │  │  │
│  │  │ - Timestamps │  │ - Error      │  │ - Type safety     │  │  │
│  │  │              │  │   response   │  │                   │  │  │
│  │  └──────────────┘  └──────────────┘  └─────────┬─────────┘  │  │
│  └────────────────────────────────────────────────┼────────────┘  │
└───────────────────────────────────────────────────┼───────────────┘
                                                    │
                                   ┌────────────────▼────────────────┐
                                   │       Prisma ORM                │
                                   │                                 │
                                   │  - Query builder                │
                                   │  - Transaction support          │
                                   │  - Type generation              │
                                   │  - Migration management         │
                                   └────────────────┬────────────────┘
                                                    │
                                   ┌────────────────▼────────────────┐
                                   │     PostgreSQL Database         │
                                   │        (Supabase)               │
                                   │                                 │
                                   │  ┌──────────────────────────┐  │
                                   │  │  Tables                  │  │
                                   │  │  - bets                  │  │
                                   │  │  - games                 │  │
                                   │  │  - teams                 │  │
                                   │  │  - leagues               │  │
                                   │  │  - sports                │  │
                                   │  │  - odds                  │  │
                                   │  └──────────────────────────┘  │
                                   │                                 │
                                   │  ┌──────────────────────────┐  │
                                   │  │  Indexes                 │  │
                                   │  │  - userId                │  │
                                   │  │  - gameId                │  │
                                   │  │  - status                │  │
                                   │  │  - placedAt              │  │
                                   │  │  - idempotencyKey        │  │
                                   │  └──────────────────────────┘  │
                                   └─────────────────────────────────┘
```

## Data Flow: Placing a Bet

```
1. User Action
   ↓
2. BetSlip Component
   └─ addBet() → Update local state
   ↓
3. User Clicks "Place Bet"
   ↓
4. usePlaceBet Hook
   ├─ Optimistic Update (instant UI feedback)
   │  └─ Add bet to cache immediately
   └─ Mutation Request
      ↓
5. POST /api/my-bets
   ├─ Validate with Zod
   ├─ Check idempotency key
   ├─ Start transaction
   │  ├─ Verify game exists
   │  ├─ Check game status
   │  └─ Create bet
   ├─ Commit transaction
   └─ Return bet data
      ↓
6. React Query
   ├─ On Success: Invalidate cache
   │  └─ Trigger refetch
   └─ On Error: Rollback optimistic update
      ↓
7. UI Updates
   └─ Show success toast
   └─ Clear bet slip
   └─ Redirect to My Bets
      ↓
8. My Bets Page
   └─ Display from cache (instant)
   └─ Auto-refetch every 30s
```

## Request/Response Flow

```
┌──────────────┐                    ┌──────────────┐
│   Client     │                    │   Server     │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │  POST /api/my-bets                │
       │  Headers:                         │
       │    Content-Type: application/json │
       │    Idempotency-Key: xxx           │
       │  Body: { betType, ... }           │
       ├──────────────────────────────────►│
       │                                   │
       │                                   │  1. Validate Headers
       │                                   │  2. Parse & Validate Body (Zod)
       │                                   │  3. Check Idempotency
       │                                   │  4. Start Transaction
       │                                   │  5. Verify Game
       │                                   │  6. Create Bet
       │                                   │  7. Commit
       │                                   │  8. Log Success
       │                                   │
       │  201 Created                      │
       │  { id, betType, ... }             │
       │◄──────────────────────────────────┤
       │                                   │
       │  GET /api/my-bets                 │
       ├──────────────────────────────────►│
       │                                   │
       │                                   │  1. Query Database
       │                                   │  2. Join Relations
       │                                   │  3. Enrich Parlay Legs
       │                                   │  4. Serialize Decimals
       │                                   │
       │  200 OK                           │
       │  [ { id, ... }, ... ]             │
       │◄──────────────────────────────────┤
       │                                   │
```

## Error Handling Flow

```
Request
  ↓
Validation
  ├─ Invalid? → 422 Unprocessable Entity
  │             { error: { message, code, details } }
  │
  └─ Valid
      ↓
  Business Logic
      ├─ Game Not Found? → 400 Bad Request
      │                     { error: { message: "Game not found" } }
      │
      ├─ Game Finished? → 400 Bad Request
      │                   { error: { message: "Cannot bet on finished game" } }
      │
      └─ Valid
          ↓
      Database Transaction
          ├─ Constraint Violation? → 409 Conflict
          │                          { error: { message: "Duplicate bet" } }
          │
          ├─ DB Error? → 500 Internal Server Error
          │              { error: { message: "Database error" } }
          │              + Logged to console/service
          │
          └─ Success
              ↓
          201 Created
          { bet data }
```

## Caching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    React Query Cache                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Query Key: ['bets', 'history']                             │
│  ├─ Status: fresh (0-30s)                                   │
│  │   └─ No fetch, return cached data                        │
│  │                                                           │
│  ├─ Status: stale (30s-5min)                                │
│  │   └─ Return cached data + background refetch             │
│  │                                                           │
│  └─ Status: garbage collected (>5min)                       │
│      └─ Fetch from API                                      │
│                                                              │
│  Invalidation Triggers:                                     │
│  ├─ Manual: refreshBetHistory()                             │
│  ├─ Automatic: After bet placement (mutation success)       │
│  ├─ Automatic: Every 30 seconds (refetchInterval)           │
│  └─ Automatic: On window focus                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Overview

```
┌────────────┐       ┌────────────┐       ┌────────────┐
│   Sport    │       │   League   │       │    Team    │
├────────────┤       ├────────────┤       ├────────────┤
│ id (PK)    │◄──┐   │ id (PK)    │   ┌──►│ id (PK)    │
│ name       │   │   │ name       │   │   │ name       │
│ icon       │   │   │ sportId(FK)├───┘   │ shortName  │
└────────────┘   │   │ logo       │       │ logo       │
                 └───┤            │       │ record     │
                     └────────────┘       └────────────┘
                                                 ▲
                                                 │
                                          ┌──────┴──────┐
                     ┌────────────┐       │             │
                     │    Game    │       │             │
                     ├────────────┤       │             │
                     │ id (PK)    │───────┼──(home)     │
                     │ leagueId   │       │             │
                     │ homeTeamId ├───────┘─(away)      │
                     │ awayTeamId │                     │
                     │ startTime  │                     │
                     │ status     │                     │
                     └──────┬─────┘                     │
                            │                           │
                ┌───────────┼───────────┐               │
                │           │           │               │
         ┌──────▼─────┐  ┌──▼─────┐  ┌─▼─────────┐     │
         │    Odds    │  │  Bet   │  │           │     │
         ├────────────┤  ├────────┤  │           │     │
         │ id (PK)    │  │ id (PK)│  │           │     │
         │ gameId(FK) │  │ gameId │  │           │     │
         │ betType    │  │ betType│  │           │     │
         │ odds       │  │ odds   │  │           │     │
         │ line       │  │ stake  │  │           │     │
         └────────────┘  │ payout │  │           │     │
                         │ status │  │           │     │
                         │ legs   │  │           │     │
                         │ idempo-│  │           │     │
                         │ tencyKy│  │           │     │
                         └────────┘  │           │     │
                                     └───────────┘     │
```

## Key Features Implemented

### 1. Idempotency
- Prevents duplicate bet placement
- Uses unique idempotency keys
- Returns existing bet if key matches

### 2. Transactions
- Ensures data consistency
- Automatic rollback on error
- Validates game status before bet creation

### 3. Optimistic Updates
- Instant UI feedback
- Automatic rollback on error
- Better user experience

### 4. Caching
- 30-second stale time
- 5-minute garbage collection
- Automatic background refetching
- Window focus refetching

### 5. Error Recovery
- Exponential backoff retry
- Automatic cache rollback
- User-friendly error messages
- Structured error logging

---

This architecture follows **Next.js best practices** and **industry standards** for building production-ready web applications.
