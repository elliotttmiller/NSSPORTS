import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { SportSchema } from '@/lib/schemas/sport';

export async function GET() {
  try {
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

    // Transform to match frontend type
    const transformedSports = sports.map((sport) => ({
      id: sport.id,
      name: sport.name,
      icon: sport.icon,
      leagues: sport.leagues.map((league) => ({
        id: league.id,
        name: league.name,
        sportId: league.sportId,
        logo: league.logo,
        games: [], // Games will be fetched separately
      })),
    }));

  const parsed = z.array(SportSchema).parse(transformedSports);
  return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error fetching sports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sports' },
      { status: 500 }
    );
  }
}
