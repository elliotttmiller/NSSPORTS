# SportsGameOdds API Integration Guide

## Overview

This document describes the complete integration of the SportsGameOdds.com API into the NSSPORTS application, replacing the previous The Odds API integration.

## What Changed

### Previous Integration (The Odds API)
- **Provider**: The-Odds-API.com
- **API Key**: `THE_ODDS_API_KEY`
- **Coverage**: Basic odds (moneyline, spreads, totals)
- **Limitations**: Limited prop betting support, no historical data

### New Integration (SportsGameOdds)
- **Provider**: SportsGameOdds.com
- **API Key**: `SPORTSGAMEODDS_API_KEY`
- **Coverage**: Comprehensive odds, player props, game props, historical data
- **Benefits**: 
  - 55+ leagues across 25+ sports
  - 80+ sportsbooks
  - Sub-minute data updates
  - Player and game props support
  - Cursor-based pagination
  - Better rate limits

## Getting Started

### 1. Obtain API Key

1. Visit [sportsgameodds.com](https://sportsgameodds.com)
2. Sign up for an account
3. Navigate to your dashboard
4. Copy your API key

### 2. Configure Environment

Add to your `.env.local` file:

```env
# SportsGameOdds API (Required)
SPORTSGAMEODDS_API_KEY="your-api-key-here"

# The Odds API (Deprecated - Optional for backward compatibility)
THE_ODDS_API_KEY="your-old-api-key-here"
```

### 3. Test the Integration

Run the test script to verify your API key works:

```bash
cd nssports
node test-sportsgameodds-api.mjs
```

Expected output:
```
🧪 SportsGameOdds API Integration Test
══════════════════════════════════════════════════
✅ Found X leagues
✅ Found X NBA events
✅ Odds data available
══════════════════════════════════════════════════
✅ All tests passed!
```

## Architecture

### Service Layer (`src/lib/sportsgameodds-api.ts`)

The service layer provides type-safe access to all SportsGameOdds API endpoints:

#### Available Functions

- **`getLeagues(options)`**: Get all available leagues
- **`getEvents(leagueID, options)`**: Get events/games for a league
- **`getOdds(eventIDs, options)`**: Get odds for specific events
- **`getMarkets(eventID)`**: Get available betting markets
- **`getTeams(options)`**: Get team information
- **`getPlayerProps(eventID, options)`**: Get player prop bets
- **`getGameProps(eventID)`**: Get game prop bets

#### Example Usage

```typescript
import { getEvents, getPlayerProps } from '@/lib/sportsgameodds-api';

// Get NBA games for next 7 days
const { data: events, meta } = await getEvents('NBA', {
  startsAfter: new Date().toISOString(),
  startsBefore: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  limit: 50,
});

// Get player props for a specific event
const props = await getPlayerProps(eventId, {
  propType: 'points',
});
```

### Data Transformation (`src/lib/transformers/sportsgameodds-api.ts`)

The transformation layer converts SportsGameOdds API responses to our internal data format:

- Maps league IDs (NBA → nba, NFL → nfl, etc.)
- Extracts and normalizes odds data
- Handles team information and logos
- Determines game status (upcoming, live, finished)

### API Routes Updated

All the following routes now use SportsGameOdds API:

1. **`/api/matches`**: Live matches with odds
2. **`/api/games`**: Paginated games list
3. **`/api/games/live`**: Currently live games
4. **`/api/games/upcoming`**: Upcoming games
5. **`/api/games/league/[leagueId]`**: League-specific games
6. **`/api/sports`**: Available sports and leagues
7. **`/api/player-props`**: Player proposition bets
8. **`/api/game-props`**: Game proposition bets

## API Response Format

SportsGameOdds uses a consistent response format:

```typescript
{
  "status": "success",
  "data": [...],
  "meta": {
    "total": 100,
    "limit": 50,
    "cursor": "abc123",
    "nextCursor": "def456",
    "hasMore": true
  },
  "errors": []
}
```

## Caching Strategy

All API routes implement server-side caching:

- **Matches**: 60 seconds (live data)
- **Games**: 30 seconds (frequent updates)
- **Leagues**: 5 minutes (rarely changes)
- **Props**: 30 seconds (dynamic data)

This reduces API calls and improves performance while maintaining data freshness.

## Error Handling

The integration includes comprehensive error handling:

```typescript
try {
  const events = await getEvents('NBA');
} catch (error) {
  if (error instanceof SportsGameOddsApiError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      // Handle authentication error
    }
    // Handle other API errors
  }
  // Handle unexpected errors
}
```

## Rate Limits

SportsGameOdds API rate limits vary by plan:

- **Free**: 500 requests/day
- **Starter**: 5,000 requests/day
- **Pro**: 50,000 requests/day
- **Enterprise**: Custom limits

Monitor your usage at: https://sportsgameodds.com/dashboard

## Pagination

The API uses cursor-based pagination:

```typescript
let cursor: string | undefined;
let allEvents: Event[] = [];

do {
  const { data, meta } = await getEvents('NBA', {
    limit: 100,
    cursor,
  });
  
  allEvents = allEvents.concat(data);
  cursor = meta?.nextCursor || undefined;
} while (cursor);
```

## Supported Leagues

The integration currently supports:

- **NBA**: Basketball (National Basketball Association)
- **NFL**: American Football (National Football League)
- **NHL**: Ice Hockey (National Hockey League)

Additional leagues can be added by updating the league ID mappings in:
- `src/lib/transformers/sportsgameodds-api.ts`
- API route files

## Backward Compatibility

The integration maintains full backward compatibility:

- All existing API routes work without changes
- Data structures remain the same
- Frontend components require no modifications
- The Odds API can still be used as fallback (if configured)

## Testing

### Unit Tests

Run TypeScript type checking:
```bash
npm run typecheck
```

### Integration Tests

Test the API integration:
```bash
node test-sportsgameodds-api.mjs
```

### End-to-End Tests

Test the full application:
```bash
npm run dev
# Navigate to http://localhost:3000
# Verify games are loading
# Check player props and game props
```

## Troubleshooting

### Issue: API Key Not Found

**Error**: `SPORTSGAMEODDS_API_KEY is not configured`

**Solution**: Add the API key to your `.env.local` file

### Issue: No Games Available

**Possible causes**:
1. Off-season for the league
2. No upcoming games scheduled
3. API rate limit exceeded

**Solution**: Check the SportsGameOdds dashboard for your quota usage

### Issue: Authentication Failed

**Error**: HTTP 401 or 403

**Solution**: 
1. Verify your API key is correct
2. Check if your subscription is active
3. Ensure you haven't exceeded rate limits

## Migration Checklist

- [x] Install dependencies
- [x] Set `SPORTSGAMEODDS_API_KEY` in `.env.local`
- [x] Run test script to verify API key
- [x] Start development server
- [x] Verify games are loading
- [x] Test player props functionality
- [x] Test game props functionality
- [x] Deploy to production
- [x] Update production environment variables
- [ ] Monitor API usage in dashboard
- [ ] Remove deprecated `THE_ODDS_API_KEY` (optional)

## Support and Resources

- **API Documentation**: https://sportsgameodds.com/docs/
- **API Reference**: https://sportsgameodds.apidocumentation.com/reference
- **Dashboard**: https://sportsgameodds.com/dashboard
- **Support**: Contact through the SportsGameOdds website

## Future Enhancements

Potential improvements for the integration:

1. **Additional Leagues**: Add more sports/leagues (e.g., MLB, Soccer)
2. **Live Scores**: Integrate real-time score updates
3. **Historical Data**: Store and display historical odds/results
4. **Consensus Odds**: Show average odds across multiple bookmakers
5. **Odds Movement**: Track and display odds changes over time
6. **Alternative Lines**: Support for alternate spreads/totals

## Conclusion

The SportsGameOdds integration provides a robust, scalable foundation for the NSSPORTS betting platform with comprehensive data coverage, better performance, and enhanced features compared to the previous integration.
