# SportsGameOdds API Integration Guide

## Overview

This document outlines the complete integration of the SportsGameOdds API and SDK into the NSSPORTS platform, replacing the previous theoddsapi implementation.

## Why We Changed

### Previous Implementation (theoddsapi)
- Basic REST API integration
- Limited to simple odds data
- No official SDK support
- Manual data transformation
- No real-time streaming support

### New Implementation (SportsGameOdds)
- **Official SDK**: Uses the `sports-odds-api` npm package
- **Real-time Streaming**: WebSocket support for live odds updates
- **Player Props**: Full player proposition betting support
- **Game Props**: Comprehensive game prop markets
- **Consensus Odds**: Aggregates odds from multiple bookmakers
- **Better Data Structure**: More detailed team, player, and event information

## Architecture

### Core Components

#### 1. SDK Layer (`src/lib/sportsgameodds-sdk.ts`)
The official SDK integration providing:
- `getLeagues()` - Fetch available leagues
- `getEvents()` - Fetch games/events with optional filters
- `getTeams()` - Fetch team information
- `getPlayerProps()` - Fetch player propositions
- `getGameProps()` - Fetch game propositions
- `getStreamConnection()` - Real-time streaming setup

#### 2. Hybrid Cache (`src/lib/hybrid-cache.ts`)
Intelligent caching system that:
- Uses SDK as the source of truth
- Caches data in Prisma/PostgreSQL for performance
- 30-second TTL for real-time accuracy
- Async non-blocking cache updates
- No fallback to stale data

#### 3. Data Transformers (`src/lib/transformers/sportsgameodds-sdk.ts`)
Transform SDK data to internal format:
- `transformSDKEvent()` - Single event transformation
- `transformSDKEvents()` - Batch transformation
- Maps league IDs (NBA, NFL, NHL)
- Extracts and structures odds data
- Handles team logos and metadata

### API Endpoints

#### Games/Events
- `GET /api/games` - Paginated games list (uses SDK via hybrid cache)
- `GET /api/games/live` - Live games only
- `GET /api/games/upcoming` - Upcoming games
- `GET /api/games/league/[leagueId]` - League-specific games

#### Player Props
- `GET /api/player-props?gameId=<id>` - Player props by game ID
- `GET /api/matches/[eventId]/player-props` - Player props for specific event

Returns format:
```typescript
{
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  team: "home" | "away";
  statType: string; // "points", "rebounds", "assists", etc.
  line: number;
  overOdds: number;
  underOdds: number;
  category: string;
  bookmaker: string;
}
```

#### Game Props
- `GET /api/game-props?gameId=<id>` - Game props by game ID
- `GET /api/matches/[eventId]/game-props` - Game props for specific event

Returns format (grouped by propType):
```typescript
{
  [propType: string]: Array<{
    id: string;
    propType: string;
    description: string;
    selection: string;
    odds: number;
    line: number | null;
    bookmaker: string;
  }>
}
```

### Frontend Integration

#### Hooks
- `usePlayerProps(gameId)` - React Query hook for player props
- `useGameProps(gameId)` - React Query hook for game props
- Automatic caching and refetching
- 1-minute stale time, 5-minute garbage collection

#### Components
- `PlayerPropsView` - Display player props with filtering and categories
- `GamePropsView` - Display game props grouped by type
- `ProfessionalGameRow` - Game row with expandable props section
- `PropsDisplay` - Tabbed interface for player/game props

#### Expanded Game Card Layout
The game card in `ProfessionalGameRow` includes:
1. Main odds display (spread, moneyline, total)
2. Expand button to show props
3. Tabbed interface: Player Props | Game Props
4. Lazy loading: Props only fetched when tab is active
5. Filtering and categorization for easy navigation

## SDK Integration Details

### Installation
The SDK is already installed via npm:
```bash
npm install sports-odds-api
```

### Configuration
Set the API key in `.env`:
```env
SPORTSGAMEODDS_API_KEY="your-api-key-here"
```

### Client Initialization
```typescript
import SportsGameOdds from 'sports-odds-api';

const client = new SportsGameOdds({
  apiKeyParam: process.env.SPORTSGAMEODDS_API_KEY,
});
```

### Example Usage

#### Fetch Events
```typescript
import { getEvents } from '@/lib/sportsgameodds-sdk';

const { data: events } = await getEvents({
  leagueID: 'NBA',
  oddsAvailable: true,
  limit: 100,
  startsAfter: new Date().toISOString(),
});
```

#### Fetch Player Props
```typescript
import { getPlayerProps } from '@/lib/sportsgameodds-sdk';

const props = await getPlayerProps('event-id-123', {
  propType: 'points',
});
```

