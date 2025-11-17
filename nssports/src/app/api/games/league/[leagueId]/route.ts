import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { getEventsWithCache } from '@/lib/hybrid-cache';
import { transformSDKEvents } from '@/lib/transformers/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { applySingleLeagueLimit } from '@/lib/devDataLimit';
import type { ExtendedSDKEvent } from '@/lib/transformers/sportsgameodds-sdk';

export const revalidate = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Map internal/URL league IDs to SportsGameOdds SDK league IDs
 * Allows lowercase URLs to map to SDK format (uppercase)
 * Supports all sports: Basketball, Football, Hockey, Soccer, MMA, Boxing, Golf, Horse Racing
 */
const LEAGUE_ID_TO_API: Record<string, string> = {
  // Basketball
  'nba': 'NBA',
  'ncaab': 'NCAAB',
  'wnba': 'WNBA',
  'NBA': 'NBA',
  'NCAAB': 'NCAAB',
  'WNBA': 'WNBA',
  
  // Football
  'nfl': 'NFL',
  'ncaaf': 'NCAAF',
  'NFL': 'NFL',
  'NCAAF': 'NCAAF',
  
  // Hockey
  'nhl': 'NHL',
  'NHL': 'NHL',
  
  // Soccer
  'epl': 'EPL',
  'la_liga': 'LA_LIGA',
  'laliga': 'LA_LIGA',
  'bundesliga': 'BUNDESLIGA',
  'it_serie_a': 'IT_SERIE_A',
  'seriea': 'IT_SERIE_A',
  'fr_ligue_1': 'FR_LIGUE_1',
  'ligue1': 'FR_LIGUE_1',
  'mls': 'MLS',
  'liga_mx': 'LIGA_MX',
  'ligamx': 'LIGA_MX',
  'uefa_champions_league': 'UEFA_CHAMPIONS_LEAGUE',
  'uefa': 'UEFA_CHAMPIONS_LEAGUE',
  'uefa_europa_league': 'UEFA_EUROPA_LEAGUE',
  'br_serie_a': 'BR_SERIE_A',
  'international_soccer': 'INTERNATIONAL_SOCCER',
  'EPL': 'EPL',
  'LA_LIGA': 'LA_LIGA',
  'LALIGA': 'LA_LIGA',
  'BUNDESLIGA': 'BUNDESLIGA',
  'IT_SERIE_A': 'IT_SERIE_A',
  'SERIEA': 'IT_SERIE_A',
  'FR_LIGUE_1': 'FR_LIGUE_1',
  'LIGUE1': 'FR_LIGUE_1',
  'MLS': 'MLS',
  'LIGA_MX': 'LIGA_MX',
  'UEFA_CHAMPIONS_LEAGUE': 'UEFA_CHAMPIONS_LEAGUE',
  'UEFA': 'UEFA_CHAMPIONS_LEAGUE',
  'UEFA_EUROPA_LEAGUE': 'UEFA_EUROPA_LEAGUE',
  'BR_SERIE_A': 'BR_SERIE_A',
  'INTERNATIONAL_SOCCER': 'INTERNATIONAL_SOCCER',
  
  // MMA
  'ufc': 'UFC',
  'bellator': 'BELLATOR',
  'pfl': 'PFL',
  'one_championship': 'ONE_CHAMPIONSHIP',
  'UFC': 'UFC',
  'BELLATOR': 'BELLATOR',
  'PFL': 'PFL',
  'ONE_CHAMPIONSHIP': 'ONE_CHAMPIONSHIP',
  
  // Boxing
  'boxing': 'BOXING',
  'BOXING': 'BOXING',
  
  // Golf
  'pga_men': 'PGA_MEN',
  'pga': 'PGA_MEN',
  'pga_women': 'PGA_WOMEN',
  'lpga': 'PGA_WOMEN',
  'liv_tour': 'LIV_TOUR',
  'liv': 'LIV_TOUR',
  'dp_world_tour': 'DP_WORLD_TOUR',
  'PGA_MEN': 'PGA_MEN',
  'PGA': 'PGA_MEN',
  'PGA_WOMEN': 'PGA_WOMEN',
  'LPGA': 'PGA_WOMEN',
  'LIV_TOUR': 'LIV_TOUR',
  'LIV': 'LIV_TOUR',
  'DP_WORLD_TOUR': 'DP_WORLD_TOUR',
  
  // Horse Racing
  'horse_racing': 'HORSE_RACING',
  'HORSE_RACING': 'HORSE_RACING',
  
  // Tennis
  'atp': 'ATP',
  'wta': 'WTA',
  'itf': 'ITF',
  'ATP': 'ATP',
  'WTA': 'WTA',
  'ITF': 'ITF',
};

export async function GET(
  request: Request,
  context: { params: Promise<{ leagueId: string }> }
) {
  return withErrorHandling(async () => {
    const { leagueId } = await context.params;

    try {
      logger.info(`Fetching games for league ${leagueId} using hybrid cache`);
      
      // Map league ID to SDK format (NBA, NFL, NHL)
      const apiLeagueId = LEAGUE_ID_TO_API[leagueId] || leagueId.toUpperCase();
      
      // Define time range
      const now = new Date();
      const startsAfter = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago
      const startsBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      // Use hybrid cache (Prisma + SDK)
      // Use main lines with proper oddID format for 50-90% payload reduction
      const response = await getEventsWithCache({
        leagueID: apiLeagueId,
        startsAfter: startsAfter.toISOString(),
        startsBefore: startsBefore.toISOString(),
        oddsAvailable: true,
        oddIDs: 'game-ml,game-ats,game-ou', // Main lines: moneyline, spread, total
        includeOpposingOddIDs: true, // Get both sides of each market
        limit: 100,
      });
      
      const events = response.data;
      logger.info(`Fetched ${events.length} events for league ${leagueId} (source: ${response.source})`);
      
      // Transform events using official SDK status fields
      // Events from cache/SDK match ExtendedSDKEvent structure
      let transformedGames = await transformSDKEvents(events as ExtendedSDKEvent[]);
      
      // ⭐ Filter out finished games (never send to frontend)
      const beforeFilter = transformedGames.length;
      transformedGames = transformedGames.filter(game => game.status !== 'finished');
      logger.info(`Filtered out ${beforeFilter - transformedGames.length} finished games for league ${leagueId}`);
      
      // Apply development limit (Protocol I-IV)
      transformedGames = applySingleLeagueLimit(transformedGames);
      
      const parsed = z.array(GameSchema).parse(transformedGames);
      
      logger.info(`Returning ${parsed.length} games for league ${leagueId}`);
      return successResponse(parsed, 200, { source: response.source });
    } catch (error) {
      logger.error(`Error fetching games for league ${leagueId}`, error);
      
      return ApiErrors.serviceUnavailable(
        'Unable to fetch league data at this time. Please try again later.'
      );
    }
  });
}
