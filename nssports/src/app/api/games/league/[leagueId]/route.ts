import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { GameWithRelations, OddsMap } from '@/lib/apiTypes';
import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse } from '@/lib/apiResponse';
import { transformGame } from '@/lib/transformers/game';


export const revalidate = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ leagueId: string }> }
) {
  return withErrorHandling(async () => {
    const { leagueId } = await context.params;

    const games = await prisma.game.findMany({
      where: {
        leagueId: leagueId.toLowerCase(),
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
