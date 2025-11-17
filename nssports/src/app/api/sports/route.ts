/**
 * Sports & Leagues API Route
 * 
 * Returns sports and leagues from Prisma database (seeded data)
 * Games are fetched separately via /api/games or /api/matches
 * 
 * Protocol III: Use database for static/reference data (sports, leagues)
 * Protocol III: Use SDK+cache for dynamic data (games, odds)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SportSchema } from '@/lib/schemas/sport';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export const revalidate = 300; // Cache for 5 minutes (leagues don't change often)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    logger.info('Fetching sports and leagues from database');
    
    // Fetch sports with their leagues from Prisma
    const sports = await prisma.sport.findMany({
      include: {
        leagues: {
          select: {
            id: true,
            name: true,
            sportId: true,
            logo: true,
          },
        },
      },
    });
    
    // Transform to frontend format
    type PrismaSport = typeof sports[number];
    type PrismaLeague = PrismaSport['leagues'][number];
    
    const transformedSports = sports.map((sport: PrismaSport) => ({
      id: sport.id,
      name: sport.name,
      icon: sport.icon,
      leagues: sport.leagues.map((league: PrismaLeague) => ({
        ...league,
        games: [], // Games fetched separately via /api/games
      })),
    }));
    
    logger.info(`Returning ${transformedSports.length} sports with ${transformedSports.reduce((sum: number, s: typeof transformedSports[number]) => sum + s.leagues.length, 0)} leagues`);
    
    const parsed = z.array(SportSchema).parse(transformedSports);
    return NextResponse.json(parsed);
  } catch (error) {
    logger.error('Error fetching sports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sports' },
      { status: 500 }
    );
  }
}
