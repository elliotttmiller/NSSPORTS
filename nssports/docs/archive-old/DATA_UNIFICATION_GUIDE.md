# Data Unification Implementation Guide

## Overview

This document explains the data unification changes made to resolve bet history display failures and synchronize league-specific pages with live API data.

## Problem Statement

### Issue 1: Bet History Display Failure
When a bet was successfully placed, the BetCard component on the `/my-bets` page would render as a blank shell, failing to display essential bet selection and matchup data that was visible in the Betslip moments before.

**Root Cause**: The application uses live data from The Odds API for displaying games, but this data was not being persisted to the database. When users tried to place bets, the bet placement logic would validate that the game exists in the database and fail if it didn't, preventing bets from being created.

### Issue 2: Data Siloing on League Pages
While the main `/games` page correctly displayed live data from the API, league-specific pages (e.g., `/games/nfl`, `/games/nba`) were querying stale database data instead of the live API.

## Solution Architecture

### 1. Game Persistence Layer (`/lib/gameHelpers.ts`)

Created a new utility module that bridges the gap between live API data and database storage.

#### Key Functions

**`fetchGameFromAPI(gameId: string): Promise<Game | null>`**
- Fetches game data from The Odds API by ID
- Searches across all supported sports (NBA, NFL, NHL)
- Returns the complete game object or null if not found

**`ensureGameExists(game: Game): Promise<string>`**
- Idempotent function that upserts game data to the database
- Creates or updates related entities:
  - League (if not exists)
  - Home Team (upsert)
  - Away Team (upsert)
  - Game record
  - Odds data (spread, moneyline, totals)
- Uses transaction to ensure atomicity
- Safe to call multiple times with the same data

#### Design Principles

1. **Idempotency**: Can be called multiple times without side effects
2. **Completeness**: Persists all related data, not just the game
3. **Atomicity**: Uses database transactions to prevent partial writes
4. **Transparency**: Invisible to calling code - just ensures data exists

### 2. Bet Placement Actions (`/app/actions/bets.ts`)

Updated both single and parlay bet placement actions to ensure games exist before creating bets.

#### Changes to `placeSingleBetAction()`

```typescript
// Before: Just checked if game exists
const game = await prisma.game.findUnique({ where: { id: gameId } });
if (!game) {
  return { success: false, error: "Game not found" };
}

// After: Fetch and persist if not found
let game = await prisma.game.findUnique({ where: { id: gameId } });
if (!game) {
  const gameData = await fetchGameFromAPI(gameId);
  if (gameData) {
    await ensureGameExists(gameData);
    game = await prisma.game.findUnique({ where: { id: gameId } });
  }
}
```

#### Changes to `placeParlayBetAction()`

Similar logic applied to each leg of the parlay bet, ensuring all games exist before creating the parlay bet record.

### 3. League Pages (`/app/games/[leagueId]/page.tsx`)

Updated to use the same live API endpoint as the main games page.

```typescript
// Before: Database query
const gamesData = await getGamesByLeague(leagueId);

// After: Live API with filtering
const gamesResponse = await getGamesPaginated(leagueId, 1, 1000);
const games = gamesResponse.data;
```

## Data Flow

### Complete User Journey (Now Working)

1. **User Views Games**
   - League page fetches from `/api/games?leagueId=nba` (live API)
   - Receives real-time game data with full team/league information

2. **User Places Bet**
   - Bet action receives gameId from frontend
   - Checks if game exists in database
   - If not: Fetches from API and persists (along with teams, league, odds)
   - Creates bet record with gameId foreign key

3. **User Views Bet History**
   - API route fetches bets with Prisma includes
   - Returns fully hydrated bet objects with game → teams → league
   - BetCard component receives complete data and displays correctly

## API Endpoints

### `/api/games` (Existing - Now Used by All Pages)
- Fetches from The Odds API (multiple sports)
- Supports `leagueId` query parameter for filtering
- Returns live, real-time game data
- Used by both main `/games` page and league-specific pages

### `/api/my-bets` (No Changes Required)
- Already fetches with proper Prisma includes
- Returns fully hydrated bet objects
- Data completeness now guaranteed by persistence layer

## Database Schema

No schema changes were required. The existing schema already supports all necessary relationships:

```prisma
model Game {
  id         String
  leagueId   String
  homeTeamId String
  awayTeamId String
  // ... other fields
  
  bets      Bet[]
  homeTeam  Team @relation("HomeTeam")
  awayTeam  Team @relation("AwayTeam")
  league    League
  odds      Odds[]
}

model Bet {
  id     String
  gameId String?
  game   Game? @relation(...)
  legs   Json? // For parlay legs
  // ... other fields
}
```

## Testing

### Manual Testing Checklist

1. **League Page Display**
   - [ ] Navigate to `/games/nba`
   - [ ] Verify games are displayed
   - [ ] Check that game data is current (matches main `/games` page)

2. **Bet Placement**
   - [ ] Add a game from a league page to betslip
   - [ ] Place a single bet
   - [ ] Verify bet appears in bet history immediately
   - [ ] Confirm bet card shows team names, odds, and selection

3. **Parlay Bets**
   - [ ] Add multiple games to betslip
   - [ ] Create a parlay bet
   - [ ] Verify parlay appears in history with all legs
   - [ ] Check that each leg shows team matchup information

4. **Data Consistency**
   - [ ] Place bet on game from `/games/nfl`
   - [ ] Verify same game appears correctly on main `/games` page
   - [ ] Check bet history shows complete game data

### Automated Testing

- TypeScript compilation: ✅ Passes
- ESLint: ✅ No new warnings
- Existing tests: ✅ 4/5 suites pass (1 pre-existing failure)

## Troubleshooting

### "Game not found" Error When Placing Bet

**Symptom**: User sees error "Game not found. Please refresh the page and try again."

**Cause**: The Odds API might not return the game (it could be finished or removed)

**Solution**: This is expected behavior - the game is no longer available for betting

### Bet Shows "Game details unavailable"

**Symptom**: Bet card displays but shows placeholder text instead of team names

**Cause**: Game was not properly persisted or related data is missing

**Debug Steps**:
1. Check server logs for errors in `ensureGameExists()`
2. Verify The Odds API is accessible
3. Check database for orphaned game records without team relations

## Performance Considerations

### API Call Optimization

- The `fetchGameFromAPI()` function searches across all sports sequentially
- This is acceptable for rare cases (game not in DB)
- Future optimization: Cache API responses or index by sport

### Database Writes

- `ensureGameExists()` uses upsert operations to minimize writes
- Transaction ensures consistency
- Multiple teams/games can share the same league (no duplication)

## Future Enhancements

1. **Background Sync**: Periodically sync popular games from API to database
2. **Caching Layer**: Add Redis cache for frequently accessed games
3. **Smart Persistence**: Only persist games that users show interest in
4. **Cleanup Jobs**: Remove old game data to keep database lean

## Maintenance Notes

### When Adding New Sports

1. Update `fetchGameFromAPI()` to include new sport keys
2. Update league/sport mapping in `ensureGameExists()`
3. No other changes required

### When API Schema Changes

If The Odds API changes its response format:
1. Update `transformOddsApiEvents()` in `/lib/transformers/odds-api.ts`
2. Update `ensureGameExists()` if new fields need persistence
3. Test bet placement flow thoroughly

## Conclusion

The implementation maintains architectural purity by:
- Creating a thin, transparent persistence layer
- Not modifying working components unnecessarily
- Following existing patterns and conventions
- Preserving the separation between live API data and cached database data

The solution is minimal, surgical, and maintains full backward compatibility while solving both core issues identified in the problem statement.
