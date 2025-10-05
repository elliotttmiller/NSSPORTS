# API Documentation

## Betting API

This document describes the RESTful API endpoints for the NorthStar Sports betting platform.

## Base URL

All API requests should be made to: `/api`

## Authentication

Currently, the API does not require authentication. In production, implement proper authentication using Next.js middleware or authentication providers like NextAuth.js.

---

## Endpoints

### Bets

#### GET `/api/my-bets`

Retrieve all bets for the current user.

**Response**

```json
[
  {
    "id": "string",
    "userId": "string | null",
    "gameId": "string | null",
    "betType": "spread | moneyline | total | parlay",
    "selection": "string",
    "odds": number,
    "line": number | null,
    "stake": number,
    "potentialPayout": number,
    "status": "pending | won | lost",
    "placedAt": "ISO 8601 datetime",
    "settledAt": "ISO 8601 datetime | null",
    "legs": [
      {
        "gameId": "string",
        "betType": "string",
        "selection": "string",
        "odds": number,
        "line": number | null,
        "game": {
          "id": "string",
          "homeTeam": { ... },
          "awayTeam": { ... },
          "league": { ... }
        }
      }
    ] | null,
    "game": {
      "id": "string",
      "homeTeam": {
        "id": "string",
        "name": "string",
        "shortName": "string",
        "logo": "string",
        "record": "string | null"
      },
      "awayTeam": {
        "id": "string",
        "name": "string",
        "shortName": "string",
        "logo": "string",
        "record": "string | null"
      },
      "league": {
        "id": "string",
        "name": "string",
        "logo": "string"
      }
    } | null
  }
]
```

**Status Codes**

- `200 OK` - Successfully retrieved bets
- `500 Internal Server Error` - Server error occurred

---

#### POST `/api/my-bets`

Place a new bet (single or parlay).

**Headers**

- `Content-Type: application/json`
- `Idempotency-Key: string` (optional, recommended) - Prevents duplicate bet placement

**Request Body - Single Bet**

```json
{
  "betType": "spread | moneyline | total",
  "gameId": "string",
  "selection": "home | away | over | under",
  "odds": number,
  "line": number | null,
  "stake": number (1-1000000),
  "potentialPayout": number,
  "status": "pending | won | lost" (optional, defaults to "pending"),
  "userId": "string" (optional)
}
```

**Request Body - Parlay Bet**

```json
{
  "betType": "parlay",
  "legs": [
    {
      "gameId": "string",
      "betType": "spread | moneyline | total",
      "selection": "home | away | over | under",
      "odds": number,
      "line": number | null
    }
  ] (minimum 2 legs),
  "stake": number (1-1000000),
  "potentialPayout": number,
  "odds": number,
  "status": "pending | won | lost" (optional, defaults to "pending"),
  "userId": "string" (optional)
}
```

**Response**

Returns the created bet object with all fields populated, including related game data for single bets.

**Status Codes**

- `200 OK` - Bet already exists (when using Idempotency-Key)
- `201 Created` - Bet successfully created
- `400 Bad Request` - Missing required fields
- `422 Unprocessable Entity` - Validation error (invalid data format)
- `500 Internal Server Error` - Server error occurred

**Validation Rules**

- `stake`: Must be positive, maximum 1,000,000
- `potentialPayout`: Must be positive, maximum 100,000,000
- Parlay bets must have at least 2 legs
- Cannot place bets on finished games

**Error Response Format**

```json
{
  "success": false,
  "error": {
    "message": "string",
    "code": "string",
    "details": { ... }
  },
  "meta": {
    "timestamp": "ISO 8601 datetime"
  }
}
```

---

## Games API

### GET `/api/games`

Retrieve paginated list of games.

**Query Parameters**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `leagueId`: Filter by league ID
- `status`: Filter by game status (upcoming, live, finished)

**Response**

```json
{
  "data": [ ... ],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number,
    "hasNextPage": boolean,
    "hasPrevPage": boolean
  }
}
```

---

### GET `/api/games/live`

Retrieve all live games.

---

### GET `/api/games/upcoming`

Retrieve upcoming games.

---

### GET `/api/games/league/:leagueId`

Retrieve games for a specific league.

---

