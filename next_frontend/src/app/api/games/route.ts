import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper function to transform Prisma game to frontend format
function transformGame(game: any) {
  const oddsMap = game.odds.reduce((acc: any, odd: any) => {
    if (!acc[odd.betType]) {
      acc[odd.betType] = {};
    }
    acc[odd.betType][odd.selection || odd.betType] = {
      odds: odd.odds,
      line: odd.line,
      lastUpdated: odd.lastUpdated,
    };
    return acc;
  }, {});

  return {
    id: game.id,
    leagueId: game.leagueId,
    homeTeam: {
      id: game.homeTeam.id,
      name: game.homeTeam.name,
      shortName: game.homeTeam.shortName,
      logo: game.homeTeam.logo,
      record: game.homeTeam.record,
    },
    awayTeam: {
      id: game.awayTeam.id,
      name: game.awayTeam.name,
      shortName: game.awayTeam.shortName,
      logo: game.awayTeam.logo,
      record: game.awayTeam.record,
    },
    startTime: game.startTime,
    status: game.status,
    venue: game.venue,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    period: game.period,
    timeRemaining: game.timeRemaining,
    odds: {
      spread: oddsMap.spread || {},
      moneyline: oddsMap.moneyline || {},
      total: oddsMap.total || {},
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leagueId = searchParams.get('leagueId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {};
    if (leagueId) {
      where.leagueId = leagueId;
    }
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.game.count({ where });

    // Get paginated games
    const games = await prisma.game.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
        odds: true,
      },
      orderBy: {
        startTime: 'asc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const transformedGames = games.map(transformGame);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: transformedGames,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}
