import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ApiErrors, withErrorHandling } from "@/lib/apiResponse";

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
    
    // Fetch all bets (for demo, fetch all; in production, filter by user)
  type GameWithTeams = Prisma.GameGetPayload<{ include: { homeTeam: true; awayTeam: true; league: true } }>;
  type BetWithGame = Prisma.BetGetPayload<{ include: { game: { include: { homeTeam: true; awayTeam: true; league: true } } } }>;

  const bets: BetWithGame[] = await prisma.bet.findMany({
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

    let legGamesById: Record<string, GameWithTeams> = {};
    if (allLegGameIds.size > 0) {
      const games = await prisma.game.findMany({
        where: { id: { in: Array.from(allLegGameIds) } },
        include: {
          homeTeam: true,
          awayTeam: true,
          league: true,
        },
      });
      legGamesById = Object.fromEntries(games.map((g) => [g.id, g]));
    }

    const normalized = bets.map((bet) => {
      if (bet.betType !== "parlay") return bet;
      const legsRaw = toLegArray(bet.legs);
      const legs = Array.isArray(legsRaw)
        ? legsRaw.map((leg) => ({
            ...leg,
            game: leg?.gameId
              ? legGamesById[leg.gameId] ?? undefined
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
    
    function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function fmtLine(line?: number | null) {
      if (line === null || typeof line !== 'number') return '';
      const sign = line > 0 ? '+' : '';
      return ` ${sign}${line}`;
    }
    type SingleDisplayInput = {
      betType: string;
      selection: string;
      line: number | null;
      game?: {
        homeTeam?: { shortName?: string; name?: string };
        awayTeam?: { shortName?: string; name?: string };
      };
    };

    function computeDisplaySelection(b: SingleDisplayInput): string | undefined {
      const bt = String(b?.betType || '').toLowerCase();
      const sel = String(b?.selection || '').toLowerCase();
      if (bt === 'moneyline' && b?.game) {
        const team = sel === 'home' ? (b.game.homeTeam?.shortName || b.game.homeTeam?.name) : sel === 'away' ? (b.game.awayTeam?.shortName || b.game.awayTeam?.name) : cap(sel);
        return `${team} Win`;
      }
      if (bt === 'spread') {
        const side = sel === 'home' ? 'Home' : sel === 'away' ? 'Away' : cap(sel);
        return `${side}${fmtLine(b?.line ?? null)}`;
      }
      if (bt === 'total') {
        return `${cap(sel)}${fmtLine(b?.line ?? null)}`;
      }
      return undefined;
    }

    type SerializedSingleBet = Omit<BetWithGame, 'stake' | 'potentialPayout'> & {
      stake: number;
      potentialPayout: number;
      displaySelection?: string;
    };

    type SerializedParlayBet = Omit<BetWithGame, 'stake' | 'potentialPayout' | 'legs'> & {
      stake: number;
      potentialPayout: number;
      legs: (ParlayLeg & { game?: GameWithTeams; displaySelection?: string })[] | null;
    };

    const serialized: Array<SerializedSingleBet | SerializedParlayBet> = normalized.map((b) => {
      const baseStake = toNum((b as unknown as { stake: unknown }).stake);
      const basePayout = toNum((b as unknown as { potentialPayout: unknown }).potentialPayout);

      if (b.betType !== 'parlay') {
        const single: SerializedSingleBet = {
          ...(b as BetWithGame),
          stake: baseStake,
          potentialPayout: basePayout,
          displaySelection: computeDisplaySelection({
            betType: b.betType,
            selection: b.selection,
            line: (b as BetWithGame).line ?? null,
            game: (b as BetWithGame).game as SingleDisplayInput['game'],
          }),
        };
        return single;
      }

      const parlay: SerializedParlayBet = {
        ...(b as BetWithGame),
        stake: baseStake,
        potentialPayout: basePayout,
        legs: Array.isArray((b as unknown as { legs?: unknown }).legs)
          ? ((b as unknown as { legs: (ParlayLeg & { game?: GameWithTeams })[] }).legs).map((leg) => ({
              ...leg,
              displaySelection: (() => {
                const bt = String(leg?.betType || '').toLowerCase();
                const sel = String(leg?.selection || '').toLowerCase();
                if (bt === 'moneyline' && leg?.game) {
                  const team = sel === 'home' ? (leg.game.homeTeam?.shortName || leg.game.homeTeam?.name) : sel === 'away' ? (leg.game.awayTeam?.shortName || leg.game.awayTeam?.name) : cap(sel);
                  return `${team} Win`;
                }
                if (bt === 'spread') {
                  const side = sel === 'home' ? 'Home' : sel === 'away' ? 'Away' : cap(sel);
                  return `${side}${fmtLine(leg?.line ?? null)}`;
                }
                if (bt === 'total') {
                  return `${cap(sel)}${fmtLine(leg?.line ?? null)}`;
                }
                return undefined;
              })(),
            }))
          : null,
      };
      return parlay;
    });
    
    logger.info('Bet history fetched successfully', { count: serialized.length });
    
    // Return data directly for backwards compatibility
    return NextResponse.json(JSON.parse(JSON.stringify(serialized)));
  });
}

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const body = await req.json();
    logger.info('Placing bet', { betType: body?.betType });

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
        return NextResponse.json(JSON.parse(JSON.stringify(existingBet)), { status: 200 });
      }
    }

    const legSchema = z.object({
      gameId: z.string().optional(),
      betType: z.string().optional(),
      selection: z.string(),
      odds: z.number(),
      line: z.number().nullable().optional(),
    });

    const baseSchema = z.object({
      betType: z.enum(["spread", "moneyline", "total", "parlay"]),
      stake: z.number().positive().max(1000000),
      potentialPayout: z.number().positive().max(100000000),
      status: z.enum(["pending", "won", "lost"]).optional(),
      userId: z.string().optional(),
      odds: z.number().optional(),
      line: z.number().nullable().optional(),
    });

    const singleSchema = baseSchema.extend({
      betType: z.enum(["spread", "moneyline", "total"]),
      gameId: z.string(),
      selection: z.enum(["home", "away", "over", "under"]),
      odds: z.number(),
    });

    const parlaySchema = baseSchema.extend({
      betType: z.literal("parlay"),
      legs: z.array(legSchema).min(2),
      odds: z.number().optional(),
    });

    const isParlay = body?.betType === "parlay";
    
    let data;
    try {
      data = isParlay ? parlaySchema.parse(body) : singleSchema.parse(body);
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
            userId: data.userId ?? null,
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
          userId: data.userId ?? null,
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

    return NextResponse.json(JSON.parse(JSON.stringify(result)), { status: 201 });
  });
}
