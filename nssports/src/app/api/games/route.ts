import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { GameWithRelations, OddsMap } from '@/lib/apiTypes';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { GameSchema } from '@/lib/schemas/game';
import { paginatedResponseSchema } from '@/lib/schemas/pagination';
import { withErrorHandling, ApiErrors, successResponse } from '@/lib/apiResponse';

import { transformGame } from '@/lib/transformers/game';

export const revalidate = 30;

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const searchParams = request.nextUrl.searchParams;
    const QuerySchema = z.object({
      leagueId: z.string().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(10),
      status: z.enum(["upcoming", "live", "finished"]).optional(),
    });
    let leagueId: string | undefined;
    let page: number = 1;
    let limit: number = 10;
    let status: 'upcoming' | 'live' | 'finished' | undefined;
    try {
      ({ leagueId, page, limit, status } = QuerySchema.parse({
        leagueId: searchParams.get('leagueId') ?? undefined,
        page: searchParams.get('page') ?? undefined,
        limit: searchParams.get('limit') ?? undefined,
        status: searchParams.get('status') ?? undefined,
      }));
    } catch (e) {
      if (e instanceof z.ZodError) {
        return ApiErrors.unprocessable('Invalid query parameters', e.errors);
      }
      throw e;
    }

    // Build where clause
    const where: Prisma.GameWhereInput = {};
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

    const payload = {
      data: transformedGames,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    // Validate with Zod before returning
    const Schema = paginatedResponseSchema(GameSchema);
    const parsed = Schema.parse(payload);
    return successResponse(parsed, 200, undefined);
  });
}
