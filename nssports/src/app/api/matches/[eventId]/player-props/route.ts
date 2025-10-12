import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';

export const revalidate = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withErrorHandling(async () => {
    const { eventId } = await params;

    if (!eventId) {
      return ApiErrors.badRequest('eventId parameter is required');
    }

    const playerProps = await prisma.playerProp.findMany({
      where: { gameId: eventId },
      include: {
        player: {
          include: {
            team: true,
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { player: { name: 'asc' } },
      ],
    });

    // Transform to frontend format
    const transformed = playerProps.map((prop) => ({
      id: prop.id,
      playerId: prop.playerId,
      playerName: prop.player.name,
      position: prop.player.position,
      team: prop.player.team.id.includes('nba-lakers') || 
            prop.player.team.id.includes('nba-warriors') ||
            prop.player.team.id.includes('nba-celtics') ||
            prop.player.team.id.includes('nba-nets') ||
            prop.player.team.id.includes('nba-bucks') ||
            prop.player.team.id.includes('nba-mavericks')
            ? 'home' : 'away',
      statType: prop.statType,
      line: prop.line,
      overOdds: prop.overOdds,
      underOdds: prop.underOdds,
      category: prop.category,
    }));

    return successResponse(transformed);
  });
}
