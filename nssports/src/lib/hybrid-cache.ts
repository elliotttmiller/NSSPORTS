/**
 * Hybrid SDK + Prisma Caching Service
 * 
 * Architecture:
 * - SDK is the ONLY source of truth for real-time odds
 * - Prisma provides intelligent performance caching ONLY
 * - Database stores user-specific data (bets, preferences, history)
 * - NO fallback logic - if SDK fails, request fails (no mock/stale data)
 * 
 * Flow:
 * 1. Check cache (Prisma) - if fresh, return from cache
 * 2. If cache miss or stale, fetch from SDK
 * 3. Update cache (Prisma) - store for next request
 * 4. Return SDK data - always real-time, never fallback
 */

import prisma from './prisma';
import { logger } from './logger';
import {
  getEvents as sdkGetEvents,
  getPlayerProps as sdkGetPlayerProps,
  getGameProps as sdkGetGameProps,
} from './sportsgameodds-sdk';

// Cache TTL in seconds
const CACHE_TTL = {
  events: 30, // 30 seconds for events/games
  odds: 30, // 30 seconds for odds
  playerProps: 30, // 30 seconds for player props
  gameProps: 30, // 30 seconds for game props
};

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
  live?: boolean;
  finalized?: boolean;
  limit?: number;
  startsAfter?: string;
  startsBefore?: string;
}) {
  // 1. Check cache first for performance
  try {
    const cachedEvents = await getEventsFromCache(options);
    if (cachedEvents.length > 0) {
      logger.info(`Returning ${cachedEvents.length} events from cache (within TTL)`);
      return { data: cachedEvents, source: 'cache' as const };
    }
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
      // Upsert game
      await prisma.game.upsert({
        where: { id: event.eventID },
        update: {
          startTime: new Date(event.commence || event.startTime),
          status: event.activity === 'in_progress' ? 'live' : 
                  event.activity === 'final' ? 'finished' : 'upcoming',
          homeScore: event.scores?.home,
          awayScore: event.scores?.away,
          period: event.period,
          timeRemaining: event.clock,
          updatedAt: new Date(),
        },
        create: {
          id: event.eventID,
          leagueId: event.leagueID.toLowerCase(),
          homeTeamId: event.teams?.home?.teamID || `${event.leagueID}-home`,
          awayTeamId: event.teams?.away?.teamID || `${event.leagueID}-away`,
          startTime: new Date(event.commence || event.startTime),
          status: event.activity === 'in_progress' ? 'live' : 
                  event.activity === 'final' ? 'finished' : 'upcoming',
          homeScore: event.scores?.home,
          awayScore: event.scores?.away,
          period: event.period,
          timeRemaining: event.clock,
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
    
    // Insert new odds
    const oddsToCreate: any[] = [];
    
    Object.entries(oddsData).forEach(([marketType, bookmakerOdds]: [string, any]) => {
      if (!Array.isArray(bookmakerOdds)) return;
      
      // Take first bookmaker's odds (can be enhanced to store multiple)
      const bookmaker = bookmakerOdds[0];
      if (!bookmaker?.outcomes) return;
      
      bookmaker.outcomes.forEach((outcome: any) => {
        oddsToCreate.push({
          gameId,
          betType: marketType,
          selection: outcome.name,
          odds: Math.round(outcome.price),
          line: outcome.point,
          lastUpdated: new Date(),
        });
      });
    });
    
    if (oddsToCreate.length > 0) {
      await prisma.odds.createMany({
        data: oddsToCreate,
        skipDuplicates: true,
      });
    }
  } catch (error) {
    logger.error('Error updating odds cache', error);
  }
}

/**
 * Get events from Prisma cache
 */
async function getEventsFromCache(options: {
  leagueID?: string;
  live?: boolean;
  startsAfter?: string;
  startsBefore?: string;
}) {
  const where: any = {};
  
  if (options.leagueID) {
    where.leagueId = options.leagueID.toLowerCase();
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
  
  // Only return recently updated games (within TTL)
  const ttlDate = new Date(Date.now() - CACHE_TTL.events * 1000);
  where.updatedAt = { gte: ttlDate };
  
  const games = await prisma.game.findMany({
    where,
    include: {
      homeTeam: true,
      awayTeam: true,
      odds: true,
    },
    orderBy: { startTime: 'asc' },
  });
  
  // Transform to SDK format
  return games.map(game => ({
    eventID: game.id,
    leagueID: game.leagueId.toUpperCase(),
    commence: game.startTime.toISOString(),
    startTime: game.startTime.toISOString(),
    activity: game.status === 'live' ? 'in_progress' : 
              game.status === 'finished' ? 'final' : 'scheduled',
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
 */
function transformOddsFromCache(odds: any[]) {
  const grouped: any = {};
  
  odds.forEach(odd => {
    if (!grouped[odd.betType]) {
      grouped[odd.betType] = [];
    }
    
    // Group by bet type
    const existing = grouped[odd.betType][0];
    if (!existing) {
      grouped[odd.betType].push({
        bookmakerID: 'cached',
        bookmakerName: 'Cached',
        outcomes: [{
          name: odd.selection,
          price: odd.odds,
          point: odd.line,
        }],
        lastUpdated: odd.lastUpdated.toISOString(),
      });
    } else {
      existing.outcomes.push({
        name: odd.selection,
        price: odd.odds,
        point: odd.line,
      });
    }
  });
  
  return grouped;
}

/**
 * Fetch player props with intelligent caching
 * - Checks cache first for performance
 * - Fetches from SDK if cache miss or stale
 * - Updates cache after SDK fetch
 * - NO fallback logic - only returns fresh SDK data or cached data within TTL
 */
export async function getPlayerPropsWithCache(eventID: string) {
  // 1. Check cache first for performance
  try {
    const cachedProps = await getPlayerPropsFromCache(eventID);
    if (cachedProps.length > 0) {
      logger.info(`Returning ${cachedProps.length} player props from cache (within TTL)`);
      return { data: cachedProps, source: 'cache' as const };
    }
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
    
    // Create new props
    const propsToCreate: any[] = [];
    
    for (const prop of props) {
      // Ensure player exists
      await prisma.player.upsert({
        where: { id: prop.player.playerID },
        update: {
          name: prop.player.name,
          position: prop.player.position || 'N/A',
        },
        create: {
          id: prop.player.playerID,
          name: prop.player.name,
          teamId: prop.player.teamID || 'unknown',
          position: prop.player.position || 'N/A',
        },
      });
      
      propsToCreate.push({
        gameId,
        playerId: prop.player.playerID,
        statType: prop.propType,
        line: prop.line || 0,
        overOdds: Math.round(prop.overOdds || 0),
        underOdds: Math.round(prop.underOdds || 0),
        category: prop.propType,
        lastUpdated: new Date(),
      });
    }
    
    if (propsToCreate.length > 0) {
      await prisma.playerProp.createMany({
        data: propsToCreate,
        skipDuplicates: true,
      });
    }
  } catch (error) {
    logger.error('Error updating player props cache', error);
  }
}

/**
 * Get player props from Prisma cache
 */
async function getPlayerPropsFromCache(gameId: string) {
  const ttlDate = new Date(Date.now() - CACHE_TTL.playerProps * 1000);
  
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
  // 1. Check cache first for performance
  try {
    const cachedProps = await getGamePropsFromCache(eventID);
    if (cachedProps.length > 0) {
      logger.info(`Returning ${cachedProps.length} game props from cache (within TTL)`);
      return { data: cachedProps, source: 'cache' as const };
    }
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
    
    // Create new props
    const propsToCreate: any[] = [];
    
    for (const market of props) {
      for (const outcome of market.outcomes || []) {
        propsToCreate.push({
          gameId,
          propType: market.marketType,
          description: outcome.name,
          selection: outcome.name,
          odds: Math.round(outcome.price || 0),
          line: outcome.point,
          lastUpdated: new Date(),
        });
      }
    }
    
    if (propsToCreate.length > 0) {
      await prisma.gameProp.createMany({
        data: propsToCreate,
        skipDuplicates: true,
      });
    }
  } catch (error) {
    logger.error('Error updating game props cache', error);
  }
}

/**
 * Get game props from Prisma cache
 */
async function getGamePropsFromCache(gameId: string) {
  const ttlDate = new Date(Date.now() - CACHE_TTL.gameProps * 1000);
  
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
