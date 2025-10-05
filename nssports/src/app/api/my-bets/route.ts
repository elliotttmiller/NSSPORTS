import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ApiErrors, withErrorHandling, successResponse } from "@/lib/apiResponse";
import { BetsResponseSchema, BetRequestSchema, ParlayBetRequestSchema, SingleBetRequestSchema, SingleBetResponseSchema, ParlayBetResponseSchema } from "@/lib/schemas/bets";
import { getAuthUser } from "@/lib/authHelpers";

// Minimal leg shape stored in Bet.legs JSON
type ParlayLeg = {
  gameId?: string;
  betType?: string;
  selection?: string;
  odds?: number;
  line?: number | null;
};

function toLegArray(input: unknown): ParlayLeg[] | null {
  try {
    const value =
      typeof input === "string" ? (JSON.parse(input) as unknown) : input;
    if (!Array.isArray(value)) return null;
    return value
      .map((item) => (typeof item === "object" && item !== null ? item : null))
      .filter((x): x is Record<string, unknown> => x !== null)
      .map((obj) => ({
        gameId: typeof obj.gameId === "string" ? obj.gameId : undefined,
        betType: typeof obj.betType === "string" ? obj.betType : undefined,
        selection:
          typeof obj.selection === "string" ? obj.selection : undefined,
        odds:
          typeof obj.odds === "number"
            ? obj.odds
            : typeof obj.odds === "string"
            ? Number(obj.odds)
            : undefined,
        line:
          typeof obj.line === "number"
            ? obj.line
            : typeof obj.line === "string"
            ? Number(obj.line)
            : null,
      }));
  } catch {
    return null;
  }
}

export async function GET() {
  return withErrorHandling(async () => {
    logger.info('Fetching bet history');
    
    const userId = await getAuthUser();
    
    // Fetch bets for the authenticated user
    const bets = await prisma.bet.findMany({
      where: { userId },
      orderBy: { placedAt: "desc" },
      include: {
        game: {
          include: {
            homeTeam: true,
            awayTeam: true,
            league: true,
          },
        },
      },
    });
    
    logger.debug('Bets fetched', { count: bets.length });
    
    // Normalize legs for parlay bets and enrich leg.game when possible
    const allLegGameIds: Set<string> = new Set();
    for (const bet of bets) {
      if (bet.betType === "parlay" && bet.legs) {
        const legs = toLegArray(bet.legs);
        if (Array.isArray(legs)) {
          for (const leg of legs) {
            if (leg?.gameId) allLegGameIds.add(leg.gameId);
          }
        }
      }
    }

    let legGamesById: Record<string, unknown> = {};
    if (allLegGameIds.size > 0) {
      const games = await prisma.game.findMany({
        where: { id: { in: Array.from(allLegGameIds) } },
        include: {
          homeTeam: true,
          awayTeam: true,
          league: true,
        },
      });
      legGamesById = Object.fromEntries(
        games.map((g) => [g.id, JSON.parse(JSON.stringify(g))])
      );
    }

    const normalized = bets.map((bet) => {
      if (bet.betType !== "parlay") return bet;
      const legsRaw = toLegArray(bet.legs);
      const legs = Array.isArray(legsRaw)
        ? legsRaw.map((leg) => ({
            ...leg,
            game: leg?.gameId
              ? (legGamesById[leg.gameId] as unknown) ?? undefined
              : undefined,
          }))
        : null;
      return { ...bet, legs };
    });

    // Convert Decimal fields to numbers for client consumption
    const toNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      // Prisma Decimal
      if (v && typeof v === "object" && "toNumber" in (v as Record<string, unknown>)) {
        try { return (v as unknown as { toNumber: () => number }).toNumber(); } catch { /* noop */ }
      }
      if (typeof v === "string") {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
      return 0;
    };
    
    const serialized = normalized.map((b) => ({
      ...(b as Record<string, unknown>),
      stake: toNum((b as Record<string, unknown>).stake),
      potentialPayout: toNum((b as Record<string, unknown>).potentialPayout),
    }));
    
  logger.info('Bet history fetched successfully', { count: serialized.length });
    
  // Validate response shape and return
  const safe = BetsResponseSchema.parse(serialized);
  return successResponse(JSON.parse(JSON.stringify(safe)));
  });
}

