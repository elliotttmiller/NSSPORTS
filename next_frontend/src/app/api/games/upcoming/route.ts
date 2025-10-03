import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { GameWithRelations, OddsMap } from '@/lib/apiTypes';

// Helper function to transform game data
function transformGame(game: GameWithRelations) {
  const oddsMap: OddsMap = game.odds.reduce((acc: OddsMap, odd) => {
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

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      where: {
        status: 'upcoming',
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        odds: true,
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 20,
    });

    const transformedGames = games.map(transformGame);

    return NextResponse.json(transformedGames);
  } catch (error) {
    console.error('Error fetching upcoming games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming games' },
      { status: 500 }
    );
  }
}
