import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { GameWithRelations, OddsMap } from '@/lib/apiTypes';
import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse } from '@/lib/apiResponse';
import { transformGame } from '@/lib/transformers/game';


export const revalidate = 60;

export async function GET() {
  return withErrorHandling(async () => {
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
  const parsed = z.array(GameSchema).parse(transformedGames);
  return successResponse(parsed);
  });
}
