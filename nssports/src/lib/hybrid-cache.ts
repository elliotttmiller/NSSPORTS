/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Smart Cache System - PRIMARY Real-Time Data Source
 * 
 * This is the MAIN and ONLY required system for real-time odds/props updates.
 * Uses REST API polling with intelligent TTL-based caching for Pro Plan.
 * 
 * Core Architecture (Pro Plan - REST Polling):
 * - Prisma provides intelligent caching with dynamic TTL based on game timing
 * - SDK REST API is the source of truth, fetched when cache is stale
 * - 300 requests/minute rate limit (using 250/min for safety)
 * - Sub-minute update frequency for live games
 * 
 * Data Flow (Every Single Request):
 * 1. Check Prisma cache with smart TTL
 * 2. If fresh (within TTL): Return cached data immediately
 * 3. If stale (expired TTL): Fetch fresh data from SDK REST API
 * 4. Update cache with new data
 * 5. Return real-time data to frontend
 * 
 * Smart TTL Strategy (Automatic Based on Game Timing):
 * - LIVE games: 15s TTL (sub-minute updates for in-game odds)
 * - Games starting within 1 hour: 30s TTL (line movements accelerate near kickoff)
 * - Games starting 1-24 hours: 45s TTL (moderate market activity)
 * - Games starting 24+ hours: 60s TTL (odds relatively stable)
 * 
 * Why This Works Perfectly for Pro Plan:
 * - Sub-minute updates for live games (15s polling)
 * - 300 req/min allows ~20 concurrent live games at 15s intervals
 * - Efficient rate limit usage with smart TTL scaling
 * - Critical window (<1hr): Users get freshest data when it matters most
 * - Active window (1-24hr): Balanced freshness + performance
 * - Far future (24hr+): Optimized performance, odds are stable anyway
 * 
 * Note: Using `any` types for SDK responses as the sports-odds-api package
 * doesn't export proper TypeScript types. This is acceptable for external API data.
 */

import prisma from './prisma';
import { logger } from './logger';
import {
  getEvents as sdkGetEvents,
  getPlayerProps as sdkGetPlayerProps,
  getGameProps as sdkGetGameProps,
} from './sportsgameodds-sdk';

// Cache TTL in seconds - optimized for development/testing
/**
 * Smart Cache TTL Strategy - Pro Plan REST Polling Optimization
 * 
 * This TTL system powers real-time updates via REST API polling (Pro Plan).
 * Every request flows through this logic to determine data freshness automatically.
 * 
 * HOW IT WORKS:
 * 1. Every API request checks: "Is cached data still fresh?"
 * 2. Fresh = within TTL → Return immediately (microseconds response)
 * 3. Stale = expired TTL → Fetch from SDK REST API, update cache, return
 * 4. Result: Sub-minute real-time updates with optimal rate limit usage
 * 
 * TTL VALUES (Optimized for Pro Plan - 300 req/min):
 * 
 * LIVE GAMES (Game in progress):
 * - TTL: 15 seconds (sub-minute updates)
 * - Why: In-game odds change rapidly, Pro plan allows frequent polling
 * - Rate limit: ~4 req/min per game (well within 300/min for 20+ concurrent games)
 * 
 * CRITICAL WINDOW (Game starts in < 1 hour):
 * - TTL: 30 seconds  
 * - Why: Line movements accelerate as kickoff approaches
 * - Rate limit: ~2 req/min per game (efficient for pre-game rush)
 * 
 * ACTIVE WINDOW (Game starts in 1-24 hours):
 * - TTL: 45 seconds
 * - Why: Moderate betting activity, odds still moving
 * - Rate limit: ~1.3 req/min per game (balanced freshness + efficiency)
 * 
 * FAR FUTURE (Game starts in 24+ hours):
 * - TTL: 60 seconds
 * - Why: Odds relatively stable, lower betting volume
 * - Rate limit: ~1 req/min per game (optimized for many future games)
 * 
 * KEY INSIGHT: Pro Plan sub-minute update frequency means we can poll more
 * aggressively than previous 10s/30s/60s/120s strategy. New values provide
 * better real-time experience while staying well within 300 req/min limit.
 */
