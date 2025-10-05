import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { GameWithRelations, OddsMap } from '@/lib/apiTypes';
import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';
import { transformGame } from '@/lib/transformers/game';


export const revalidate = 15;

export async function GET() {
  return withErrorHandling(async () => {
    const games = await prisma.game.findMany({
      where: {
        status: 'live',
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        odds: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

  const transformedGames = games.map(transformGame);
  const parsed = z.array(GameSchema).parse(transformedGames);
  return successResponse(parsed);
  });
}
