import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withErrorHandling, successResponse, ApiErrors } from '@/lib/apiResponse';

export const revalidate = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return ApiErrors.badRequest('gameId query parameter is required');
    }

    const gameProps = await prisma.gameProp.findMany({
      where: { gameId },
      orderBy: [
        { propType: 'asc' },
        { description: 'asc' },
      ],
    });

    // Group by propType for easier display
    const grouped = gameProps.reduce((acc, prop) => {
      if (!acc[prop.propType]) {
        acc[prop.propType] = [];
      }
      acc[prop.propType].push({
        id: prop.id,
        propType: prop.propType,
        description: prop.description,
        selection: prop.selection,
        odds: prop.odds,
        line: prop.line,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return successResponse(grouped);
  });
}