const CACHE_TTL = {
  live: 15,        // Live games - sub-minute updates for Pro plan
  critical: 30,    // <1hr to start - line movements accelerate
  active: 45,      // 1-24hr to start - moderate market activity  
  standard: 60,    // 24hr+ to start - stable odds
};

/**
 * Calculate dynamic TTL based on game start time and live status
 * Returns appropriate cache duration in seconds
 * 
 * Pro Plan Strategy: Use REST polling with smart TTL for sub-minute updates
 * Live games poll every 15s, upcoming games scale based on start time
 */
function getSmartCacheTTL(startTime: Date, isLive?: boolean): number {
  const now = new Date();
  const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // EXPLICIT LIVE GAME CHECK (highest priority)
  // Live games get 15s TTL for sub-minute REST polling updates
  if (isLive === true) {
    return CACHE_TTL.live;
  }
  
  // LIVE or already started (time-based fallback)
  // Games that started should use streaming, cache is emergency fallback
  if (hoursUntilStart <= 0) {
    return CACHE_TTL.live;
  }
  
  // CRITICAL WINDOW: < 1 hour to start (pre-game, odds volatile)
  if (hoursUntilStart < 1) {
    return CACHE_TTL.critical;
  }
  
  // ACTIVE WINDOW: 1-24 hours to start (moderate updates)
  if (hoursUntilStart < 24) {
    return CACHE_TTL.active;
  }
  
  // FAR FUTURE: 24+ hours to start (stable odds)
  return CACHE_TTL.standard;
}

/**
 * Fetch events with intelligent caching
 * - Checks cache first for performance
 * - Fetches from SDK if cache miss or stale
 * - Updates cache after SDK fetch
 * - NO fallback logic - only returns fresh SDK data or cached data within TTL
 */
export async function getEventsWithCache(options: {
  leagueID?: string;
  eventIDs?: string | string[];
  oddsAvailable?: boolean;
  oddIDs?: string; // Filter specific markets (e.g., "game-ml,game-ats,game-ou")
  bookmakerID?: string; // Filter specific sportsbooks
  includeOpposingOddIDs?: boolean; // Get both sides of markets (recommended: true)
  live?: boolean;
  finalized?: boolean;
  limit?: number;
  startsAfter?: string;
  startsBefore?: string;
}) {
  // 1. Check cache first for performance (with smart TTL)
  try {
    const cachedEvents = await getEventsFromCache(options);
    if (cachedEvents.length > 0) {
      logger.info(
        `✅ Smart Cache HIT: Returning ${cachedEvents.length} events ` +
        `(dynamic TTL: 30s critical, 60s active, 120s standard)`
      );
      return { data: cachedEvents, source: 'cache' as const };
    }
    logger.info('Smart Cache MISS: Fetching fresh data from SDK');
  } catch (cacheError) {
    logger.warn('Cache check failed, will fetch from SDK', { error: cacheError });
    // Continue to SDK fetch - cache errors shouldn't break the flow
  }
  
  // 2. Fetch from SDK (source of truth)
  logger.info('Fetching events from SDK', options);
  const { data: events } = await sdkGetEvents(options);
  
  // 3. Update Prisma cache for next request (async, non-blocking)
  updateEventsCache(events).catch(error => {
    logger.error('Failed to update events cache', error);
    // Don't throw - cache update failure shouldn't break the response
  });
  
  logger.info(`Fetched ${events.length} events from SDK`);
  return { data: events, source: 'sdk' as const };
}

/**
 * Update events in Prisma cache
 */
