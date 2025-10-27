# Sports, Leagues, and Props Configuration Guide

This document provides comprehensive guidance on configuring sports, leagues, games, and player/game props in the NSSPORTS application following industry best practices.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Configuration](#api-configuration)
3. [Sports and Leagues Setup](#sports-and-leagues-setup)
4. [Games and Odds Integration](#games-and-odds-integration)
5. [Player Props Configuration](#player-props-configuration)
6. [Game Props Configuration](#game-props-configuration)
7. [Caching Strategy](#caching-strategy)
8. [Troubleshooting](#troubleshooting)

## Architecture Overview

The NSSPORTS application uses a **hybrid SDK + database architecture** that follows industry best practices:

### Data Flow

```
SportsGameOdds SDK (Primary Source) 
    ↓
Backend API Routes (Server-side)
    ↓
Intelligent Caching Layer (Prisma + Next.js)
    ↓
Frontend Components
```

### Key Principles

1. **SDK as Source of Truth**: All real-time odds data comes from the official SportsGameOdds SDK
2. **Server-side Only**: API keys are never exposed to the client
3. **Intelligent Caching**: Prisma database provides performance caching (30-60 second TTL)
4. **No Fallback to Stale Data**: If SDK fails, we return errors (no mock/outdated data)

## API Configuration

### Environment Variables

Create a `.env.local` file in the `nssports` directory with the following variables:

```bash
# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/database?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/database"

# NextAuth Configuration
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# SportsGameOdds API Configuration (Primary Provider)
SPORTSGAMEODDS_API_KEY="your-api-key-here"

# Development Data Limiting (Optional)
DEV_GAMES_PER_LEAGUE="3"
DEV_SINGLE_LEAGUE_LIMIT="10"
```

### Getting a SportsGameOdds API Key

1. Visit [SportsGameOdds.com](https://sportsgameodds.com)
2. Sign up for an account
3. Choose a plan (Free tier available for testing)
4. Copy your API key from the dashboard
5. Add it to your `.env.local` file

### Supported Plans

- **Free Tier**: Limited requests, basic markets
- **Pro**: More requests, advanced markets
- **AllStar**: Unlimited requests, real-time streaming, all prop markets

## Sports and Leagues Setup

### Default Supported Leagues

The application is pre-configured to support three major leagues:

1. **NBA** (National Basketball Association)
2. **NFL** (National Football League)
3. **NHL** (National Hockey League)

### API Endpoint: `/api/sports`

This endpoint returns all available sports and their leagues.

**Response Format:**
```json
[
  {
    "id": "basketball",
    "name": "Basketball",
    "icon": "🏀",
    "leagues": [
      {
        "id": "nba",
        "name": "NBA",
        "sportId": "basketball",
        "logo": "/logos/nba.svg",
        "games": []
      }
    ]
  }
]
```

### Fallback Configuration

If the SDK returns no leagues (e.g., API key issues, off-season), the system uses a default configuration defined in `/src/app/api/sports/route.ts`:

```typescript
const DEFAULT_LEAGUES = [
  { leagueID: 'NBA', name: 'NBA', sport: 'Basketball', active: true },
  { leagueID: 'NFL', name: 'NFL', sport: 'AmericanFootball', active: true },
  { leagueID: 'NHL', name: 'NHL', sport: 'IceHockey', active: true },
];
```

### Adding New Leagues

To support additional leagues:

1. **Update `DEFAULT_LEAGUES`** in `/src/app/api/sports/route.ts`
2. **Add league mapping** in `/src/app/api/matches/route.ts`:
   ```typescript
   const SPORT_TO_LEAGUE_MAP: Record<string, string> = {
     "basketball_nba": "NBA",
     "americanfootball_nfl": "NFL",
     "icehockey_nhl": "NHL",
     // Add your league here
     "baseball_mlb": "MLB",
   };
   ```
3. **Add query parameter enum** in the same file:
   ```typescript
   const QuerySchema = z.object({
     sport: z
       .enum([
         "basketball_nba",
         "americanfootball_nfl",
         "icehockey_nhl",
         "baseball_mlb", // Add here
       ])
       .default("basketball_nba"),
   });
   ```

## Games and Odds Integration

### API Endpoint: `/api/matches`

Fetches games/events for a specific sport with real-time odds.

**Query Parameters:**
- `sport` (required): One of `basketball_nba`, `americanfootball_nfl`, `icehockey_nhl`

**Example Request:**
```
GET /api/matches?sport=basketball_nba
```

**Response Format:**
```json
{
  "data": [
    {
      "id": "event-123",
      "leagueId": "nba",
      "homeTeam": {
        "id": "lakers",
        "name": "Los Angeles Lakers",
        "shortName": "LAL",
        "logo": "/logos/nba/lakers.svg"
      },
      "awayTeam": {
        "id": "warriors",
        "name": "Golden State Warriors",
        "shortName": "GSW",
        "logo": "/logos/nba/warriors.svg"
      },
      "startTime": "2025-10-28T02:00:00Z",
      "status": "upcoming",
      "odds": {
        "spread": {
          "home": { "odds": -110, "line": -2.5 },
          "away": { "odds": -110, "line": 2.5 }
        },
        "moneyline": {
          "home": { "odds": -150 },
          "away": { "odds": 130 }
        },
        "total": {
          "over": { "odds": -110, "line": 225.5 },
          "under": { "odds": -110, "line": 225.5 }
        }
      }
    }
  ],
  "meta": {
    "sport": "basketball_nba",
    "count": 15,
    "cacheDuration": 60
  }
}
```

### Odds Types

1. **Spread (Point Spread)**: Handicap betting
2. **Moneyline**: Win/loss betting
3. **Total (Over/Under)**: Combined score betting

### Data Transformation

The SDK data is transformed using `/src/lib/transformers/sportsgameodds-sdk.ts`:

- Maps SDK event structure to internal format
- Normalizes team data
- Converts odds format
- Filters out finished games (older than 4 hours)

## Player Props Configuration

Player props allow betting on individual player statistics.

### API Endpoint: `/api/matches/[eventId]/player-props`

**Example Request:**
```
GET /api/matches/event-123/player-props
```

**Response Format:**
```json
[
  {
    "id": "prop-123",
    "playerId": "player-lebron",
    "playerName": "LeBron James",
    "position": "F",
    "team": "LAL",
    "statType": "Points",
    "line": 27.5,
    "overOdds": -115,
    "underOdds": -105,
    "category": "scoring",
    "bookmaker": "Consensus"
  }
]
```

### Supported Stat Types

The SDK provides various player prop markets:

1. **Scoring**: Points, Three-Pointers Made
2. **Rebounds**: Total Rebounds, Offensive/Defensive
3. **Assists**: Total Assists
4. **Defense**: Steals, Blocks
5. **Combos**: Points + Rebounds + Assists (PRA)

### How It Works

1. SDK returns event data with `player_*` markets
2. `extractPlayerProps()` in `/src/lib/sportsgameodds-sdk.ts` processes the data
3. Props are grouped by player
4. Over/Under lines are paired together
5. Data is cached in Prisma for 30 seconds

## Game Props Configuration

Game props are non-player-specific betting markets.

### API Endpoint: `/api/matches/[eventId]/game-props`

**Example Request:**
```
GET /api/matches/event-123/game-props
```

**Response Format:**
```json
{
  "first_basket": [
    {
      "id": "market-123",
      "propType": "first_basket",
      "description": "LeBron James",
      "selection": "LeBron James",
      "odds": 650,
      "line": null,
      "bookmaker": "Consensus"
    }
  ],
  "total_threes": [
    {
      "id": "market-124",
      "propType": "total_threes",
      "description": "Over",
      "selection": "Over",
      "odds": -110,
      "line": 24.5,
      "bookmaker": "Consensus"
    }
  ]
}
```

### Supported Prop Types

1. **First Basket Scorer**: Who scores first
2. **Winning Margin**: Point difference ranges
3. **Total Three-Pointers**: Team combined threes
4. **Double-Double/Triple-Double**: Player achievements
5. **Race to X Points**: First team to reach a score
6. **Quarter/Half Props**: Period-specific bets

### How It Works

1. SDK returns event data with various market types
2. `extractGameProps()` filters out main markets and player props
3. Props are grouped by market type
4. Data is cached in Prisma for 30 seconds

## Caching Strategy

### Cache Layers

1. **HTTP Cache (Route Level)**
   - Duration: 60 seconds
   - Applied via route segment config (`revalidate = 60`)
   - Handles CDN/edge caching

2. **Prisma Cache (Database)**
   - Duration: 30 seconds TTL
   - Reduces SDK API calls
   - Provides fast fallback for concurrent requests

3. **SDK Response**
   - Always the source of truth
   - Fetched when cache expires
   - Updates database cache after fetch

### Cache Size Optimization

The `/api/matches` endpoint previously had a cache size error (7.8MB > 2MB Next.js limit).

**Solution Implemented:**
- Removed `unstable_cache` from the route
- Rely on HTTP-level caching via `revalidate` config
- Transform data before caching (reduce payload size)

### Cache Invalidation

Caches automatically expire based on TTL. To manually invalidate:

```typescript
import { revalidateTag } from 'next/cache';

// Invalidate sports/leagues cache
revalidateTag('leagues');

// Invalidate matches cache
revalidateTag('matches');

// Invalidate props cache
revalidateTag('event-player-props');
revalidateTag('event-game-props');
```

## Troubleshooting

### Issue: "No sports available"

**Causes:**
1. Missing or invalid `SPORTSGAMEODDS_API_KEY`
2. Network connectivity issues
3. SDK service temporarily unavailable

**Solutions:**
1. Verify API key in `.env.local`
2. Check API key is valid in SportsGameOdds dashboard
3. System will use fallback default leagues (NBA, NFL, NHL)

### Issue: "Failed to set Next.js data cache" (Cache size error)

**Cause:** Response payload exceeds 2MB Next.js cache limit

**Solution:** Already fixed - removed `unstable_cache` in `/api/matches/route.ts`

### Issue: No games/matches returned

**Causes:**
1. Off-season (no games scheduled)
2. Time filter too restrictive
3. API rate limit exceeded

**Solutions:**
1. Check league schedule
2. Adjust time range in `/src/app/api/matches/route.ts`:
   ```typescript
   const startsAfter = new Date(now.getTime() - 4 * 60 * 60 * 1000); // Adjust
   const startsBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Adjust
   ```
3. Check SportsGameOdds dashboard for rate limits

### Issue: Player/Game props not showing

**Causes:**
1. Event doesn't have prop markets in SDK
2. Plan doesn't include prop markets
3. Props not available yet (too far in advance)

**Solutions:**
1. Verify event has props in SportsGameOdds dashboard
2. Upgrade to Pro/AllStar plan if needed
3. Check props closer to game time

### Issue: Stale odds data

**Causes:**
1. Cache not expiring
2. Database cache serving old data

**Solutions:**
1. Verify TTL settings in `/src/lib/hybrid-cache.ts`
2. Clear database cache:
   ```sql
   DELETE FROM odds WHERE "lastUpdated" < NOW() - INTERVAL '1 minute';
   DELETE FROM player_props WHERE "lastUpdated" < NOW() - INTERVAL '1 minute';
   DELETE FROM game_props WHERE "lastUpdated" < NOW() - INTERVAL '1 minute';
   ```

### Debugging Tips

1. **Check logs**: Look for `[INFO]` and `[ERROR]` messages in console
2. **Monitor API calls**: Watch for "Fetching from SDK" vs "Returning from cache"
3. **Inspect responses**: Use browser DevTools Network tab
4. **Verify database**: Use `npm run db:studio` to inspect cached data
5. **Test SDK directly**: Run `node test-sportsgameodds-api.mjs`

## Best Practices

1. **Always use HTTPS** in production for API calls
2. **Implement rate limiting** to avoid exceeding SDK quotas
3. **Monitor cache hit rates** to optimize TTL values
4. **Log all SDK errors** for debugging
5. **Validate all data** before storing in database
6. **Use TypeScript** for type safety
7. **Keep secrets secure** (never commit `.env.local`)
8. **Test with real API** before deploying
9. **Handle edge cases** (empty responses, API errors)
10. **Document changes** when modifying configurations

## Production Deployment Checklist

- [ ] Valid `SPORTSGAMEODDS_API_KEY` configured
- [ ] Database connection strings verified
- [ ] `NEXTAUTH_SECRET` generated and secure
- [ ] Environment variables set in hosting platform
- [ ] Database migrations applied
- [ ] Seed data loaded (optional)
- [ ] Cache TTL values optimized
- [ ] Error handling tested
- [ ] Rate limiting configured
- [ ] Monitoring/logging enabled
- [ ] CDN configured for static assets
- [ ] CORS settings reviewed
- [ ] API response times acceptable (<500ms)

## Additional Resources

- [SportsGameOdds SDK Documentation](https://sportsgameodds.com/docs/sdk)
- [API Reference](https://sportsgameodds.com/docs/reference)
- [Real-time Streaming Guide](https://sportsgameodds.com/docs/guides/realtime-streaming-api)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Caching Guide](https://nextjs.org/docs/app/building-your-application/caching)

## Support

For issues specific to:
- **NSSPORTS Application**: Open an issue on GitHub
- **SportsGameOdds SDK**: Contact support@sportsgameodds.com
- **Database/Prisma**: Refer to Prisma documentation
- **Next.js**: Refer to Next.js documentation
