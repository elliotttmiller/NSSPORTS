import prisma from '@/lib/prisma';
import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { withErrorHandling, successResponse } from '@/lib/apiResponse';
import { transformGame } from '@/lib/transformers/game';
import { applySingleLeagueLimit } from '@/lib/devDataLimit';


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

    // Transform and apply development limit (Protocol I-IV)
    let transformedGames = games.map(transformGame);
    transformedGames = applySingleLeagueLimit(transformedGames);
    
    const parsed = z.array(GameSchema).parse(transformedGames);
    return successResponse(parsed);
  });
}