async function updateEventsCache(events: any[]) {
  try {
    for (const event of events) {
      // SDK v2 structure: start time in status.startsAt
      const startTimeValue = event.status?.startsAt;
      
      // Skip events without valid data - NO FALLBACKS
      if (!startTimeValue) {
        logger.warn(`Skipping event ${event.eventID} - missing status.startsAt`);
        continue;
      }
      
      if (!event.teams?.home?.teamID || !event.teams?.away?.teamID) {
        logger.warn(`Skipping event ${event.eventID} - missing team data`);
        continue;
      }
      
      const startTime = new Date(startTimeValue);
      
      // Validate the date is valid
      if (isNaN(startTime.getTime())) {
        logger.warn(`Skipping event ${event.eventID} - invalid start time: ${startTimeValue}`);
        continue;
      }
      
      // Extract team data from SDK v2 structure
      const homeTeam = event.teams.home;
      const awayTeam = event.teams.away;
      const leagueId = event.leagueID; // Keep uppercase to match SDK (NBA, NFL, NHL)
      
      // Generate logo paths based on team names (kebab-case)
      // Logo folder is lowercase: /logos/nba/, /logos/nfl/, /logos/nhl/
      const logoFolder = leagueId.toLowerCase();
      const homeTeamSlug = homeTeam.names.long
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const awayTeamSlug = awayTeam.names.long
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Ensure teams exist in database first
      await prisma.team.upsert({
        where: { id: homeTeam.teamID },
        update: {
          name: homeTeam.names.long,
          shortName: homeTeam.names.short,
          logo: `/logos/${logoFolder}/${homeTeamSlug}.svg`,
          record: homeTeam.standings?.record || null,
        },
        create: {
          id: homeTeam.teamID,
          name: homeTeam.names.long,
          shortName: homeTeam.names.short,
          logo: `/logos/${logoFolder}/${homeTeamSlug}.svg`,
          leagueId: leagueId,
          record: homeTeam.standings?.record || null,
        },
      });
      
      await prisma.team.upsert({
        where: { id: awayTeam.teamID },
        update: {
          name: awayTeam.names.long,
          shortName: awayTeam.names.short,
          logo: `/logos/${logoFolder}/${awayTeamSlug}.svg`,
          record: awayTeam.standings?.record || null,
        },
        create: {
          id: awayTeam.teamID,
          name: awayTeam.names.long,
          shortName: awayTeam.names.short,
          logo: `/logos/${logoFolder}/${awayTeamSlug}.svg`,
          leagueId: leagueId,
          record: awayTeam.standings?.record || null,
        },
      });
      
      // Determine game status from SDK status object
      let gameStatus: string;
      if (event.status.live) {
        gameStatus = 'live';
      } else if (event.status.completed || event.status.ended) {
        gameStatus = 'finished';
      } else {
        gameStatus = 'upcoming';
      }
      
      // Upsert game
      await prisma.game.upsert({
        where: { id: event.eventID },
        update: {
          startTime,
          status: gameStatus,
          updatedAt: new Date(),
        },
        create: {
          id: event.eventID,
          leagueId: leagueId,
          homeTeamId: homeTeam.teamID,
          awayTeamId: awayTeam.teamID,
          startTime,
          status: gameStatus,
        },
      });
      
      // Update odds if available
      if (event.odds) {
        await updateOddsCache(event.eventID, event.odds);
      }
    }
  } catch (error) {
    logger.error('Error updating events cache', error);
    // Don't throw - cache update failure shouldn't break the response
  }
}

/**
 * Update odds in Prisma cache
 */
