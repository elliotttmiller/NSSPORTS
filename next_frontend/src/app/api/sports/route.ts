import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const sports = await prisma.sport.findMany({
      include: {
        leagues: {
          select: {
            id: true,
            name: true,
            sportId: true,
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
        games: [], // Games will be fetched separately
      })),
    }));

    return NextResponse.json(transformedSports);
  } catch (error) {
    console.error('Error fetching sports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sports' },
      { status: 500 }
    );
  }
}
