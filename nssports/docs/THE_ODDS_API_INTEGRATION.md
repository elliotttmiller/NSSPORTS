# The Odds API Integration

## Overview

This document describes the integration of [The Odds API](https://the-odds-api.com/) into the NSSPORTS application. The integration provides live sports betting odds data for NBA, NFL, and NHL games.

## Architecture

### Security & Abstraction (Protocol I)

The API key is stored server-side only and never exposed to the client:

- **Environment Variable**: `THE_ODDS_API_KEY` in `.env.local` (not committed to git)
- **Validation**: Required environment variable validated by `src/lib/env.ts`
- **Access**: Only accessed in `src/lib/the-odds-api.ts` server-side module
- **Client Protection**: Frontend components only communicate with our internal API routes

### Service Layer (`src/lib/the-odds-api.ts`)

Provides typed functions for all communication with The Odds API:

```typescript
// Get available sports
getSports(): Promise<OddsApiSport[]>

// Get odds for a sport
getOdds(sportKey: string, options?: {...}): Promise<OddsApiEvent[]>

// Get live odds
getLiveOdds(sportKey: string, options?: {...}): Promise<OddsApiEvent[]>
```

Features:
- Zod schema validation for all responses
- Comprehensive error handling with `OddsApiError`
- Type-safe API with TypeScript
- Structured logging

### Data Transformation (Protocol II)

The transformation layer (`src/lib/transformers/odds-api.ts`) converts external API data to our internal format:

- **Decoupling**: External schema changes don't affect our application
- **Validation**: Zod schemas ensure data integrity
- **Mapping**: Converts sport keys (e.g., `basketball_nba` → `nba`)
- **Enrichment**: Generates team IDs, logos, and other metadata

### API Routes (BFF Pattern)

Internal API routes proxy to The Odds API with server-side caching:

#### `/api/games` - Paginated games list
- Query params: `leagueId`, `page`, `limit`, `status`
- Cache: 30 seconds
- Fetches from NBA, NFL, and NHL in parallel

#### `/api/games/live` - Live games
- Cache: 30 seconds
- Filters games that started within last 4 hours

#### `/api/games/upcoming` - Upcoming games
- Cache: 60 seconds
- Returns next 20 upcoming games

#### `/api/matches` - Sport-specific matches
- Query param: `sport` (basketball_nba, americanfootball_nfl, icehockey_nhl)
- Cache: 60 seconds

### Caching Strategy (Protocol III)

Server-side caching minimizes API calls and reduces costs:

- **Technology**: Next.js `unstable_cache` with `revalidate`
- **Cache Duration**: 30-60 seconds based on data freshness needs
- **Cost Optimization**: Prevents redundant API calls within cache window
- **Performance**: Reduces latency by serving cached responses

Cache Configuration:
```typescript
unstable_cache(
  async () => { /* fetch logic */ },
  ['cache-key'],
  {
    revalidate: 30, // seconds
    tags: ['games'],
  }
)
```

### Error Handling (Protocol IV)

Comprehensive error handling ensures application stability:

1. **API Errors**: Caught and logged with context
2. **Authentication Errors**: Returns 503 with user-friendly message
3. **Validation Errors**: Zod catches schema mismatches
4. **Network Errors**: Graceful degradation, no crashes
5. **Client Display**: Error states shown in UI

## Configuration

### Environment Variables

Required variables in `.env.local`:

```bash
# The Odds API
THE_ODDS_API_KEY="your-api-key-here"

# Database (required for other features)
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
# ... other vars
```

### Supported Sports

| League | Sport Key | Status |
|--------|-----------|--------|
| NBA | `basketball_nba` | ✅ Active |
| NFL | `americanfootball_nfl` | ✅ Active |
| NHL | `icehockey_nhl` | ✅ Active |

## Testing

### Unit Tests

- `src/lib/transformers/odds-api.test.ts` - Data transformation
- `src/lib/the-odds-api.test.ts` - API service layer

Run tests:
```bash
npm test
```

### Integration Testing

1. Set `THE_ODDS_API_KEY` in `.env.local`
2. Start development server: `npm run dev`
3. Visit `http://localhost:3000/games`
4. Verify live data appears

### Verifying Security

API key should never appear in client bundles:

```bash
# Build the application
npm run build

# Check if API key is in client bundles (should return nothing)
grep -r "THE_ODDS_API_KEY" .next/static/
```

## Monitoring & Debugging

### Logging

All API calls are logged with structured data:

```typescript
logger.info('Fetching live odds for basketball_nba');
logger.error('The Odds API error', error);
```

In development, logs appear in console. In production, use `LOG_LEVEL=info` to see detailed logs.

### API Usage

Monitor your API quota at https://the-odds-api.com/account/

The Odds API provides:
- Request count
- Remaining quota
- Usage statistics

With current caching (30-60s), a single user browsing will generate minimal API calls.

## Performance Optimization

### Current Strategy

- **Parallel Fetching**: Multiple sports fetched concurrently
- **Aggressive Caching**: 30-60s cache reduces redundant calls
- **Efficient Filtering**: In-memory filtering after cache retrieval
- **Pagination**: Limited result sets sent to client

### Future Improvements

Consider these optimizations if needed:
- Redis cache for distributed caching
- Webhook subscriptions for real-time updates
- Background jobs to pre-warm cache
- CDN caching for static game data

## Troubleshooting

### "Sports data service is temporarily unavailable"

**Cause**: API authentication error or quota exceeded

**Solution**:
1. Verify `THE_ODDS_API_KEY` in `.env.local`
2. Check API quota at https://the-odds-api.com/account/
3. Review server logs for detailed error

### No games showing

**Cause**: No active games for configured sports

**Solution**:
- Verify sports have active games (check The Odds API directly)
- Check server logs for API errors
- Ensure cache hasn't staled during off-season

### Stale data

**Cause**: Cache duration too long

**Solution**:
- Reduce `revalidate` duration in route handlers
- Clear Next.js cache: `rm -rf .next/cache`
- Restart development server

## API Rate Limits

The Odds API has usage quotas. Current configuration:
- Cache: 30-60 seconds
- Multiple sports: 3 parallel requests per cache refresh
- Estimated usage: ~180 requests/hour per active server

Free tier typically includes 500 requests/month. Monitor usage and adjust caching as needed.

## References

- [The Odds API Documentation](https://the-odds-api.com/liveapi/guides/v4/)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Zod Validation](https://zod.dev/)