async function updateOddsCache(gameId: string, oddsData: any) {
  try {
    // Delete old odds
    await prisma.odds.deleteMany({ where: { gameId } });
    
    // Insert new odds from SDK structure
    // SDK returns odds as: { "oddID": { fairOdds, fairSpread, fairOverUnder, ... } }
    const oddsToCreate: any[] = [];
    
    if (!oddsData || typeof oddsData !== 'object') {
      logger.warn(`No odds data to cache for game ${gameId}`);
      return;
    }
    
    // Process each odd by oddID
    Object.entries(oddsData).forEach(([oddID, oddData]: [string, any]) => {
      // Skip if not an object or if it's player/game props
      if (!oddData || typeof oddData !== 'object') return;
      
      // CRITICAL: Only process MAIN GAME ODDS (moneyline, spread, total)
      // Must match EXACTLY these patterns to exclude player props, quarter/half odds:
      // - "points-home-game-ml-home" or "points-away-game-ml-away" (moneyline)
      // - "points-home-game-sp-home" or "points-away-game-sp-away" (spread / ATS)
      // - "points-all-game-ou-over" or "points-all-game-ou-under" (game totals)
      // 
      // EXCLUDES:
      // - Player props: "points-PLAYER_ID-game-ou-over" (has player ID instead of home/away/all)
      // - Quarter odds: "points-home-1q-ml-home" (has period ID like 1q, 2q, 1h, 2h)
      // - Half odds: "points-away-1h-sp-away"
      //
      // Official format per docs: https://sportsgameodds.com/docs/data-types/odds
      if (!oddID.includes('-game-')) return;
      
      // Additional check: Must start with "points-home-", "points-away-", or "points-all-"
      // This excludes player props which have player IDs
      const isTeamOdd = oddID.startsWith('points-home-') || 
                        oddID.startsWith('points-away-') || 
                        oddID.startsWith('points-all-');
      
      if (!isTeamOdd) {
        // Silently skip non-team odds (player props, fantasy scores, etc.)
        // These are filtered out to focus on main game betting lines
        return;
      }
      
      // Extract CONSENSUS odds - SDK has already done sophisticated calculation!
      // Per official docs: https://sportsgameodds.com/docs/info/consensus-odds
      // - fairOdds: Most fair odds via linear regression + juice removal
      // - fairSpread/fairOverUnder: Most balanced line across all bookmakers
      // - bookOdds: Most common line (highest data points)
      const oddsValue = oddData.fairOdds || oddData.bookOdds;
      
      // OFFICIAL ALGORITHM IMPLEMENTATION
      // Per docs: "Only positive lines are considered for over-unders and non-zero lines are considered for spreads"
      // If fairSpread returns 0, it means the algorithm excluded zero-spread lines from fair calculation
      // In this case, we MUST use bookSpread (which contains the actual consensus main line from bookmakers)
      let consensusSpread;
      if (oddData.fairSpread !== undefined && oddData.fairSpread !== null) {
        const parsed = parseFloat(String(oddData.fairSpread));
        // Use fairSpread ONLY if non-zero (per official algorithm excludes zero spreads)
        if (!isNaN(parsed) && parsed !== 0) {
          consensusSpread = oddData.fairSpread;
        } else {
          // Fair calculation returned 0 (excluded), use book consensus main line
          consensusSpread = oddData.bookSpread;
        }
      } else {
        consensusSpread = oddData.bookSpread;
      }
      
      // Same for totals: "Only positive lines are considered for over-unders"
      let consensusTotal;
      if (oddData.fairOverUnder !== undefined && oddData.fairOverUnder !== null) {
        const parsed = parseFloat(String(oddData.fairOverUnder));
        // Use fairOverUnder only if positive (per official algorithm)
        if (!isNaN(parsed) && parsed > 0) {
          consensusTotal = oddData.fairOverUnder;
        } else {
          consensusTotal = oddData.bookOverUnder;
        }
      } else {
        consensusTotal = oddData.bookOverUnder;
      }
      
      // CRITICAL: Get the ACTUAL line value from the oddData (what bookmakers are offering)
      // This distinguishes main lines from alternate lines
      const actualSpread = oddData.spread;
      const actualTotal = oddData.overUnder;
      
      // Debug logging for total odds
      if (oddID.includes('-game-ou-')) {
        const isMainTotal = oddID.includes('-all-game-ou-');
        logger.debug(`${isMainTotal ? 'MAIN' : 'TEAM'} Total odd: ${oddID}`, {
          consensusTotal,
          actualTotal,
          oddsValue,
          willStore: isMainTotal,
        });
      }
      
      if (!oddsValue) return; // Skip if no odds available
      
      // Determine bet type and selection from oddID
      // Examples: "points-away-game-ml-away", "points-home-game-sp-home", "points-all-game-ou-over"
      let betType: string;
      let selection: string;
      let line: number | undefined;
      
      if (oddID.includes('-game-ml-')) {
        betType = 'moneyline';
        selection = oddID.includes('-home') ? 'home' : 'away';
        line = undefined; // Moneyline has no line
      } else if (oddID.includes('-game-sp-')) {
        betType = 'spread';
        selection = oddID.includes('-home') ? 'home' : 'away';
        
        // Store the CONSENSUS spread line (SDK's calculated optimal line)
        // Per official docs, fairSpread is the most balanced line via linear regression
        if (consensusSpread !== undefined) {
          line = parseFloat(String(consensusSpread));
        } else if (actualSpread !== undefined) {
          // Fallback to actual if consensus not available
          line = parseFloat(String(actualSpread));
        }
      } else if (oddID.includes('-all-game-ou-')) {
        // CRITICAL: ONLY match "points-all-game-ou-" for MAIN game total
        // Excludes team totals: "points-home-game-ou-" and "points-away-game-ou-"
        // This ensures we only display the consensus game total, not individual team totals
        betType = 'total';
        selection = oddID.includes('-over') ? 'over' : 'under';
        
        // Store the CONSENSUS total line (SDK's calculated optimal line)
        // Per official docs: fairOverUnder is the most balanced line via linear regression
        // This gives us the TRUE main line (e.g., 226) not alternates (115, 117)
        if (consensusTotal !== undefined) {
          line = parseFloat(String(consensusTotal));
        } else if (actualTotal !== undefined) {
          // Fallback to actual if consensus not available
          line = parseFloat(String(actualTotal));
        }
      } else {
        return; // Skip other market types
      }
      
      oddsToCreate.push({
        gameId,
        betType,
        selection,
        odds: parseFloat(String(oddsValue)) || 0,
        line,
        lastUpdated: new Date(),
      });
    });
    
    if (oddsToCreate.length > 0) {
      logger.info(`Caching ${oddsToCreate.length} odds for game ${gameId}`);
      await prisma.odds.createMany({
        data: oddsToCreate,
        skipDuplicates: true,
      });
    } else {
      logger.warn(`No processable odds found for game ${gameId}`);
    }
  } catch (error) {
    logger.error('Error updating odds cache', error);
  }
}

