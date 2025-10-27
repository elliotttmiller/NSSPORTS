import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SportSchema } from '@/lib/schemas/sport';
import { getLeagues, SportsGameOddsApiError } from '@/lib/sportsgameodds-api';
import { logger } from '@/lib/logger';
import { unstable_cache } from 'next/cache';

export const revalidate = 300; // Cache for 5 minutes (leagues don't change often)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cached function to fetch leagues from SportsGameOdds API
 */
const getCachedLeagues = unstable_cache(
  async () => {
    logger.info('Fetching leagues from SportsGameOdds API');
    
    try {
      const leagues = await getLeagues({ active: true });
      logger.info(`Fetched ${leagues.length} leagues`);
      return leagues;
    } catch (error) {
      logger.error('Error fetching leagues', error);
      throw error;
    }
  },
  ['sportsgameodds-leagues'],
  {
    revalidate: 300,
    tags: ['leagues'],
  }
);

export async function GET() {
  try {
    const apiLeagues = await getCachedLeagues();
    
    // Group leagues by sport
    const sportGroups: Record<string, any[]> = {};
    
    apiLeagues.forEach(league => {
      const sport = league.sport.toLowerCase();
      if (!sportGroups[sport]) {
        sportGroups[sport] = [];
      }
      
      // Map to internal league format
      sportGroups[sport].push({
        id: league.leagueID.toLowerCase(),
        name: league.name,
        sportId: sport,
        logo: `/logos/${league.leagueID.toLowerCase()}.svg`,
        games: [], // Games will be fetched separately
      });
    });
    
    // Transform to frontend sport format
    const transformedSports = Object.entries(sportGroups).map(([sportKey, leagues]) => ({
      id: sportKey,
      name: sportKey === 'basketball' ? 'Basketball' :
            sportKey === 'americanfootball' ? 'American Football' :
            sportKey === 'icehockey' ? 'Ice Hockey' :
            sportKey.charAt(0).toUpperCase() + sportKey.slice(1),
      icon: sportKey === 'basketball' ? '🏀' :
            sportKey === 'americanfootball' ? '🏈' :
            sportKey === 'icehockey' ? '🏒' : '⚽',
      leagues,
    }));

    const parsed = z.array(SportSchema).parse(transformedSports);
    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof SportsGameOddsApiError) {
      logger.error('SportsGameOdds API error in sports', error);
      return NextResponse.json(
        { error: 'Unable to fetch sports data' },
        { status: 503 }
      );
    }
    
    logger.error('Error fetching sports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sports' },
      { status: 500 }
    );
  }
}