export async function POST(req: Request) {
  return withErrorHandling(async () => {
  const body = await req.json();
    logger.info('Placing bet', { betType: body?.betType });

    const userId = await getAuthUser();

    // Idempotency key support for preventing duplicate bet placements
    const idempotencyKey = req.headers.get("Idempotency-Key") || undefined;
    
    if (idempotencyKey) {
      // Check if bet with this idempotency key already exists
      const existingBet = await prisma.bet.findUnique({
        where: { idempotencyKey },
        include: {
          game: {
            include: {
              homeTeam: true,
              awayTeam: true,
              league: true,
            },
          },
        },
      });
      
      if (existingBet) {
        logger.info('Bet already exists with idempotency key', { idempotencyKey });
        // Validate shape based on bet type before returning
        try {
          if (existingBet.betType === 'parlay') {
            ParlayBetResponseSchema.parse(existingBet as any);
          } else {
            SingleBetResponseSchema.parse(existingBet as any);
          }
        } catch (_) {
          // If validation fails, still return the raw existing bet for idempotency contract
        }
        return successResponse(JSON.parse(JSON.stringify(existingBet)), 200);
      }
    }

    const isParlay = body?.betType === "parlay";
    let data: z.infer<typeof BetRequestSchema>;
    try {
      data = isParlay ? ParlayBetRequestSchema.parse(body) : SingleBetRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error', { errors: error.errors });
        return ApiErrors.unprocessable('Invalid bet data', error.errors);
      }
      throw error;
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // For parlay bets
      if (data.betType === "parlay") {
        logger.info('Creating parlay bet', { legs: data.legs.length });
        
        const parlayBet = await tx.bet.create({
          data: {
            betType: "parlay",
            stake: data.stake,
            potentialPayout: data.potentialPayout,
            status: data.status || "pending",
            placedAt: new Date(),
            userId,
            selection: "parlay",
            odds: data.odds ?? 0,
            line: null,
            gameId: null,
            legs: data.legs ?? null,
            idempotencyKey,
          },
        });
        
        logger.info('Parlay bet created', { betId: parlayBet.id });
        return parlayBet;
      }
      
      // For single bets
      if (!data.gameId || !data.selection || !data.odds) {
        throw new Error("Missing required single bet fields");
      }
      
      // Verify game exists
      const game = await tx.game.findUnique({
        where: { id: data.gameId },
        select: { id: true, status: true },
      });
      
      if (!game) {
        throw new Error(`Game not found: ${data.gameId}`);
      }
      
      if (game.status === "finished") {
        throw new Error("Cannot place bet on finished game");
      }
      
      logger.info('Creating single bet', { gameId: data.gameId, betType: data.betType });
      
      const bet = await tx.bet.create({
        data: {
          gameId: data.gameId,
          betType: data.betType,
          selection: data.selection,
          odds: data.odds,
          line: data.line ?? null,
          stake: data.stake,
          potentialPayout: data.potentialPayout ?? 0,
          status: data.status || "pending",
          placedAt: new Date(),
          userId,
          idempotencyKey,
        },
        include: {
          game: {
            include: {
              homeTeam: true,
              awayTeam: true,
              league: true,
            },
          },
        },
      });
      
      logger.info('Single bet created', { betId: bet.id });
      return bet;
    });

    // Validate response before sending
    try {
      if ((result as any).betType === 'parlay') {
        ParlayBetResponseSchema.parse(result as any);
      } else {
        SingleBetResponseSchema.parse(result as any);
      }
    } catch (e) {
      logger.warn('Response validation failed for bet create', { error: (e as any)?.message });
    }

    return successResponse(JSON.parse(JSON.stringify(result)), 201);
  });
}