/**
 * Get events from Prisma cache with smart TTL filtering
 * Uses dynamic cache duration based on game start time
 */
async function getEventsFromCache(options: {
  leagueID?: string;
  live?: boolean;
  startsAfter?: string;
  startsBefore?: string;
}) {
  const where: any = {};
  
  if (options.leagueID) {
    // Use uppercase league ID to match SDK and database (NBA, NFL, NHL)
    where.leagueId = options.leagueID;
  }
  
  if (options.live) {
    where.status = 'live';
  }
  
  if (options.startsAfter || options.startsBefore) {
    where.startTime = {};
    if (options.startsAfter) {
      where.startTime.gte = new Date(options.startsAfter);
    }
    if (options.startsBefore) {
      where.startTime.lte = new Date(options.startsBefore);
    }
  }
  
  // Fetch all matching games (we'll filter by smart TTL per game)
  const games = await prisma.game.findMany({
    where,
    include: {
      homeTeam: true,
      awayTeam: true,
      odds: true,
    },
    orderBy: { startTime: 'asc' },
  });
  
  // Apply smart TTL filtering - each game gets its own cache duration
  // CRITICAL: Live games get 10s TTL, upcoming games get 30s-120s based on start time
  const now = new Date();
  const validGames = games.filter(game => {
    const isLive = game.status === 'live';
    const smartTTL = getSmartCacheTTL(game.startTime, isLive);
    const ttlDate = new Date(now.getTime() - smartTTL * 1000);
    
    // Game is valid if it was updated within its smart TTL window
    const isValid = game.updatedAt >= ttlDate;
    
    if (!isValid) {
      const hoursUntilStart = (game.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      logger.debug(
        `Game ${game.id} cache expired (status: ${game.status}, TTL: ${smartTTL}s, hours until start: ${hoursUntilStart.toFixed(1)}h)`
      );
    }
    
    return isValid;
  });
  
  // Transform valid games to SDK format
  return validGames.map(game => ({
    eventID: game.id,
    leagueID: game.leagueId.toUpperCase(),
    commence: game.startTime.toISOString(),
    startTime: game.startTime.toISOString(),
    activity: game.status === 'live' ? 'in_progress' : 
              game.status === 'finished' ? 'final' : 'scheduled',
    // ⭐ CRITICAL: Include status object with startsAt for transformer compatibility
    // The transformer expects status.startsAt (SDK v2 format)
    status: {
      startsAt: game.startTime.toISOString(),
      live: game.status === 'live',
      completed: game.status === 'finished',
      ended: game.status === 'finished',
    },
    teams: {
      home: {
        teamID: game.homeTeamId,
        name: game.homeTeam.name,
      },
      away: {
        teamID: game.awayTeamId,
        name: game.awayTeam.name,
      },
    },
    scores: game.homeScore !== null ? {
      home: game.homeScore,
      away: game.awayScore,
    } : undefined,
    period: game.period,
    clock: game.timeRemaining,
    odds: transformOddsFromCache(game.odds),
  }));
}

/**
 * Transform cached odds to SDK format
 * Returns odds in the new SDK structure: { "oddID": { fairOdds, fairSpread, fairOverUnder, ... } }
 */
function transformOddsFromCache(odds: any[]) {
  const oddsObject: any = {};
  
  odds.forEach(odd => {
    // Reconstruct oddID based on betType and selection
    // Examples: "points-away-game-ml-away", "points-home-game-sp-home", "points-all-game-ou-over"
    let oddID: string;
    
    if (odd.betType === 'moneyline') {
      oddID = `points-${odd.selection}-game-ml-${odd.selection}`;
    } else if (odd.betType === 'spread') {
      oddID = `points-${odd.selection}-game-sp-${odd.selection}`;
    } else if (odd.betType === 'total') {
      oddID = `points-all-game-ou-${odd.selection}`;
    } else {
      return; // Skip unknown types
    }
    
    // Create odds object in SDK format
    oddsObject[oddID] = {
      oddID,
      fairOdds: String(odd.odds), // SDK returns as string
      fairSpread: odd.line != null ? String(odd.line) : undefined,
      fairOverUnder: odd.line != null ? String(odd.line) : undefined,
      bookOdds: String(odd.odds), // Use same value as fallback
      bookSpread: odd.line != null ? String(odd.line) : undefined,
      bookOverUnder: odd.line != null ? String(odd.line) : undefined,
    };
  });
  
  return oddsObject;
}

/**
 * Fetch player props with intelligent caching
 * - Checks cache first for performance
 * - Fetches from SDK if cache miss or stale
 * - Updates cache after SDK fetch
 * - NO fallback logic - only returns fresh SDK data or cached data within TTL
 */
export async function getPlayerPropsWithCache(eventID: string) {
  // 1. Check cache first for performance (with smart TTL)
  try {
    const cachedProps = await getPlayerPropsFromCache(eventID);
    if (cachedProps.length > 0) {
      logger.info(
        `✅ Smart Cache HIT: Returning ${cachedProps.length} player props ` +
        `(dynamic TTL based on game start time)`
      );
      return { data: cachedProps, source: 'cache' as const };
    }
    logger.info('Smart Cache MISS: Fetching fresh player props from SDK');
  } catch (cacheError) {
    logger.warn('Cache check failed for player props, will fetch from SDK', { error: cacheError });
    // Continue to SDK fetch
  }
  
  // 2. Fetch from SDK (source of truth)
  logger.info(`Fetching player props for event ${eventID} from SDK`);
  const props = await sdkGetPlayerProps(eventID);
  
  // 3. Update Prisma cache for next request (async, non-blocking)
  updatePlayerPropsCache(eventID, props).catch(error => {
    logger.error('Failed to update player props cache', error);
    // Don't throw - cache update failure shouldn't break the response
  });
  
  logger.info(`Fetched ${props.length} player props from SDK`);
  return { data: props, source: 'sdk' as const };
}

/**
 * Update player props in Prisma cache
 */
async function updatePlayerPropsCache(gameId: string, props: any[]) {
  try {
    // Delete old props for this game
    await prisma.playerProp.deleteMany({ where: { gameId } });
    
    // Create new props - with validation
    const propsToCreate: any[] = [];
    
    for (const prop of props) {
      // Skip if prop doesn't have required fields
      if (!prop.player || !prop.player.playerID || !prop.player.name || !prop.propType) {
        logger.warn(`Skipping invalid player prop for game ${gameId}:`, prop);
        continue;
      }
      
      // Skip if odds are invalid
      if (typeof prop.overOdds !== 'number' && typeof prop.underOdds !== 'number') {
        logger.warn(`Skipping player prop with no valid odds for game ${gameId}:`, prop);
        continue;
      }
      
      // Skip if player doesn't have a valid teamID
      if (!prop.player.teamID) {
        logger.warn(`Skipping player prop with no teamID for game ${gameId}:`, {
          player: prop.player.name,
          playerId: prop.player.playerID
        });
        continue;
      }
      
      // Ensure team exists first
      try {
        await prisma.team.upsert({
          where: { id: prop.player.teamID },
          update: {},
          create: {
            id: prop.player.teamID,
            name: prop.player.teamID, // Use teamID as name if we don't have the actual name
            shortName: prop.player.teamID,
            logo: '', // Empty logo for now
          },
        });
      } catch (teamError) {
        logger.warn(`Failed to upsert team ${prop.player.teamID}, skipping player`, { error: teamError });
        continue;
      }
      
      // Ensure player exists
      try {
        await prisma.player.upsert({
          where: { id: prop.player.playerID },
          update: {
            name: prop.player.name,
            position: prop.player.position || 'N/A',
          },
          create: {
            id: prop.player.playerID,
            name: prop.player.name,
            teamId: prop.player.teamID,
            position: prop.player.position || 'N/A',
          },
        });
      } catch (playerError) {
        logger.warn(`Failed to upsert player ${prop.player.name}, skipping prop`, { error: playerError });
        continue;
      }
      
      propsToCreate.push({
        gameId,
        playerId: prop.player.playerID,
        statType: prop.propType,
        line: prop.line ?? 0, // Allow 0 as valid line
        overOdds: prop.overOdds ?? 0, // Keep precise odds value (e.g., -110, +125)
        underOdds: prop.underOdds ?? 0, // Keep precise odds value
        category: prop.propType,
        lastUpdated: new Date(),
      });
    }
    
    if (propsToCreate.length > 0) {
      logger.info(`Creating ${propsToCreate.length} valid player props for ${gameId}`);
      await prisma.playerProp.createMany({
        data: propsToCreate,
        skipDuplicates: true,
      });
    } else {
      logger.warn(`No valid player props to create for ${gameId}`);
    }
  } catch (error) {
    logger.error('Error updating player props cache', error);
  }
}

/**
 * Get player props from Prisma cache with smart TTL
 * 
 * CRITICAL: Checks game live status to apply appropriate TTL
 * - Live games: 10s TTL (streaming fallback)
 * - Upcoming games: 30s-120s TTL (based on start time)
 */
async function getPlayerPropsFromCache(gameId: string) {
  // Get game to determine smart TTL based on start time AND live status
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { 
      startTime: true,
      status: true,  // CRITICAL: Check if game is live
    },
  });
  
  if (!game) {
    logger.warn(`Game ${gameId} not found in cache for player props lookup`);
    return [];
  }
  
  // Determine if game is live (use official status or time-based fallback)
  const isLive = game.status === 'live';
  
  // Use smart TTL based on game start time AND live status
  // Live games get 10s TTL (streaming should be primary source)
  // Upcoming games get 30s-120s TTL (based on proximity to start)
  const smartTTL = getSmartCacheTTL(game.startTime, isLive);
  const ttlDate = new Date(Date.now() - smartTTL * 1000);
  
  logger.debug(`Player props cache lookup for ${gameId}`, {
    isLive,
    ttlSeconds: smartTTL,
    status: game.status,
  });
  
  const props = await prisma.playerProp.findMany({
    where: {
      gameId,
      lastUpdated: { gte: ttlDate },
    },
    include: {
      player: {
        include: {
          team: true,
        },
      },
    },
  });
  
  // Transform to SDK format
  return props.map(prop => ({
    propID: prop.id,
    eventID: gameId,
    marketType: `player_${prop.statType}`,
    propType: prop.statType,
    player: {
      playerID: prop.player.id,
      name: prop.player.name,
      teamID: prop.player.teamId,
      position: prop.player.position,
    },
    line: prop.line,
    overOdds: prop.overOdds,
    underOdds: prop.underOdds,
    bookmakerID: 'cached',
    bookmakerName: 'Cached',
    lastUpdated: prop.lastUpdated.toISOString(),
  }));
}