#### Real-time Streaming
```typescript
import { getStreamConnection } from '@/lib/sportsgameodds-sdk';

const stream = await getStreamConnection('events:live', {
  leagueID: 'NBA',
});

// Use with Pusher or WebSocket client
const pusher = new Pusher(stream.pusherKey, stream.pusherOptions);
const channel = pusher.subscribe(stream.channel);
```

## Data Flow

### Game Data Flow
1. User requests games via `/api/games`
2. API route calls `getEventsWithCache()`
3. Hybrid cache checks Prisma for fresh data (TTL < 30s)
4. If cache miss, fetches from SDK
5. Transforms SDK data to internal format
6. Updates cache asynchronously (non-blocking)
7. Returns data to client
8. Frontend renders with React Query caching

### Props Data Flow
1. User expands game card
2. Component activates props tab
3. `usePlayerProps` or `useGameProps` hook triggers
4. Fetches from `/api/matches/[eventId]/player-props`
5. API route uses SDK functions
6. Transforms to frontend format
7. React Query caches the response
8. Component displays filtered/grouped props

## Migration Checklist

- [x] Install sports-odds-api SDK package
- [x] Create SDK integration layer (`sportsgameodds-sdk.ts`)
- [x] Implement hybrid caching system
- [x] Create data transformers
- [x] Update API routes to use SDK
- [x] Implement player props endpoints
- [x] Implement game props endpoints
- [x] Create frontend hooks
- [x] Create props display components
- [x] Wire up expanded game card layout
- [x] Replace theoddsapi usage in `gameHelpers.ts`
- [x] Update environment variable configuration
- [x] Update documentation

## Testing the Integration

### Manual Testing

#### 1. Check Games Endpoint
```bash
curl http://localhost:3000/api/games?limit=5
```

Expected: List of games with odds data

#### 2. Check Player Props
```bash
curl http://localhost:3000/api/matches/[eventId]/player-props
```

Expected: Array of player props with odds

#### 3. Check Game Props
```bash
curl http://localhost:3000/api/matches/[eventId]/game-props
```

Expected: Grouped game props by type

#### 4. Visual Testing
1. Navigate to games page
2. Click expand button on any game card
3. Verify "Player Props" tab displays player propositions
4. Switch to "Game Props" tab
5. Verify game propositions display correctly

## API Documentation References

- **SDK Documentation**: https://sportsgameodds.com/docs/sdk
- **API Explorer**: https://sportsgameodds.com/docs/explorer
- **Real-time Streaming**: https://sportsgameodds.com/docs/guides/realtime-streaming-api
- **Markets Guide**: https://sportsgameodds.com/docs/data-types/markets
- **Migration Guide**: https://sportsgameodds.com/docs/info/v1-to-v2

## Performance Considerations

### Caching Strategy
- **API Level**: 30-second revalidation
- **React Query**: 1-minute stale time
- **Prisma Cache**: Stores recent data for performance
- **Next.js**: `unstable_cache` for route-level caching

### Optimization Tips
1. **Lazy Loading**: Props only fetched when user expands game
2. **Conditional Fetching**: Only fetch active tab data
3. **Batching**: Fetch multiple events in single request
4. **Pagination**: Use limit/cursor for large datasets
5. **Parallel Requests**: Fetch multiple leagues simultaneously

## Troubleshooting

### Common Issues

#### "API key not configured" error
- Check `.env` file has `SPORTSGAMEODDS_API_KEY`
- Restart dev server after adding env var

#### No props data returned
- Verify event ID is correct
- Check if event has odds data (`oddsAvailable: true`)
- Some events may not have prop markets available

#### Cache issues
- Cache TTL is 30 seconds
- Force refresh by restarting server
- Check Prisma connection for cache storage

## Future Enhancements

### Potential Improvements
1. **Real-time Streaming**: Implement WebSocket updates for live odds
2. **More Markets**: Add additional prop types and exotic markets
3. **Consensus Odds**: Display aggregated odds from multiple bookmakers
4. **Historical Data**: Store and display odds movement over time
5. **Push Notifications**: Alert users to significant odds changes

## Legacy Code

### Deprecated Files (Can be removed)
- `src/lib/the-odds-api.ts` - Old API integration
- `src/lib/transformers/odds-api.ts` - Old data transformer
- `src/lib/the-odds-api.test.ts` - Old tests
- `src/lib/transformers/odds-api.test.ts` - Old transformer tests

These files are no longer used but kept for reference. They can be safely deleted in a cleanup PR.

## Conclusion

The SportsGameOdds integration provides a robust, scalable foundation for sports betting features. The official SDK, hybrid caching, and comprehensive prop support enable rich user experiences while maintaining performance and reliability.

For questions or issues, refer to the official documentation links above or consult the inline code documentation.
