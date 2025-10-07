/**
 * Game Helpers
 * 
 * Utilities for ensuring game data exists in the database.
 * This is needed because the frontend uses live API data that may not be persisted yet.
 */

import prisma from "@/lib/prisma";
import type { Game } from "@/types";
import { getOdds } from "@/lib/the-odds-api";
import { transformOddsApiEvents } from "@/lib/transformers/odds-api";
import { logger } from "@/lib/logger";

/**
 * Fetches a game from The Odds API by ID
 * @param gameId - The game ID to fetch
 * @returns The game data or null if not found
 */
export async function fetchGameFromAPI(gameId: string): Promise<Game | null> {
  try {
    // The gameId format from The Odds API is typically the event ID
    // We need to fetch all games and find the matching one
    // This is a simplified approach - in production, you might want more efficient caching
    
    const sports = ['basketball_nba', 'americanfootball_nfl', 'icehockey_nhl'];
    
    for (const sport of sports) {
      try {
        const events = await getOdds(sport, {
          regions: 'us',
          markets: 'h2h,spreads,totals',
          oddsFormat: 'american',
        });
        
        const games = transformOddsApiEvents(events);
        const game = games.find(g => g.id === gameId);
        
        if (game) {
          return game;
        }
      } catch (error) {
        logger.warn(`Failed to fetch ${sport} games for game lookup`, { error });
        // Continue to next sport
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Error fetching game from API', { gameId, error });
    return null;
  }
}

/**
 * Ensures a game and its related data (teams, league) exist in the database.
 * If the game doesn't exist, it creates it along with any missing teams or league.
 * This is idempotent - safe to call multiple times with the same data.
 * 
 * @param game - The game data from the frontend/API
 * @returns The game ID that was ensured/created
 */
export async function ensureGameExists(game: Game): Promise<string> {
  // Check if game already exists
  const existingGame = await prisma.game.findUnique({
    where: { id: game.id },
    select: { id: true },
  });

  if (existingGame) {
    return existingGame.id;
  }

  // Game doesn't exist, need to create it with all related data
  // Use a transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    // Ensure league exists
    await tx.league.upsert({
      where: { id: game.leagueId },
      create: {
        id: game.leagueId,
        name: game.leagueId.toUpperCase(), // Fallback name
        sportId: game.leagueId === 'nba' ? 'basketball' : 
                 game.leagueId === 'nfl' ? 'football' : 
                 game.leagueId === 'nhl' ? 'hockey' : 'other',
        logo: '', // Will be populated by other means
      },
      update: {}, // No update needed if it exists
    });

    // Ensure home team exists
    await tx.team.upsert({
      where: { id: game.homeTeam.id },
      create: {
        id: game.homeTeam.id,
        name: game.homeTeam.name,
        shortName: game.homeTeam.shortName,
        logo: game.homeTeam.logo || '',
        record: game.homeTeam.record,
        leagueId: game.leagueId,
      },
      update: {
        name: game.homeTeam.name,
        shortName: game.homeTeam.shortName,
        logo: game.homeTeam.logo || '',
        record: game.homeTeam.record,
      },
    });

    // Ensure away team exists
    await tx.team.upsert({
      where: { id: game.awayTeam.id },
      create: {
        id: game.awayTeam.id,
        name: game.awayTeam.name,
        shortName: game.awayTeam.shortName,
        logo: game.awayTeam.logo || '',
        record: game.awayTeam.record,
        leagueId: game.leagueId,
      },
      update: {
        name: game.awayTeam.name,
        shortName: game.awayTeam.shortName,
        logo: game.awayTeam.logo || '',
        record: game.awayTeam.record,
      },
    });

    // Create the game
    await tx.game.create({
      data: {
        id: game.id,
        leagueId: game.leagueId,
        homeTeamId: game.homeTeam.id,
        awayTeamId: game.awayTeam.id,
        startTime: new Date(game.startTime),
        status: game.status,
        venue: game.venue,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        period: game.period,
        timeRemaining: game.timeRemaining,
      },
    });

    // Create odds if they exist
    if (game.odds) {
      const oddsToCreate = [];

      // Spread odds
      if (game.odds.spread?.home?.odds) {
        oddsToCreate.push({
          gameId: game.id,
          betType: 'spread',
          selection: 'home',
          odds: Math.round(game.odds.spread.home.odds),
          line: game.odds.spread.home.line,
        });
      }
      if (game.odds.spread?.away?.odds) {
        oddsToCreate.push({
          gameId: game.id,
          betType: 'spread',
          selection: 'away',
          odds: Math.round(game.odds.spread.away.odds),
          line: game.odds.spread.away.line,
        });
      }

      // Moneyline odds
      if (game.odds.moneyline?.home?.odds) {
        oddsToCreate.push({
          gameId: game.id,
          betType: 'moneyline',
          selection: 'home',
          odds: Math.round(game.odds.moneyline.home.odds),
          line: null,
        });
      }
      if (game.odds.moneyline?.away?.odds) {
        oddsToCreate.push({
          gameId: game.id,
          betType: 'moneyline',
          selection: 'away',
          odds: Math.round(game.odds.moneyline.away.odds),
          line: null,
        });
      }

      // Total odds
      if (game.odds.total?.home?.odds) {
        oddsToCreate.push({
          gameId: game.id,
          betType: 'total',
          selection: 'over',
          odds: Math.round(game.odds.total.home.odds),
          line: game.odds.total.home.line,
        });
      }
      if (game.odds.total?.away?.odds) {
        oddsToCreate.push({
          gameId: game.id,
          betType: 'total',
          selection: 'under',
          odds: Math.round(game.odds.total.away.odds),
          line: game.odds.total.away.line,
        });
      }

      // Create all odds at once
      if (oddsToCreate.length > 0) {
        await tx.odds.createMany({
          data: oddsToCreate,
          skipDuplicates: true,
        });
      }
    }
  });

  return game.id;
}