/**
 * Fetch game props with intelligent caching
 * - Checks cache first for performance
 * - Fetches from SDK if cache miss or stale
 * - Updates cache after SDK fetch
 * - NO fallback logic - only returns fresh SDK data or cached data within TTL
 */
export async function getGamePropsWithCache(eventID: string) {
  // 1. Check cache first for performance (with smart TTL)
  try {
    const cachedProps = await getGamePropsFromCache(eventID);
    if (cachedProps.length > 0) {
      logger.info(
        `✅ Smart Cache HIT: Returning ${cachedProps.length} game props ` +
        `(dynamic TTL based on game start time)`
      );
      return { data: cachedProps, source: 'cache' as const };
    }
    logger.info('Smart Cache MISS: Fetching fresh game props from SDK');
  } catch (cacheError) {
    logger.warn('Cache check failed for game props, will fetch from SDK', { error: cacheError });
    // Continue to SDK fetch
  }
  
  // 2. Fetch from SDK (source of truth)
  logger.info(`Fetching game props for event ${eventID} from SDK`);
  const props = await sdkGetGameProps(eventID);
  
  // 3. Update Prisma cache for next request (async, non-blocking)
  updateGamePropsCache(eventID, props).catch(error => {
    logger.error('Failed to update game props cache', error);
    // Don't throw - cache update failure shouldn't break the response
  });
  
  logger.info(`Fetched ${props.length} game props from SDK`);
  return { data: props, source: 'sdk' as const };
}