## Sports API

### GET `/api/sports`

Retrieve all sports with their leagues.

**Response**

```json
[
  {
    "id": "string",
    "name": "string",
    "icon": "string",
    "leagues": [
      {
        "id": "string",
        "name": "string",
        "sportId": "string",
        "logo": "string"
      }
    ]
  }
]
```

---

## Best Practices

### Idempotency

Always include an `Idempotency-Key` header when placing bets to prevent duplicate submissions:

```javascript
const idempotencyKey = `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

fetch('/api/my-bets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  },
  body: JSON.stringify(betData),
});
```

### Error Handling

Always check the `success` field in API responses and handle errors appropriately:

```javascript
const response = await fetch('/api/my-bets');
const data = await response.json();

if (!response.ok || !data.success) {
  console.error('API Error:', data.error?.message);
  // Handle error
}
```

### Rate Limiting

In production, implement rate limiting to prevent abuse. Consider using:
- Next.js middleware for API route protection
- Redis for distributed rate limiting
- Services like Vercel Edge Config or Upstash

---

## Database Schema

See `prisma/schema.prisma` for the complete database schema.

### Key Models

- **Bet**: Stores placed bets (single and parlay)
- **Game**: Game information with teams and odds
- **Team**: Team details
- **League**: League information
- **Sport**: Sport categories
- **Odds**: Betting odds for games

### Indexes

The following indexes are automatically created for optimal query performance:

- `Bet.userId_status_placedAt`: Composite index for user bet queries
- `Bet.gameId`: For querying bets by game
- `Bet.idempotencyKey`: Unique index for idempotency
- `Game.leagueId`: For filtering games by league
- `Game.status`: For filtering by game status
- `Game.startTime`: For sorting by time

---

## React Hooks

### useBetHistoryQuery

Custom React Query hook for fetching bet history with automatic caching and refetching:

```typescript
import { useBetHistoryQuery } from '@/hooks/useBetHistory';

function MyComponent() {
  const { data: bets, isLoading, error, refetch } = useBetHistoryQuery();
  
  // Auto-refetches every 30 seconds
  // Handles caching automatically
}
```

### usePlaceBet

Custom mutation hook for placing bets with optimistic updates:

```typescript
import { usePlaceBet } from '@/hooks/useBetHistory';

function MyComponent() {
  const placeBetMutation = usePlaceBet();
  
  const handlePlaceBet = async () => {
    await placeBetMutation.mutateAsync({
      bets,
      betType: 'single',
      totalStake: 100,
      totalPayout: 190,
      totalOdds: -110,
    });
  };
}
```

---

## Security Considerations

### Production Checklist

- [ ] Implement user authentication
- [ ] Add authorization checks to API routes
- [ ] Validate user owns the bets they're querying
- [ ] Add CORS configuration
- [ ] Implement rate limiting
- [ ] Add request validation middleware
- [ ] Use environment variables for sensitive data
- [ ] Enable HTTPS only
- [ ] Implement CSP headers
- [ ] Add API request logging
- [ ] Monitor for suspicious activity

---

## Testing

### API Testing Examples

```javascript
// Example: Test bet placement
const response = await fetch('/api/my-bets', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Idempotency-Key': 'test-123',
  },
  body: JSON.stringify({
    betType: 'moneyline',
    gameId: 'game-123',
    selection: 'home',
    odds: -150,
    stake: 100,
    potentialPayout: 166.67,
  }),
});

expect(response.status).toBe(201);
const bet = await response.json();
expect(bet.id).toBeDefined();
```

---

## Performance Optimization

### Implemented Optimizations

1. **Connection Pooling**: Prisma client uses connection pooling automatically
2. **Query Optimization**: All queries include proper `select` and `include` clauses
3. **Caching**: React Query provides automatic caching with 30-second stale time
4. **Optimistic Updates**: UI updates immediately before server confirmation
5. **Database Indexes**: Strategic indexes on frequently queried fields
6. **Transaction Support**: Bet placement uses database transactions for consistency

### Future Optimizations

- Implement Redis caching for frequently accessed data
- Add CDN for static assets
- Use Next.js ISR for game pages
- Implement WebSocket for real-time updates
- Add database read replicas for scalability
