import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SportSchema } from '@/lib/schemas/sport';
import { getLeagues, SportsGameOddsApiError } from '@/lib/sportsgameodds-sdk';
import { logger } from '@/lib/logger';
import { unstable_cache } from 'next/cache';

export const revalidate = 300; // Cache for 5 minutes (leagues don't change often)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cached function to fetch leagues from SportsGameOdds SDK
 */
const getCachedLeagues = unstable_cache(
  async () => {
    logger.info('Fetching leagues from SportsGameOdds SDK');
    
    try {
      const leagues = await getLeagues({ active: true });
      logger.info(`Fetched ${leagues.length} leagues`);
      return leagues;
    } catch (error) {
      logger.error('Error fetching leagues', error);
      // Return empty array on error - we'll use fallback data
      return [];
    }
  },
  ['sportsgameodds-sdk-leagues'],
  {
    revalidate: 300,
    tags: ['leagues'],
  }
);

/**
 * Default leagues configuration (fallback if SDK returns no data)
 * These are the primary leagues we support
 */
const DEFAULT_LEAGUES = [
  {
    leagueID: 'NBA',
    name: 'NBA',
    sport: 'Basketball',
    active: true,
  },
  {
    leagueID: 'NFL',
    name: 'NFL',
    sport: 'AmericanFootball',
    active: true,
  },
  {
    leagueID: 'NHL',
    name: 'NHL',
    sport: 'IceHockey',
    active: true,
  },
];

export async function GET() {
  try {
    let apiLeagues = await getCachedLeagues();
    
    // If SDK returns no leagues, use defaults
    if (!apiLeagues || apiLeagues.length === 0) {
      logger.warn('No leagues from SDK, using default configuration');
      apiLeagues = DEFAULT_LEAGUES;
    }
    
    // Group leagues by sport
    const sportGroups: Record<string, any[]> = {};
    
    apiLeagues.forEach((league: any) => {
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