/**
 * Update game props in Prisma cache
 */
async function updateGamePropsCache(gameId: string, props: any[]) {
  try {
    // Delete old props for this game
    await prisma.gameProp.deleteMany({ where: { gameId } });
    
    // Create new props - with validation to prevent undefined fields
    const propsToCreate: any[] = [];
    
    for (const market of props) {
      // Skip if market doesn't have required fields
      if (!market.marketType || !market.outcomes || !Array.isArray(market.outcomes)) {
        logger.warn(`Skipping invalid market for game ${gameId}:`, market);
        continue;
      }
      
      for (const outcome of market.outcomes) {
        // Skip if outcome doesn't have required fields
        if (!outcome.name || typeof outcome.price !== 'number') {
          logger.warn(`Skipping invalid outcome for game ${gameId}:`, outcome);
          continue;
        }
        
        propsToCreate.push({
          gameId,
          propType: market.marketType,
          description: outcome.name,
          selection: outcome.name,
          odds: outcome.price, // Keep precise odds value (e.g., -110, +125)
          line: outcome.point ?? null, // Allow null for props without lines
          lastUpdated: new Date(),
        });
      }
    }
    
    if (propsToCreate.length > 0) {
      logger.info(`Creating ${propsToCreate.length} valid game props for ${gameId}`);
      await prisma.gameProp.createMany({
        data: propsToCreate,
        skipDuplicates: true,
      });
    } else {
      logger.warn(`No valid game props to create for ${gameId}`);
    }
  } catch (error) {
    logger.error('Error updating game props cache', error);
  }
}

