export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
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
        games.map((g: any) => [g.id, JSON.parse(JSON.stringify(g))])
      );
    }

    // Helper: compute human-friendly selection label to match BetCard
    const computeSelectionLabel = (
      betType: string | undefined,
      selection: string | undefined,
      line: number | string | null | undefined,
      game: any | undefined
    ): string => {
      const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");
      const isTotal = betType === 'total' || selection === 'over' || selection === 'under';
      const isSide = selection === 'home' || selection === 'away';
      const numLine = typeof line === 'number' ? line : typeof line === 'string' ? Number(line) : undefined;
      if (isTotal) {
        const l = typeof numLine === 'number' ? Math.abs(numLine) : undefined;
        return `${(selection || '').toUpperCase()} ${l ?? ''}`.trim();
      }
      if (betType === 'moneyline' || (isSide && (numLine === undefined || numLine === null))) {
        const team = selection === 'home' ? game?.homeTeam?.shortName : game?.awayTeam?.shortName;
        return `${team ?? cap(selection)} WIN`;
      }
      if (isSide) {
        const team = selection === 'home' ? game?.homeTeam?.shortName : game?.awayTeam?.shortName;
        const sign = typeof numLine === 'number' && numLine > 0 ? '+' : '';
        return `${team ?? cap(selection)} ${typeof numLine === 'number' ? `${sign}${numLine}` : ''}`.trim();
      }
      return `${cap(selection)} ${typeof numLine === 'number' ? numLine : ''}`.trim();
    };

    const normalized = bets.map((bet: any) => {
      if (bet.betType !== "parlay") return bet as any;
      const legsRaw = toLegArray(bet.legs);
      // Sanitize legs to avoid downstream validation issues
      const legs = Array.isArray(legsRaw)
        ? legsRaw
            .filter((leg) => {
              // Keep only legs with minimally required fields
              const hasSelection = typeof leg?.selection === 'string' && leg.selection.length > 0;
              const hasOdds = typeof leg?.odds === 'number' && !Number.isNaN(leg.odds);
              return hasSelection && hasOdds;
            })
      .map((leg) => {
              const gameData = leg?.gameId ? legGamesById[leg.gameId] : undefined;
              return {
                ...leg,
                line:
                  typeof leg.line === 'number'
                    ? leg.line
                    : typeof leg.line === 'string'
                    ? Number(leg.line)
                    : undefined,
                game: gameData ? JSON.parse(JSON.stringify(gameData)) : undefined,
        betType: leg.betType, // Ensure betType is preserved
        displaySelection: computeSelectionLabel(leg.betType, leg.selection, leg.line ?? undefined, gameData as any),
              };
            })
        : null;
  return { ...bet, legs } as any;
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

    // Transform game data to match BetCard expectations
    const transformGameForBetCard = (game: any) => {
      if (!game) return undefined;
      const fallbackShort = (name?: string) => {
        if (!name || typeof name !== 'string') return undefined;
        const parts = name.trim().split(/\s+/);
        return parts[parts.length - 1];
      };
      return {
        id: game.id,
        homeTeam: {
          id: game.homeTeam?.id,
          name: game.homeTeam?.name,
          shortName: game.homeTeam?.shortName ?? fallbackShort(game.homeTeam?.name),
          logo: game.homeTeam?.logo,
        },
        awayTeam: {
          id: game.awayTeam?.id,
          name: game.awayTeam?.name,
          shortName: game.awayTeam?.shortName ?? fallbackShort(game.awayTeam?.name),
          logo: game.awayTeam?.logo,
        },
        league: {
          id: game.league?.id,
          name: game.league?.name,
          logo: game.league?.logo,
        },
      };
    };
    
    const serialized = normalized.map((b: any) => {
      const gameForCard = transformGameForBetCard(b.game);
      return {
        ...(b as Record<string, unknown>),
        stake: toNum((b as Record<string, unknown>).stake),
        potentialPayout: toNum((b as Record<string, unknown>).potentialPayout),
        // Transform game data for BetCard compatibility
        game: gameForCard,
        // Provide a server-side label for singles too
        displaySelection: b.betType !== 'parlay'
          ? computeSelectionLabel(b.betType, b.selection, (b as any).line, gameForCard)
          : undefined,
        // Transform parlay legs game data
        legs: Array.isArray(b.legs)
          ? b.legs.map((leg: any) => ({
              ...leg,
              game: transformGameForBetCard(leg.game),
            }))
          : b.legs,
      };
    });
    
    logger.info('Bet history fetched successfully', { count: serialized.length });
    
    // Validate response shape; on failure, try to recover gracefully
    try {
      const safe = BetsResponseSchema.parse(serialized);
      return successResponse(JSON.parse(JSON.stringify(safe)));
    } catch (e) {
      logger.warn('Bet history validation failed, returning best-effort data', {
        error: (e as any)?.message,
      });
      // Fallback: strip to minimal public fields to avoid runtime errors
      const fallback = normalized.map((b: any) => ({
        id: b.id,
        betType: b.betType,
        selection: b.selection,
        odds: typeof b.odds === 'number' ? b.odds : Number(b.odds) || 0,
        line: typeof b.line === 'number' ? b.line : b.line ?? null,
        stake: toNum(b.stake),
        potentialPayout: toNum(b.potentialPayout),
        status: b.status,
        placedAt: b.placedAt,
        settledAt: b.settledAt ?? null,
        game: b.game ?? undefined,
        legs: Array.isArray(b.legs)
          ? b.legs
              .filter((leg: any) => typeof leg?.selection === 'string' && typeof leg?.odds === 'number')
              .map((leg: any) => ({
                selection: leg.selection,
                odds: leg.odds,
                line: typeof leg.line === 'number' ? leg.line : undefined,
                game: leg.game ?? undefined,
              }))
          : null,
      }));
      return successResponse(JSON.parse(JSON.stringify(fallback)));
    }
  });
}

export async function POST(req: Request) {
  return withErrorHandling(async () => {
  const body = await req.json();
    logger.info('Placing bet', { betType: body?.betType });

    const userId = await getAuthUser();
    logger.info('Got user ID from auth', { userId });

    // Check if user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true }
    });
    
    if (!userExists) {
      logger.error('User not found in database', { userId });
      throw new Error(`User ${userId} not found in database`);
    }
    
    logger.info('User exists in database', { user: userExists });

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