/**
 * Get game props from Prisma cache with smart TTL
 * 
 * CRITICAL: Checks game live status to apply appropriate TTL
 * - Live games: 10s TTL (streaming fallback)
 * - Upcoming games: 30s-120s TTL (based on start time)
 */
async function getGamePropsFromCache(gameId: string) {
  // Get game to determine smart TTL based on start time AND live status
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { 
      startTime: true,
      status: true,  // CRITICAL: Check if game is live
    },
  });
  
  if (!game) {
    logger.warn(`Game ${gameId} not found in cache for game props lookup`);
    return [];
  }
  
  // Determine if game is live (use official status or time-based fallback)
  const isLive = game.status === 'live';
  
  // Use smart TTL based on game start time AND live status
  // Live games get 10s TTL (streaming should be primary source)
  // Upcoming games get 30s-120s TTL (based on proximity to start)
  const smartTTL = getSmartCacheTTL(game.startTime, isLive);
  const ttlDate = new Date(Date.now() - smartTTL * 1000);
  
  logger.debug(`Game props cache lookup for ${gameId}`, {
    isLive,
    ttlSeconds: smartTTL,
    status: game.status,
  });
  
  const props = await prisma.gameProp.findMany({
    where: {
      gameId,
      lastUpdated: { gte: ttlDate },
    },
  });
  
  // Transform to SDK format
  const grouped: Record<string, any> = {};
  
  props.forEach(prop => {
    if (!grouped[prop.propType]) {
      grouped[prop.propType] = {
        marketID: `${gameId}_${prop.propType}`,
        eventID: gameId,
        marketType: prop.propType,
        bookmakerID: 'cached',
        bookmakerName: 'Cached',
        outcomes: [],
        lastUpdated: prop.lastUpdated.toISOString(),
      };
    }
    
    grouped[prop.propType].outcomes.push({
      name: prop.description,
      price: prop.odds,
      point: prop.line,
      type: prop.selection,
    });
  });
  
  return Object.values(grouped);
}
